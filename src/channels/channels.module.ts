import { Module } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { CustomersModule } from '../customers/customers.module';
import { ComplaintsModule } from '../complaints/complaints.module';
import { WhatsAppAdapter } from './whatsapp/whatsapp.adapter';
import { WhatsAppController } from './whatsapp/whatsapp.controller';
import { WebGateway } from './web/web.gateway';
import { WebFormController } from './web-form/web-form.controller';
import { WebFormService } from './web-form/web-form.service';
import { RateLimiterService } from './web-form/rate-limiter.service';

// Wires up every concrete channel adapter. Adding a new channel means: write
// an adapter implementing ChannelAdapter, add it to `providers` (and
// `controllers`/gateways as needed) here — nothing else in the app changes.
// Channels that only take in complaints and never reply (the website form)
// skip the adapter and conversation engine and call ComplaintIntakeService.
@Module({
  imports: [ConversationsModule, CustomersModule, ComplaintsModule],
  providers: [WhatsAppAdapter, WebGateway, WebFormService, RateLimiterService],
  controllers: [WhatsAppController, WebFormController],
})
export class ChannelsModule {}
