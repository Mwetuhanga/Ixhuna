import { Injectable, Logger } from '@nestjs/common';
import { Complaint } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AgentsRealtimeGateway } from '../realtime/agents-realtime.gateway';

export interface ComplaintSubmission {
  channel: string;
  customerId: string;
  /** Chat channels pass the conversation the complaint was collected in. */
  conversationId?: string | null;
  category: string;
  description: string;
  contact: string;
  language?: string | null;
  /** When set, the complainant is emailed a receipt with their ticket number. */
  receiptEmail?: string | null;
}

/**
 * The one place a complaint gets filed, whichever channel it came from
 * (WhatsApp and web chat via the conversation engine, the website form,
 * and later the phone line). Anything that should happen to every new
 * complaint — notifications, live dashboard updates, and later triage and
 * routing — belongs here rather than in a channel.
 */
@Injectable()
export class ComplaintIntakeService {
  private readonly logger = new Logger(ComplaintIntakeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly realtime: AgentsRealtimeGateway
  ) {}

  async submit(submission: ComplaintSubmission): Promise<Complaint> {
    const complaint = await this.prisma.complaint.create({
      data: {
        channel: submission.channel,
        customerId: submission.customerId,
        conversationId: submission.conversationId ?? null,
        category: submission.category,
        description: submission.description,
        contact: submission.contact,
        language: submission.language ?? null,
      },
    });

    this.realtime.broadcast('complaint.created', complaint);

    // The complaint is already saved; a notification failure (e.g. Redis
    // briefly down) must not turn into an error for the complainant.
    await this.enqueueSafely(() =>
      this.notifications.enqueue({
        type: 'new-complaint',
        ticket: complaint.ticket,
        category: complaint.category,
        description: complaint.description,
        contact: complaint.contact,
        channel: complaint.channel,
      })
    );
    if (submission.receiptEmail) {
      const to = submission.receiptEmail;
      await this.enqueueSafely(() =>
        this.notifications.enqueue({
          type: 'complaint-receipt',
          to,
          ticket: complaint.ticket,
          category: complaint.category,
        })
      );
    }

    return complaint;
  }

  private async enqueueSafely(enqueue: () => Promise<void>): Promise<void> {
    try {
      await enqueue();
    } catch (err) {
      this.logger.error('Failed to enqueue complaint notification', err as Error);
    }
  }
}
