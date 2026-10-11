import { normalizePhones } from "../../normalize/phone";
import type { ScrapedLead } from "../../types";
import { classifyLeadType } from "./classify";

export type RawJustdialListing = {
  docid?: string;
  id?: string;
  company?: string;
  name?: string;
  bname?: string;
  phone?: string;
  mobile?: string;
  phones?: string[];
  contact_person?: string;
  address?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  rating?: number | string;
  reviews?: number | string;
  review_count?: number | string;
  category?: string;
  categories?: string[];
  website?: string;
  url?: string;
  weburl?: string;
  [key: string]: unknown;
};

const NOISE_PATTERNS = [
  "justdial",
  "top picks",
  "in mumbai",
  "in delhi",
  "in bangalore",
  "in hyderabad",
  "in pune",
  "quick links",
  "jd verticals",
  "follow us",
  "copyright",
  "privacy policy",
  "terms of use",
  "disclaimer",
  "responses in less than",
  "get quick responses",
  "property developers in",
  "builders in",
  "developers in",
  "filter",
  "explore",
  "trending",
  "do property",
  "how long",
  "what is the",
  "how to find",
  "why should",
  "what do",
  "difference between",
  "what should",
  "rate this",
  "show more",
  "popular categories",
  "recently searched",
];

export function extractDocidFromUrl(url: string): string | null {
  if (!url) return null;
  // Match docid before _BZDET: e.g. 020PXX20-XX20-130722115708-D5S4_BZDET
  const match = url.match(/([0-9A-Za-z.-]+)_BZDET/);
  if (match?.[1]) {
    return match[1].replace(/[-_.]+/g, "").toUpperCase();
  }
  return null;
}

