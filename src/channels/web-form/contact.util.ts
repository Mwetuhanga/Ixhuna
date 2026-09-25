const PHONE_CHARS = /^\+?[\d\s().-]+$/;
// Shortest local number (without its leading 0) we accept before adding the
// country code; shorter input is a typo, not a phone number.
const MIN_LOCAL_DIGITS = 7;

/**
 * Normalizes a phone number typed into a form to international digits with
 * no "+" (e.g. "081 234 5678" -> "264812345678"), the same shape WhatsApp
 * uses for its externalIds. Numbers without a country code are assumed to
 * be local to `defaultCountryCode`. Returns null if it can't be a phone
 * number.
 */
export function normalizePhone(raw: string, defaultCountryCode = '264'): string | null {
  const trimmed = raw.trim();
  if (!PHONE_CHARS.test(trimmed)) return null;

  let digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) {
    // already international
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    if (digits.length - 1 < MIN_LOCAL_DIGITS) return null;
    digits = defaultCountryCode + digits.slice(1);
  } else if (!digits.startsWith(defaultCountryCode) && digits.length <= 9) {
    // local number typed without its leading 0, e.g. "81 234 5678"
    if (digits.length < MIN_LOCAL_DIGITS) return null;
    digits = defaultCountryCode + digits;
  }

  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

/** Human-readable contact line stored on the complaint for agents. */
export function formatContact(parts: { name?: string; phone?: string | null; email?: string }): string {
  return [parts.name, parts.phone ? `+${parts.phone}` : undefined, parts.email]
    .filter((part): part is string => Boolean(part))
    .join(' · ');
}
