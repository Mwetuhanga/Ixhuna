import { buildSimulatedWebhookPayload } from '../src/channels/whatsapp/simulator/whatsapp-simulator.util';
import { extractWhatsAppMessages } from '../src/channels/whatsapp/whatsapp.util';

describe('buildSimulatedWebhookPayload', () => {
  it('builds a text message the real WhatsApp parser reads', () => {
    const payload = buildSimulatedWebhookPayload('264812345678', 'Maria', { type: 'text', text: ' Hello ' });

    expect(extractWhatsAppMessages(payload)).toEqual([
      { from: '264812345678', text: 'Hello', externalMessageId: expect.stringMatching(/^wamid\.SIM\./) },
    ]);
  });

  it('builds a voice note the same way WhatsApp sends one', () => {
    const payload = buildSimulatedWebhookPayload('264812345678', 'Maria', { type: 'audio' });
    const message = (payload.entry?.[0].changes?.[0].value?.messages ?? [])[0];

    expect(message).toMatchObject({ from: '264812345678', type: 'audio' });
    // Not a text message, so today's parser skips it.
    expect(extractWhatsAppMessages(payload)).toEqual([]);
  });
});
