import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { NOTIFICATIONS_QUEUE, NotificationJob } from './notifications.types';

@Injectable()
export class NotificationsService {
  constructor(@InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue<NotificationJob>) {}

  async enqueue(job: NotificationJob): Promise<void> {
    await this.queue.add(job.type, job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }
}
