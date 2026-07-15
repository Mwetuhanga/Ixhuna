import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { ChannelsSharedModule } from './channels/channels-shared.module';
import { ConversationsModule } from './conversations/conversations.module';
import { ChannelsModule } from './channels/channels.module';
import { AgentsModule } from './agents/agents.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'public'),
    }),
    PrismaModule,
    ChannelsSharedModule,
    AuthModule,
    CustomersModule,
    ConversationsModule,
    ChannelsModule,
    AgentsModule,
    AiModule,
  ],
})
export class AppModule {}
