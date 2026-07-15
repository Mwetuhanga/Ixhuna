export const NOTIFICATIONS_QUEUE = 'notifications';

export interface NewComplaintJob {
  type: 'new-complaint';
  ticket: number;
  category: string;
  description: string;
  contact: string;
  channel: string;
}

export interface HandoverRequestedJob {
  type: 'handover-requested';
  conversationId: string;
  channel: string;
  reason: string;
}

export type NotificationJob = NewComplaintJob | HandoverRequestedJob;
