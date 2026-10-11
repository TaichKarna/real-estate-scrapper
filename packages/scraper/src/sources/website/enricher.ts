export interface EnrichedWebsiteData {
  emails: string[];
  phones: string[];
  whatsapp?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  contactPerson?: string;
  score: number;
}

/**
 * Calculates lead completeness score from 0 to 100.
 */
export function calculateLeadScore(lead: {
  phones?: string[] | null;
  emails?: string[] | null;
  reraNumbers?: string[] | null;
  projectCount?: number | null;
  rating?: number | null;
  website?: string | null;
}): number {
  let score = 0;
  const hasPhone = Boolean(lead.phones && lead.phones.length > 0);
  const hasWebsite = Boolean(lead.website && lead.website.trim().length > 3);

  if (hasPhone) score += 35;
  if (hasWebsite) score += 25;
  if (hasPhone && hasWebsite) score += 15; // High-value lead bonus

  if (lead.emails && lead.emails.length > 0) score += 10;
  if (lead.reraNumbers && lead.reraNumbers.length > 0) score += 5;
  if (lead.projectCount && lead.projectCount > 0) score += 5;
  if (lead.rating && lead.rating >= 4.0) score += 5;

  return Math.min(100, Math.max(0, score));
}

/**
 * Parses HTML text content to extract emails, WhatsApp, social links, and phones.
 */
export function extractContactDetailsFromHtml(html: string): EnrichedWebsiteData {
  const emails = new Set<string>();
  const phones = new Set<string>();
  let whatsapp: string | undefined;
  let linkedinUrl: string | undefined;
  let instagramUrl: string | undefined;
  let facebookUrl: string | undefined;

  // Regex patterns
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const matches = html.match(emailRegex) || [];

  const invalidDomains = ["example.com", "domain.com", "sentry.io", "wix.com", "schema.org", "w3.org", "png", "jpg", "jpeg", "webp"];
  for (const match of matches) {
    const lower = match.toLowerCase();
    const isInvalid = invalidDomains.some((d) => lower.includes(d));
    if (!isInvalid && match.length <= 60) {
      emails.add(lower);
    }
  }

  // WhatsApp regex
  const waMatch = html.match(/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)(\+?\d{10,13})/i);
  if (waMatch?.[1]) {
    whatsapp = waMatch[1].startsWith("+") ? waMatch[1] : `+${waMatch[1]}`;
  }

  // LinkedIn
  const liMatch = html.match(/https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9_-]+/i);
  if (liMatch?.[0]) linkedinUrl = liMatch[0];

  // Instagram
  const igMatch = html.match(/https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.-]+/i);
  if (igMatch?.[0]) instagramUrl = igMatch[0];

  // Facebook
  const fbMatch = html.match(/https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9_.-]+/i);
  if (fbMatch?.[0]) facebookUrl = fbMatch[0];

  // Indian Phone Regex (+91 or 10-digit starting 6-9)
  const phoneRegex = /(?:\+91[\s-]?)?[6-9]\d{9}\b/g;
  const phoneMatches = html.match(phoneRegex) || [];
  for (const pm of phoneMatches) {
    const cleaned = pm.replace(/\D/g, "");
    if (cleaned.length === 10) {
      phones.add(`+91${cleaned}`);
    } else if (cleaned.length === 12 && cleaned.startsWith("91")) {
      phones.add(`+${cleaned}`);
    }
  }

  const emailArr = Array.from(emails);
  const phoneArr = Array.from(phones);

  const score = calculateLeadScore({
    phones: phoneArr,
    emails: emailArr,
    website: "https://example.com",
  });

  return {
    emails: emailArr,
    phones: phoneArr,
    whatsapp,
    linkedinUrl,
    instagramUrl,
    facebookUrl,
    score,
  };
}

/**
 * Website Enricher class
 */
export class WebsiteEnricher {
  async enrichUrl(url: string): Promise<EnrichedWebsiteData> {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return { emails: [], phones: [], score: 10 };
      }

      const html = await response.text();
      return extractContactDetailsFromHtml(html);
    } catch {
      return { emails: [], phones: [], score: 10 };
    }
  }
}
