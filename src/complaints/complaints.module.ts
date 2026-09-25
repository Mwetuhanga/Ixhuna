import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ComplaintIntakeService } from './complaint-intake.service';
import { ComplaintsService } from './complaints.service';
import { ComplaintsController } from './complaints.controller';

@Module({
  imports: [NotificationsModule, RealtimeModule],
  providers: [ComplaintIntakeService, ComplaintsService],
  controllers: [ComplaintsController],
  exports: [ComplaintIntakeService],
})
export class ComplaintsModule {}