export function cleanWebsiteUrl(rawWebsite?: string | null): string | undefined {
  if (!rawWebsite) return undefined;
  const first = rawWebsite.split(",")[0]?.trim();
  if (!first) return undefined;
  const clean = first.replace(/^https?:\/\//i, "").replace(/\/+$/, "").trim();
  if (!clean || clean.length < 4 || !clean.includes(".")) return undefined;
  return `https://${clean}`;
}

export function cleanBusinessName(rawName?: string | null): string {
  if (!rawName) return "";
  const cleaned = rawName
    .replace(/^R\d+\s+/i, "")
    .replace(/^\d+[\.\)]\s*/, "")
    .replace(/^N\s+/i, "")
    .replace(/\d+\.?\d*\s*\d*\s*Ratings.*$/i, "")
    .replace(/\bHigh call pick up\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (/^\+\s*\d+/i.test(cleaned) || /\b\d+\s*more\b/i.test(cleaned)) {
    return "";
  }
  return cleaned;
}

export function parseJustdialNextDataRow(
  columns: string[],
  row: any[],
  defaultCity = "",
  searchCategory = "",
): ScrapedLead | null {
  if (!Array.isArray(columns) || !Array.isArray(row)) return null;

  const item: Record<string, any> = {};
  columns.forEach((col, idx) => {
    item[col] = row[idx];
  });

  const name = cleanBusinessName(String(item.name || ""));
  if (!name || name.length < 2) return null;
  const lowerName = name.toLowerCase();
  if (NOISE_PATTERNS.some((pattern) => lowerName.includes(pattern))) {
    return null;
  }

  const rawDocid = String(item.docid || "").trim();
  const cleanDocid = rawDocid
    ? rawDocid.replace(/[-_.]+/g, "").toUpperCase()
    : name.toLowerCase().replace(/[^a-z0-9]/g, "");

  const city = String(item.city || defaultCity || "").trim();
  const weburl = item.weburl ? String(item.weburl).replace(/^\/+/, "") : "";
  const sourceUrl = weburl ? `https://www.justdial.com/${weburl}` : undefined;

  const rawPhones: string[] = [];
  if (item.VNumber) rawPhones.push(String(item.VNumber));
  if (item.wpnumber && Array.isArray(item.wpnumber)) rawPhones.push(...item.wpnumber.map(String));
  const phones = normalizePhones(rawPhones);

  const address = String(item.NewAddress || item.area || "").trim();
  const locality = String(item.area || "").trim();
  const pincode = item.pincode ? String(item.pincode).trim() : undefined;
  const state = item.event_data?.state ? String(item.event_data.state).trim() : undefined;

  const ratingVal = parseFloat(String(item.compRating || item.rating || 0));
  const rating = !isNaN(ratingVal) && ratingVal > 0 ? ratingVal : undefined;

  const reviewVal = parseInt(String(item.totJdReviews || item.totalReviews || 0), 10);
  const reviewCount = !isNaN(reviewVal) && reviewVal > 0 ? reviewVal : undefined;

  const categories: string[] = [];
  if (typeof item.type === "string") {
    categories.push(...item.type.split(",").map((s) => s.trim()));
  }
  if (searchCategory) {
    categories.push(searchCategory);
  }

  const cleanCategories = Array.from(new Set(categories.filter(Boolean)));
  const leadType = classifyLeadType({
    category: searchCategory,
    subcategories: cleanCategories,
    name,
    typeField: typeof item.type === "string" ? item.type : undefined,
  });

  return {
    source: "justdial",
    externalId: `jd-${cleanDocid}`,
    sourceUrl,
    name,
    type: leadType,
    phones,
    emails: [],
    address: address || undefined,
    locality: locality || undefined,
    city: city || undefined,
    state: state || undefined,
    pincode: pincode || undefined,
    rating,
    reviewCount,
    categories: cleanCategories,
    raw: item,
  };
}

export function enrichLeadWithJustdialDetail(
  lead: ScrapedLead,
  detailResults: any,
): ScrapedLead {
  if (!detailResults || typeof detailResults !== "object") return lead;

  const website = cleanWebsiteUrl(detailResults.website || detailResults.weburl);
  const email = String(detailResults.email || "").trim().toLowerCase();
  const emails = lead.emails ? [...lead.emails] : [];
  if (email && email.includes("@") && !emails.includes(email)) {
    emails.push(email);
  }

  const rawPhones = [...lead.phones];
  if (detailResults.VNumber) rawPhones.push(String(detailResults.VNumber));
  if (detailResults.vnumber) rawPhones.push(String(detailResults.vnumber));
  if (detailResults.mobile) rawPhones.push(String(detailResults.mobile));
  if (detailResults.phone) rawPhones.push(String(detailResults.phone));
  if (detailResults.contact) rawPhones.push(String(detailResults.contact));
  if (detailResults.tollfree) rawPhones.push(String(detailResults.tollfree));
  if (detailResults.whatsapp_no) rawPhones.push(String(detailResults.whatsapp_no));

  if (detailResults.msg_num) {
    try {
      const parsedMsg =
        typeof detailResults.msg_num === "string" ? JSON.parse(detailResults.msg_num) : detailResults.msg_num;
      if (Array.isArray(parsedMsg?.wup)) {
        for (const num of parsedMsg.wup) {
          if (num && String(num).length >= 10) rawPhones.push(String(num));
        }
      }
    } catch {}
  }

  if (detailResults.bd_params?.misc) {
    const misc = String(detailResults.bd_params.misc).trim();
    if (/^[6-9]\d{9}$/.test(misc) || /^0\d{10}$/.test(misc)) {
      rawPhones.push(misc);
    }
  }

  if (Array.isArray(detailResults.wpnumber)) {
    for (const num of detailResults.wpnumber) {
      if (num && String(num) !== "xxxxxxx") rawPhones.push(String(num));
    }
  }

  const phones = normalizePhones(rawPhones);

  const contactPerson = detailResults.contactperson
    ? String(detailResults.contactperson).trim()
    : lead.contactPerson;

  const fullAddress = detailResults.address ? String(detailResults.address).trim() : lead.address;
  const pincode = detailResults.pincode ? String(detailResults.pincode).trim() : lead.pincode;

  const rawDetailUrl =
    detailResults.bi_lang_urls?.en ||
    (detailResults.weburl ? `https://www.justdial.com/${detailResults.weburl.replace(/^\/+/, "")}` : undefined) ||
    lead.sourceUrl;
  const detailUrl = rawDetailUrl ? rawDetailUrl.replace(/^https?:\/*/, "https://") : undefined;

  let cleanName = lead.name;
  const detailName = detailResults.name || detailResults.cname || detailResults.company || detailResults.nameln;
  if (detailName && String(detailName).trim().length >= 2) {
    const candidate = cleanBusinessName(String(detailName));
    if (candidate && candidate.length >= 2) {
      cleanName = candidate;
    }
  }

  if (!cleanName || /^\+\s*\d+/i.test(cleanName) || /\b\d+\s*more\b/i.test(cleanName)) {
    const urlToUse = detailUrl || lead.sourceUrl;
    if (urlToUse) {
      const match = urlToUse.match(/justdial\.com\/[^\/]+\/([^\/]+)\/[0-9A-Za-z.-]+_BZDET/);
      if (match?.[1]) {
        cleanName = match[1].replace(/-/g, " ").replace(/\b(near|opp|opposite|behind|road|sector)\b.*$/i, "").trim();
      }
    }
  }

  return {
    ...lead,
    name: cleanName,
    contactPerson: contactPerson || undefined,
    website: website || lead.website,
    emails,
    phones,
    address: fullAddress || lead.address,
    pincode: pincode || lead.pincode,
    sourceUrl: detailUrl,
    raw: {
      ...(typeof lead.raw === "object" && lead.raw !== null ? lead.raw : {}),
      detail: detailResults,
    },
  };
}

export function parseJustdialListing(
  item: RawJustdialListing,
  defaultCity = "",
  searchCategory = "",
): ScrapedLead | null {
  const url = item.url ? String(item.url) : "";
  let name = cleanBusinessName(item.company || item.name || item.bname || "");

  if (!name || /^\+\s*\d+/i.test(name) || /\b\d+\s*more\b/i.test(name)) {
    if (url) {
      const match = url.match(/justdial\.com\/[^\/]+\/([^\/]+)\/[0-9A-Za-z.-]+_BZDET/);
      if (match?.[1]) {
        name = match[1].replace(/-/g, " ").replace(/\b(near|opp|opposite|behind|road|sector)\b.*$/i, "").trim();
      }
    }
  }

  if (!name || name.length < 3 || /^\+\s*\d+/i.test(name) || /\b\d+\s*more\b/i.test(name)) {
    return null;
  }

  const lowerName = name.toLowerCase();
  if (NOISE_PATTERNS.some((pattern) => lowerName.includes(pattern))) {
    return null;
  }

  const docidFromUrl = extractDocidFromUrl(url);
  const rawId = item.docid || item.id || docidFromUrl;
  const externalId = rawId
    ? String(rawId).replace(/[-_.]+/g, "").toUpperCase()
    : name.toLowerCase().replace(/[^a-z0-9]/g, "");

  const rawPhones: string[] = [];
  if (Array.isArray(item.phones)) rawPhones.push(...item.phones.map(String));
  if (item.VNumber) rawPhones.push(String(item.VNumber));
  if (item.vnumber) rawPhones.push(String(item.vnumber));
  if (item.phone) rawPhones.push(String(item.phone));
  if (item.mobile) rawPhones.push(String(item.mobile));
  if (item.contact) rawPhones.push(String(item.contact));
  if (item.tollfree) rawPhones.push(String(item.tollfree));
  if (item.callbutton) rawPhones.push(String(item.callbutton));

  const phones = normalizePhones(rawPhones);
  const city = (item.city || defaultCity || "").trim();
  const address = (item.address || "").trim();
  const locality = String(item.area || item.locality || "").trim();

  const state = (item.state || "").trim();
  const pincode = (item.pincode || "").trim();

  const ratingVal = typeof item.rating === "number" ? item.rating : parseFloat(String(item.rating || 0));
  const rating = !isNaN(ratingVal) && ratingVal > 0 ? ratingVal : undefined;

  const reviewVal = typeof item.reviews === "number" ? item.reviews : parseInt(String(item.reviews || item.review_count || 0), 10);
  const reviewCount = !isNaN(reviewVal) && reviewVal > 0 ? reviewVal : undefined;

  const categories: string[] = [];
  if (Array.isArray(item.categories)) categories.push(...item.categories);
  if (item.category) categories.push(String(item.category));
  if (searchCategory) categories.push(searchCategory);

  const cleanCategories = Array.from(new Set(categories.filter(Boolean)));
  const leadType = classifyLeadType({
    category: searchCategory,
    subcategories: cleanCategories,
    name,
  });

  const website = cleanWebsiteUrl(item.website);

  return {
    source: "justdial",
    externalId: `jd-${externalId}`,
    sourceUrl: url || (item.weburl ? `https://www.justdial.com/${item.weburl}` : undefined),
    name,
    type: leadType,
    contactPerson: item.contact_person ? String(item.contact_person) : undefined,
    phones,
    emails: [],
    website,
    address: address || undefined,
    locality: locality || undefined,
    city: city || undefined,
    state: state || undefined,
    pincode: pincode || undefined,
    rating,
    reviewCount,
    categories: cleanCategories,
    raw: item,
  };
}
