// Pure, channel-agnostic state machine for the guided complaint flow. It has
// no dependency on Nest, Prisma, or any channel — that's what makes it
// trivial to unit test and safe to reuse from any adapter.

export const FLOW_STAGES = {
  DESCRIPTION: 'DESCRIPTION',
  CATEGORY: 'CATEGORY',
  CONTACT: 'CONTACT',
  CONFIRM: 'CONFIRM',
} as const;

export type FlowStage = (typeof FLOW_STAGES)[keyof typeof FLOW_STAGES];

export interface ComplaintDraft {
  description?: string;
  category?: string;
  contact?: string;
}

export interface FlowState {
  stage: FlowStage;
  draft: ComplaintDraft;
}

export interface FlowResult {
  state: FlowState;
  reply: string | null;
  /** Set once the customer has confirmed — the caller should persist a Complaint. */
  completedDraft: Required<ComplaintDraft> | null;
}

const CATEGORY_PROMPT =
  'What category best fits your complaint? (billing, service quality, product defect, staff conduct, other)';

const CONTACT_PROMPT =
  "Should we contact you back on this channel, or do you have another contact (email/phone)? Reply 'this channel' or type the alternate contact.";

export function createFlowState(): FlowState {
  return { stage: FLOW_STAGES.DESCRIPTION, draft: {} };
}

export function greeting(): string {
  return 'Hi! I can help you file a complaint. Please describe your issue in as much detail as you can.';
}

export function advanceFlow(state: FlowState, text: string): FlowResult {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  if (lower === 'cancel') {
    return {
      state: createFlowState(),
      reply: 'Complaint cancelled. Send any message to start a new one.',
      completedDraft: null,
    };
  }

  switch (state.stage) {
    case FLOW_STAGES.DESCRIPTION: {
      const draft = { ...state.draft, description: trimmed };
      return {
        state: { stage: FLOW_STAGES.CATEGORY, draft },
        reply: CATEGORY_PROMPT,
        completedDraft: null,
      };
    }
    case FLOW_STAGES.CATEGORY: {
      const draft = { ...state.draft, category: trimmed };
      return {
        state: { stage: FLOW_STAGES.CONTACT, draft },
        reply: CONTACT_PROMPT,
        completedDraft: null,
      };
    }
    case FLOW_STAGES.CONTACT: {
      const draft = { ...state.draft, contact: trimmed };
      return {
        state: { stage: FLOW_STAGES.CONFIRM, draft },
        reply: `${buildSummary(draft)}\n\nReply YES to submit this complaint, or CANCEL to discard it.`,
        completedDraft: null,
      };
    }
    case FLOW_STAGES.CONFIRM: {
      if (lower === 'yes') {
        return {
          state: createFlowState(),
          reply: null,
          completedDraft: state.draft as Required<ComplaintDraft>,
        };
      }
      return {
        state,
        reply: 'Reply YES to submit, or CANCEL to discard this complaint.',
        completedDraft: null,
      };
    }
    default: {
      return advanceFlow(createFlowState(), text);
    }
  }
}

function buildSummary(draft: ComplaintDraft): string {
  return [
    'Here is what I have:',
    `- Description: ${draft.description}`,
    `- Category: ${draft.category}`,
    `- Contact: ${draft.contact}`,
  ].join('\n');
}
