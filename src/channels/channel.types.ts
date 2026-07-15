// Contract every channel (WhatsApp, web chat, and anything added later) must
// implement. The conversation engine only ever talks to channels through
// this interface, so adding a channel never requires touching the engine.
export interface ChannelAdapter {
  readonly channel: string;
  sendMessage(externalId: string, body: string): Promise<void>;
}

// Normalized shape every channel adapter converts its own webhook/socket
// payload into before handing off to the conversation engine.
export interface IncomingMessage {
  channel: string;
  externalId: string;
  text: string;
  externalMessageId?: string;
}

export const CHANNEL_ADAPTER = Symbol('CHANNEL_ADAPTER');
