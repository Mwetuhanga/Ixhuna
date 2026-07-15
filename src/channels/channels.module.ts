import { Module } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { WhatsAppAdapter } from './whatsapp/whatsapp.adapter';
import { WhatsAppController } from './whatsapp/whatsapp.controller';
import { WebGateway } from './web/web.gateway';

// Wires up every concrete channel adapter. Adding a new channel means: write
// an adapter implementing ChannelAdapter, add it to `providers` (and
// `controllers`/gateways as needed) here — nothing else in the app changes.
@Module({
  imports: [ConversationsModule],
  providers: [WhatsAppAdapter, WebGateway],
  controllers: [WhatsAppController],
})
export class ChannelsModule {}
