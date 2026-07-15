import crypto from 'node:crypto';

export function verifyWhatsAppSignature(rawBody: Buffer | undefined, signatureHeader?: string): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return true; // signature check optional if secret not configured (local dev)
  if (!signatureHeader || !rawBody) return false;

  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

interface WhatsAppWebhookPayload {
  entry?: {
    changes?: {
      value?: {
        messages?: { from: string; type: string; id: string; text?: { body: string } }[];
      };
    }[];
  }[];
}

export interface ExtractedMessage {
  from: string;
  text: string;
  externalMessageId: string;
}

export function extractWhatsAppMessages(payload: WhatsAppWebhookPayload): ExtractedMessage[] {
  const messages: ExtractedMessage[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        if (message.type === 'text' && message.text) {
          messages.push({ from: message.from, text: message.text.body.trim(), externalMessageId: message.id });
        }
      }
    }
  }
  return messages;
}
