import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { ChannelsSharedModule } from '../channels/channels-shared.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AiModule } from '../ai/ai.module';
import { ComplaintsModule } from '../complaints/complaints.module';
import { ConversationEngineService } from './conversation-engine.service';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';

@Module({
  imports: [
    CustomersModule,
    ChannelsSharedModule,
    NotificationsModule,
    RealtimeModule,
    AiModule,
    ComplaintsModule,
  ],
  providers: [ConversationEngineService, ConversationsService],
  controllers: [ConversationsController],
  exports: [ConversationEngineService],
})
export class ConversationsModule {}
