import { calculateNameSimilarity } from "./name";

export interface LeadForDedupe {
  id: string;
  name: string;
  city?: string | null;
  phones?: string[] | null;
  emails?: string[] | null;
  website?: string | null;
  reraNumbers?: string[] | null;
  score?: number | null;
}

export interface DuplicateMatch {
  leadA: LeadForDedupe;
  leadB: LeadForDedupe;
  confidence: number; // 0.0 - 1.0
  reason: "exact_phone" | "exact_rera" | "exact_website" | "fuzzy_name";
  autoMerge: boolean;
}

export function detectDuplicates(leads: LeadForDedupe[]): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];

  for (let i = 0; i < leads.length; i++) {
    for (let j = i + 1; j < leads.length; j++) {
      const a = leads[i]!;
      const b = leads[j]!;

      // 1. Phone match
      if (a.phones && b.phones) {
        const commonPhones = a.phones.filter((p) => b.phones?.includes(p));
        if (commonPhones.length > 0) {
          matches.push({
            leadA: a,
            leadB: b,
            confidence: 1.0,
            reason: "exact_phone",
            autoMerge: true,
          });
          continue;
        }
      }

      // 2. RERA match
      if (a.reraNumbers && b.reraNumbers) {
        const commonRera = a.reraNumbers.filter((r) => b.reraNumbers?.includes(r));
        if (commonRera.length > 0) {
          matches.push({
            leadA: a,
            leadB: b,
            confidence: 1.0,
            reason: "exact_rera",
            autoMerge: true,
          });
          continue;
        }
      }

      // 3. Website domain match
      if (a.website && b.website) {
        const domainA = cleanDomain(a.website);
        const domainB = cleanDomain(b.website);
        if (domainA && domainA === domainB) {
          matches.push({
            leadA: a,
            leadB: b,
            confidence: 0.95,
            reason: "exact_website",
            autoMerge: true,
          });
          continue;
        }
      }

      // 4. Same city + Fuzzy name similarity
      const cityA = a.city?.toLowerCase().trim();
      const cityB = b.city?.toLowerCase().trim();

      if (cityA && cityB && cityA === cityB) {
        const similarity = calculateNameSimilarity(a.name, b.name);
        if (similarity >= 0.75) {
          matches.push({
            leadA: a,
            leadB: b,
            confidence: Number(similarity.toFixed(2)),
            reason: "fuzzy_name",
            autoMerge: similarity >= 0.9,
          });
        }
      }
    }
  }

  return matches;
}

function cleanDomain(url: string): string {
  try {
    const formatted = url.startsWith("http") ? url : `https://${url}`;
    const parsed = new URL(formatted);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}
