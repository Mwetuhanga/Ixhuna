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

// Sent to the complainant (not staff) so they have their ticket number. It
// deliberately doesn't echo the complaint text back, so the public form
// can't be used to send arbitrary content to someone else's inbox.
export interface ComplaintReceiptJob {
  type: 'complaint-receipt';
  to: string;
  ticket: number;
  category: string;
}

export type NotificationJob = NewComplaintJob | HandoverRequestedJob | ComplaintReceiptJob;
