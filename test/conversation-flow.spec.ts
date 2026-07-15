import { createFlowState, advanceFlow, FLOW_STAGES } from '../src/conversations/conversation-flow';

describe('conversation-flow', () => {
  it('walks through the full complaint flow and completes on confirmation', () => {
    let state = createFlowState();

    let result = advanceFlow(state, 'The delivery never arrived');
    expect(result.state.stage).toBe(FLOW_STAGES.CATEGORY);
    expect(result.completedDraft).toBeNull();

    result = advanceFlow(result.state, 'billing');
    expect(result.state.stage).toBe(FLOW_STAGES.CONTACT);

    result = advanceFlow(result.state, 'this channel');
    expect(result.state.stage).toBe(FLOW_STAGES.CONFIRM);
    expect(result.reply).toMatch(/Reply YES to submit/);

    result = advanceFlow(result.state, 'yes');
    expect(result.completedDraft).toEqual({
      description: 'The delivery never arrived',
      category: 'billing',
      contact: 'this channel',
    });
    expect(result.state.stage).toBe(FLOW_STAGES.DESCRIPTION);
  });

  it('resets on cancel from any stage', () => {
    let state = createFlowState();
    let result = advanceFlow(state, 'Something broke');
    result = advanceFlow(result.state, 'cancel');

    expect(result.state.stage).toBe(FLOW_STAGES.DESCRIPTION);
    expect(result.completedDraft).toBeNull();
  });

  it('re-prompts at the confirm stage until yes or cancel', () => {
    let state = createFlowState();
    let result = advanceFlow(state, 'Late refund');
    result = advanceFlow(result.state, 'billing');
    result = advanceFlow(result.state, 'this channel');

    result = advanceFlow(result.state, 'wait, actually...');
    expect(result.state.stage).toBe(FLOW_STAGES.CONFIRM);
    expect(result.completedDraft).toBeNull();
  });
});
