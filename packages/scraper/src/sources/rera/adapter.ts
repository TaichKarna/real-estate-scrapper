import type { ScrapedLead, ScrapedProject, ScraperRunParams, SourceAdapter } from "../../types";
import { parseMaharashtraPromoters, type StateReraPromoter } from "./states/maharashtra";
import { parseKarnatakaPromoters } from "./states/karnataka";
import { parseTelanganaPromoters } from "./states/telangana";
import { parseGujaratPromoters } from "./states/gujarat";
import { parseUPPromoters } from "./states/up";

export class ReraAdapter implements SourceAdapter {
  readonly source = "rera" as const;

  async *run(params: ScraperRunParams): AsyncIterable<{ lead: ScrapedLead; projects: ScrapedProject[] }> {
    const state = params.state || "Maharashtra";
    const district = params.district || params.city || "Pune";
    const maxResults = params.maxResults || 30;

    console.log(`🏛️ Running Multi-State RERA Scraper for State: ${state}, District: ${district}`);

    let promoters: StateReraPromoter[] = [];
    const normalizedState = state.toLowerCase().trim();

    if (normalizedState.includes("mah")) {
      promoters = parseMaharashtraPromoters(district);
    } else if (normalizedState.includes("kar") || normalizedState.includes("bang")) {
      promoters = parseKarnatakaPromoters(district);
    } else if (normalizedState.includes("tel") || normalizedState.includes("hyd")) {
      promoters = parseTelanganaPromoters(district);
    } else if (normalizedState.includes("guj")) {
      promoters = parseGujaratPromoters(district);
    } else if (normalizedState.includes("up") || normalizedState.includes("uttar") || normalizedState.includes("noida")) {
      promoters = parseUPPromoters(district);
    } else {
      // Default fallback
      promoters = parseMaharashtraPromoters(district);
    }

    let count = 0;
    for (const promoter of promoters) {
      if (count >= maxResults) break;
      count++;

      if (params.onProgress) {
        await params.onProgress({
          current: count,
          total: Math.min(maxResults, promoters.length),
          message: `RERA Promoter (${promoter.state}): ${promoter.name}`,
        });
      }

      const scrapedLead: ScrapedLead = {
        source: "rera",
        externalId: `rera-${promoter.reraNumber}`,
        sourceUrl: `https://${promoter.state.toLowerCase()}rera.gov.in/SearchList/Search?reraNo=${promoter.reraNumber}`,
        name: promoter.name,
        contactPerson: promoter.contactPerson,
        phones: promoter.phones || [],
        emails: promoter.emails || [],
        address: promoter.address,
        city: promoter.city,
        state: promoter.state,
        pincode: promoter.pincode,
        reraNumbers: [promoter.reraNumber],
        projectCount: promoter.projects.length,
      };

      yield { lead: scrapedLead, projects: promoter.projects };
    }
  }
}
