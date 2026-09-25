import { formatContact, normalizePhone } from '../src/channels/web-form/contact.util';

describe('normalizePhone', () => {
  it.each([
    ['081 234 5678', '264812345678'],
    ['0812345678', '264812345678'],
    ['81 234 5678', '264812345678'],
    ['+264 81 234 5678', '264812345678'],
    ['264812345678', '264812345678'],
    ['00264 81 234 5678', '264812345678'],
    ['(061) 123-456', '26461123456'],
    ['+27 82 123 4567', '27821234567'],
  ])('normalizes %s to %s', (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected);
  });

  it.each(['', 'call me', '081-abc-5678', '12345', '012345', '+1234567890123456'])('rejects %p', (raw) => {
    expect(normalizePhone(raw)).toBeNull();
  });

  it('uses the given default country code for local numbers', () => {
    expect(normalizePhone('082 123 4567', '27')).toBe('27821234567');
  });
});

describe('formatContact', () => {
  it('joins whatever was provided', () => {
    expect(formatContact({ name: 'Maria', phone: '264812345678', email: 'maria@example.com' })).toBe(
      'Maria · +264812345678 · maria@example.com'
    );
    expect(formatContact({ phone: null, email: 'maria@example.com' })).toBe('maria@example.com');
  });
});
