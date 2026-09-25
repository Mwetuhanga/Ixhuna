import { randomUUID } from 'node:crypto';
import { WhatsAppWebhookPayload } from '../whatsapp.util';

/**
 * The simulator replaces real WhatsApp: while it's on, every outgoing
 * WhatsApp message goes to the simulator page instead of Meta. Anyone who
 * can open the page can chat as any phone number, so never turn it on for
 * a deployment real customers use.
 */
export function isWhatsAppSimulatorEnabled(): boolean {
  return process.env.WHATSAPP_SIMULATOR === 'true';
}

export type SimulatedMessage = { type: 'text'; text: string } | { type: 'audio' };

/**
 * Builds the webhook payload Meta's WhatsApp Cloud API would POST for one
 * incoming message, so simulated messages take the real parsing path.
 */
export function buildSimulatedWebhookPayload(
  from: string,
  profileName: string,
  message: SimulatedMessage
): WhatsAppWebhookPayload {
  const base = { from, id: `wamid.SIM.${randomUUID()}`, timestamp: String(Math.floor(Date.now() / 1000)) };
  const body =
    message.type === 'text'
      ? { ...base, type: 'text', text: { body: message.text } }
      : { ...base, type: 'audio', audio: { id: `SIM-${randomUUID()}`, mime_type: 'audio/ogg; codecs=opus' } };

  // Full Meta shape, including fields our parser doesn't read yet.
  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'SIMULATOR',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: 'SIMULATOR', phone_number_id: 'SIMULATOR' },
              contacts: [{ profile: { name: profileName }, wa_id: from }],
              messages: [body],
            },
          },
        ],
      },
    ],
  };
  return payload;
}
