export const NOTIFICATIONS_QUEUE = 'notifications';

export interface NewComplaintJob {
  type: 'new-complaint';
  reference: string;
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

// Sent to the complainant (not staff) so they have their reference number. It
// deliberately doesn't echo the complaint text back, so the public form
// can't be used to send arbitrary content to someone else's inbox.
export interface ComplaintReceiptJob {
  type: 'complaint-receipt';
  to: string;
  reference: string;
  category: string;
}

export type NotificationJob = NewComplaintJob | HandoverRequestedJob | ComplaintReceiptJob;
