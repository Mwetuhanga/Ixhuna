import { Injectable, OnModuleInit } from '@nestjs/common';
import { ChannelAdapter } from '../channel.types';
import { ChannelRegistryService } from '../channel-registry.service';

@Injectable()
export class WhatsAppAdapter implements ChannelAdapter, OnModuleInit {
  readonly channel = 'whatsapp';

  constructor(private readonly registry: ChannelRegistryService) {}

  onModuleInit() {
    this.registry.register(this);
  }

  private get graphUrl(): string {
    const apiVersion = process.env.WHATSAPP_API_VERSION ?? 'v20.0';
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    return `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  }

  async sendMessage(externalId: string, body: string): Promise<void> {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!accessToken || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WhatsApp is not configured (missing WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID).');
    }

    const response = await fetch(this.graphUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: externalId,
        type: 'text',
        text: { body },
      }),
    });

    if (!response.ok) {
      throw new Error(`WhatsApp send failed (${response.status}): ${await response.text()}`);
    }
  }
}
