import { Controller, Get, Headers, HttpCode, Logger, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConversationEngineService } from '../../conversations/conversation-engine.service';
import { extractWhatsAppMessages, verifyWhatsAppSignature } from './whatsapp.util';

@Controller('webhook/whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(private readonly engine: ConversationEngineService) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response
  ) {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }

  @Post()
  @HttpCode(200)
  async receive(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-hub-signature-256') signature: string
  ) {
    if (!verifyWhatsAppSignature(req.rawBody, signature)) {
      return { ok: false };
    }

    const messages = extractWhatsAppMessages(req.body);
    for (const message of messages) {
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

    return { ok: true };
  }
}
