import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { ChannelsSharedModule } from '../channels/channels-shared.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AiModule } from '../ai/ai.module';
import { ConversationEngineService } from './conversation-engine.service';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { ComplaintsController } from './complaints.controller';

@Module({
  imports: [CustomersModule, ChannelsSharedModule, NotificationsModule, RealtimeModule, AiModule],
  providers: [ConversationEngineService, ConversationsService],
  controllers: [ConversationsController, ComplaintsController],
  exports: [ConversationEngineService],
})
export class ConversationsModule {}
