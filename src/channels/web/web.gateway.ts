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
import { ChannelAdapter } from '../channel.types';
import { ChannelRegistryService } from '../channel-registry.service';
import { ConversationEngineService } from '../../conversations/conversation-engine.service';

// Website chat widget channel. Each browser generates a random sessionId
// (kept in localStorage) and passes it as `auth.sessionId` on connect; that
// sessionId is this channel's externalId, exactly like a WhatsApp phone
// number is for the WhatsApp channel — same Customer/Conversation model,
// same conversation engine, no special-casing anywhere downstream.
@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: process.env.CORS_ORIGIN ?? '*' },
})
export class WebGateway implements ChannelAdapter, OnGatewayConnection, OnModuleInit {
  readonly channel = 'web';

  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(WebGateway.name);

  constructor(
    private readonly registry: ChannelRegistryService,
    private readonly engine: ConversationEngineService
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  handleConnection(client: Socket) {
    const sessionId = client.handshake.auth?.sessionId as string | undefined;
    if (!sessionId) {
      client.disconnect(true);
      return;
    }
    client.join(sessionId);
  }

  @SubscribeMessage('message')
  async onMessage(@ConnectedSocket() client: Socket, @MessageBody() data: { text: string }) {
    const sessionId = client.handshake.auth?.sessionId as string | undefined;
    if (!sessionId || !data?.text?.trim()) return;

    try {
      await this.engine.handleIncoming({ channel: this.channel, externalId: sessionId, text: data.text });
    } catch (err) {
      this.logger.error(`Failed to process web chat message from session ${sessionId}`, err as Error);
    }
  }

  async sendMessage(externalId: string, body: string): Promise<void> {
    this.server?.to(externalId).emit('message', { text: body, createdAt: new Date().toISOString() });
  }
}
