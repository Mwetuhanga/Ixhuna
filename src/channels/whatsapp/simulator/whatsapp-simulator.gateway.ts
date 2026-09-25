import { Logger, OnModuleInit } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../../prisma/prisma.service';
import { WhatsAppInboundService } from '../whatsapp-inbound.service';
import { buildSimulatedWebhookPayload, isWhatsAppSimulatorEnabled } from './whatsapp-simulator.util';

const PHONE = /^\d{8,15}$/;
const HISTORY_LIMIT = 100;

// Test stand-in for WhatsApp, used by the page at /whatsapp-simulator. Each
// browser tab picks a phone number and chats as that WhatsApp user; its
// messages go through the same webhook handling as real WhatsApp, and the
// bot's (and agents') replies are delivered back here instead of to Meta.
@WebSocketGateway({
  namespace: '/whatsapp-simulator',
  cors: { origin: process.env.CORS_ORIGIN ?? '*' },
})
export class WhatsAppSimulatorGateway implements OnGatewayConnection, OnModuleInit {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(WhatsAppSimulatorGateway.name);

  constructor(
    private readonly inbound: WhatsAppInboundService,
    private readonly prisma: PrismaService
  ) {}

  onModuleInit() {
    if (isWhatsAppSimulatorEnabled()) {
      this.logger.warn(
        'WhatsApp simulator is ON: outgoing WhatsApp messages go to /whatsapp-simulator, not to Meta. ' +
          'Never enable it where real customers use the bot.'
      );
    }
  }

  async handleConnection(client: Socket) {
    if (!isWhatsAppSimulatorEnabled()) {
      client.emit('simulator-disabled');
      client.disconnect(true);
      return;
    }
    const phone = client.handshake.auth?.phone as string | undefined;
    if (!phone || !PHONE.test(phone)) {
      client.emit('simulator-error', 'Phone number must be 8-15 digits, including the country code.');
      client.disconnect(true);
      return;
    }
    client.join(phone);
    client.emit('history', await this.history(phone));
  }

  @SubscribeMessage('message')
  async onMessage(@ConnectedSocket() client: Socket, @MessageBody() data: { text?: string; type?: string }) {
    const phone = client.handshake.auth?.phone as string;
    const name = (client.handshake.auth?.name as string | undefined) || 'Simulator user';

    if (data?.type === 'audio') {
      await this.inbound.handleWebhookPayload(buildSimulatedWebhookPayload(phone, name, { type: 'audio' }));
      return;
    }
    const text = data?.text?.trim();
    if (!text) return;
    await this.inbound.handleWebhookPayload(buildSimulatedWebhookPayload(phone, name, { type: 'text', text }));
  }

  /** Called by WhatsAppAdapter in place of the Cloud API while the simulator is on. */
  deliver(to: string, body: string) {
    this.server?.to(to).emit('message', { body, createdAt: new Date().toISOString() });
  }

  // Lets a reloaded tab show the conversation so far.
  private async history(phone: string) {
    const identity = await this.prisma.customerIdentity.findUnique({
      where: { channel_externalId: { channel: 'whatsapp', externalId: phone } },
    });
    if (!identity) return [];
    const conversation = await this.prisma.conversation.findFirst({
      where: { customerId: identity.customerId },
      orderBy: { createdAt: 'desc' },
    });
    if (!conversation) return [];
    const messages = await this.prisma.message.findMany({
      where: { conversationId: conversation.id, channel: 'whatsapp' },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    });
    return messages.reverse().map((m) => ({
      direction: m.direction,
      senderType: m.senderType,
      body: m.body,
      createdAt: m.createdAt,
    }));
  }
}
