import { Injectable, Logger } from '@nestjs/common';
import { ConversationEngineService } from '../../conversations/conversation-engine.service';
import { extractWhatsAppMessages, WhatsAppWebhookPayload } from './whatsapp.util';

// Turns a WhatsApp Cloud API webhook payload into engine calls. Shared by the
// real webhook and the test simulator, so the simulator exercises exactly
// the code real WhatsApp messages go through.
@Injectable()
export class WhatsAppInboundService {
  private readonly logger = new Logger(WhatsAppInboundService.name);

  constructor(private readonly engine: ConversationEngineService) {}

  async handleWebhookPayload(payload: WhatsAppWebhookPayload): Promise<void> {
    for (const message of extractWhatsAppMessages(payload)) {
      try {
        await this.engine.handleIncoming({
          channel: 'whatsapp',
          externalId: message.from,
          text: message.text,
          externalMessageId: message.externalMessageId,
        });
      } catch (err) {
        this.logger.error(`Failed to process WhatsApp message from ${message.from}`, err as Error);
      }
    }
  }
}
