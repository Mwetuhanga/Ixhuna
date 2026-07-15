import { Module } from '@nestjs/common';
import { EchoAiProvider } from './providers/echo.provider';
import { AnthropicAiProvider } from './providers/anthropic.provider';
import { AI_PROVIDER } from './ai.constants';

@Module({
  providers: [
    EchoAiProvider,
    AnthropicAiProvider,
    {
      provide: AI_PROVIDER,
      useFactory: (echo: EchoAiProvider, anthropic: AnthropicAiProvider) =>
        process.env.AI_PROVIDER === 'anthropic' ? anthropic : echo,
      inject: [EchoAiProvider, AnthropicAiProvider],
    },
  ],
  exports: [AI_PROVIDER],
})
export class AiModule {}
