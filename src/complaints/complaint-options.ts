// Fixed lists that channels offer complainants. Channels that present a
// choice (the website form now, WhatsApp buttons later) use these codes so
// complaints stay comparable in reporting whatever channel they came from.

export const COMPLAINT_CATEGORIES = [
  { code: 'billing', label: 'Billing' },
  { code: 'service_quality', label: 'Service quality' },
  { code: 'product_defect', label: 'Product defect' },
  { code: 'staff_conduct', label: 'Staff conduct' },
  { code: 'other', label: 'Other' },
] as const;

export type ComplaintCategoryCode = (typeof COMPLAINT_CATEGORIES)[number]['code'];

export const COMPLAINT_CATEGORY_CODES: string[] = COMPLAINT_CATEGORIES.map((c) => c.code);

// Languages a complainant can say they wrote in. Codes are ISO 639-1 where
// one exists, otherwise ISO 639-3.
export const COMPLAINT_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'af', label: 'Afrikaans' },
  { code: 'ng', label: 'Oshiwambo (Oshindonga)' },
  { code: 'kj', label: 'Oshiwambo (Oshikwanyama)' },
  { code: 'hz', label: 'Otjiherero' },
  { code: 'naq', label: 'Khoekhoegowab' },
  { code: 'kwn', label: 'RuKwangali' },
  { code: 'loz', label: 'Silozi' },
  { code: 'tn', label: 'Setswana' },
  { code: 'mhw', label: 'Thimbukushu' },
  { code: 'de', label: 'German' },
] as const;

export const COMPLAINT_LANGUAGE_CODES: string[] = COMPLAINT_LANGUAGES.map((l) => l.code);
