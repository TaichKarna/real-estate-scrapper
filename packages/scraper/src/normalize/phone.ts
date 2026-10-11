/**
 * Normalizes Indian phone numbers into standard E.164 format (+91XXXXXXXXXX).
 * Returns null if the number is invalid or cannot be parsed as an Indian phone number.
 */
export function normalizePhone(rawPhone: string): string | null {
  if (!rawPhone) return null;

  // Remove non-digit characters except leading +
  let cleaned = rawPhone.trim().replace(/[^\d+]/g, "");

  if (!cleaned) return null;

  // Strip leading zero
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }

  // Handle +91 prefix
  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith("91") && cleaned.length > 10) {
    cleaned = cleaned.slice(2);
  }

  // Validate 10-digit mobile or landline number (starting with 6, 7, 8, 9 for mobile, or 2, 3, 4 for landlines)
  if (/^[2-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  // Handle landline with city code (e.g. 02261234567 -> +912261234567)
  if (/^[1-9]\d{8,11}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  return null;
}

/**
 * Normalizes an array of raw phone strings and removes duplicates.
 */
export function normalizePhones(phones: string[]): string[] {
  const set = new Set<string>();
  for (const p of phones) {
    const norm = normalizePhone(p);
    if (norm) set.add(norm);
  }
  return Array.from(set);
}
