import { Controller, Get, Headers, HttpCode, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { verifyWhatsAppSignature } from './whatsapp.util';
import { WhatsAppInboundService } from './whatsapp-inbound.service';

@Controller('webhook/whatsapp')
export class WhatsAppController {
  constructor(private readonly inbound: WhatsAppInboundService) {}

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

    await this.inbound.handleWebhookPayload(req.body);
    return { ok: true };
  }
}
