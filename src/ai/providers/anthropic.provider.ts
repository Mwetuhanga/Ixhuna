import { Injectable, Logger } from '@nestjs/common';
import { AiMessage, AiProvider } from '../ai.types';
import { EchoAiProvider } from './echo.provider';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

@Injectable()
export class AnthropicAiProvider implements AiProvider {
  private readonly logger = new Logger(AnthropicAiProvider.name);
  private readonly fallback = new EchoAiProvider();

  async suggestReply(history: AiMessage[]): Promise<string> {
    return this.complete(
      'You are a customer support agent. Suggest a short, helpful reply (2-3 sentences) to the customer\'s latest message, given the conversation so far.',
      history
    );
  }

  async summarize(history: AiMessage[]): Promise<string> {
    return this.complete(
      'Summarize this customer support conversation in one or two sentences for a support ticket.',
      history
    );
  }

  private async complete(systemPrompt: string, history: AiMessage[]): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY not set; falling back to the echo provider.');
      return this.fallback.suggestReply(history);
    }

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5',
          max_tokens: 300,
          system: systemPrompt,
          messages: history.map((m) => ({
            role: m.role === 'customer' ? 'user' : 'assistant',
            content: m.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API responded ${response.status}: ${await response.text()}`);
      }

      const body = (await response.json()) as { content?: { type: string; text?: string }[] };
      const text = body.content?.find((block) => block.type === 'text')?.text;
      return text ?? (await this.fallback.suggestReply(history));
    } catch (err) {
      this.logger.error('Anthropic API call failed, falling back to echo provider', err as Error);
      return this.fallback.suggestReply(history);
    }
  }
}
