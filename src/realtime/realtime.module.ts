import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AgentsRealtimeGateway } from './agents-realtime.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    }),
  ],
  providers: [AgentsRealtimeGateway],
  exports: [AgentsRealtimeGateway],
})
export class RealtimeModule {}
