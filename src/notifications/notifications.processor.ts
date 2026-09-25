import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService } from './email.service';
import { NOTIFICATIONS_QUEUE, NotificationJob } from './notifications.types';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly email: EmailService) {
    super();
  }

  async process(job: Job<NotificationJob>): Promise<void> {
    const data = job.data;
    switch (data.type) {
      case 'new-complaint':
        await this.email.send(
          `New complaint ${data.reference} (${data.category})`,
          [
            `Reference: ${data.reference}`,
            `Channel: ${data.channel}`,
            `Category: ${data.category}`,
            `Contact: ${data.contact}`,
            '',
            data.description,
          ].join('\n')
        );
        return;
      case 'handover-requested':
        await this.email.send(
          `Customer needs a human agent (conversation ${data.conversationId})`,
          `Channel: ${data.channel}\nReason: ${data.reason}\nConversation: ${data.conversationId}`
        );
        return;
      case 'complaint-receipt':
        await this.email.send(
          `We received your complaint (reference ${data.reference})`,
          [
            'Thank you for letting us know about your complaint.',
            '',
            'We have received it and passed it on to the team responsible.',
            `Your reference number is ${data.reference}. Please keep it for any follow-up.`,
          ].join('\n'),
          data.to
        );
        return;
      default: {
        const exhaustiveCheck: never = data;
        this.logger.warn(`Unknown notification job type: ${JSON.stringify(exhaustiveCheck)}`);
      }
    }
  }
}
