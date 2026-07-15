import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

// Push channel for the agent dashboard: new messages, handover requests, and
// complaint creation get broadcast here so the dashboard updates live
// instead of polling. Auth is a JWT passed in the socket handshake, the same
// token issued by POST /auth/login.
@WebSocketGateway({
  namespace: '/agents',
  cors: { origin: process.env.CORS_ORIGIN ?? '*' },
})
export class AgentsRealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(AgentsRealtimeGateway.name);

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      await this.jwt.verifyAsync(token);
    } catch {
      this.logger.warn(`Rejected agent socket connection: invalid token`);
      client.disconnect(true);
    }
  }

  handleDisconnect() {
    // no per-connection state to clean up yet
  }

  broadcast(event: string, payload: unknown) {
    this.server?.emit(event, payload);
  }
}
