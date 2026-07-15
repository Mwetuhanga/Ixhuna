import { Injectable } from '@nestjs/common';
import { AiMessage, AiProvider } from '../ai.types';

// Zero-external-calls default: keeps the app fully runnable with no AI
// credentials configured. Swap AI_PROVIDER to bring in a real model.
@Injectable()
export class EchoAiProvider implements AiProvider {
  async suggestReply(history: AiMessage[]): Promise<string> {
    const last = [...history].reverse().find((m) => m.role === 'customer');
    if (!last) return "Thanks for reaching out — how can we help?";
    return `Thanks for the details. Regarding "${truncate(last.text)}" — we're looking into it now.`;
  }

  async summarize(history: AiMessage[]): Promise<string> {
    const customerLines = history.filter((m) => m.role === 'customer').map((m) => m.text);
    return customerLines.join(' / ') || '(no customer messages yet)';
  }
}

function truncate(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}
