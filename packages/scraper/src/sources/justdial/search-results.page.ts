import type { Page, Response } from "playwright";
import { randomDelay } from "../../core/browser";
import { resolveJustdialCategoryPath } from "../../config/timeouts";
import {
  enrichLeadWithJustdialDetail,
  parseJustdialListing,
  parseJustdialNextDataRow,
  type RawJustdialListing,
} from "./parse";
import type { ScrapedLead } from "../../types";

export class JustdialSearchResultsPage {
  private capturedItems: RawJustdialListing[] = [];
  private targetUrl = "";
  private currentCategory = "";
  private discoveredCategories: { name: string; url: string; count?: string }[] = [];

  constructor(readonly page: Page) {
    // Intercept network responses for Justdial API endpoints
    this.page.on("response", async (response: Response) => {
      try {
        const url = response.url();
        if (
          url.includes("/api/") ||
          (url.includes("justdial.com") && (url.includes("results") || url.includes("search") || url.includes("list")))
        ) {
          const contentType = response.headers()["content-type"] || "";
          if (contentType.includes("application/json")) {
            const json = await response.json().catch(() => null);
            if (json) {
              if (url.includes("resultsPageRhs") && Array.isArray(json.sliders)) {
                for (const slide of json.sliders) {
                  if (slide.url && slide.display_name1) {
                    this.discoveredCategories.push({
                      name: String(slide.display_name1).trim(),
                      url: String(slide.url).trim(),
                      count: slide.lcnt ? String(slide.lcnt).trim() : undefined,
                    });
                  }
                }
              }
              this.extractFromNetworkJson(json);
            }
          }
        }
      } catch {
        // Ignore unparseable responses
      }
    });
  }

  getDiscoveredCategories() {
    return this.discoveredCategories;
  }

  private extractFromNetworkJson(json: any) {
    if (!json) return;
    const items =
      json.results ||
      json.data ||
      json.listings ||
      json.result?.data ||
      json.resp?.results ||
      (Array.isArray(json) ? json : null);

    if (Array.isArray(items)) {
      for (const item of items) {
        if (typeof item === "object" && item !== null) {
          this.capturedItems.push(item);
        }
      }
    }
  }

  async navigate(city: string, category: string): Promise<void> {
    this.currentCategory = category;
    const capitalizedCity = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
    const categoryPath = resolveJustdialCategoryPath(category);

    // Step 1: Visit base city landing page to establish Akamai session cookies
    const cityUrl = `https://www.justdial.com/${capitalizedCity}`;
    console.log(`🌐 Step 1: Warming session on base city page: ${cityUrl}`);
    await this.page.goto(cityUrl, { waitUntil: "domcontentloaded", timeout: 35_000 }).catch((e) => {
      console.log(`[Base Nav Note]: ${e.message}`);
    });
    await randomDelay(2000, 3500);

    // Step 2: Navigate directly to the canonical category listing URL
    const listingUrl = `https://www.justdial.com/${capitalizedCity}/${categoryPath}`;
    console.log(`🎯 Step 2: Navigating to canonical listing URL: ${listingUrl}`);
    await this.page.goto(listingUrl, { waitUntil: "domcontentloaded", timeout: 35_000 }).catch((e) => {
      console.log(`[Listing Nav Note]: ${e.message}`);
    });
    await randomDelay(3000, 5000);

    // Check if the page loaded empty (body < 200 chars or 0 listing elements)
    const cardCount = await this.page.locator("a[href*='_BZDET'], h2.resultbox_title").count();
    if (cardCount === 0) {
      console.log("↻ 0 listings detected on initial load. Executing conditional reload...");
      await this.page.reload({ waitUntil: "domcontentloaded", timeout: 25_000 }).catch(() => {});
      await randomDelay(3000, 5000);
    }

    this.targetUrl = this.page.url();
    console.log(`🎯 Active Justdial Search URL: ${this.targetUrl}`);
  }

  async navigateCategoryUrl(urlOrPath: string, categoryName: string): Promise<void> {
    this.currentCategory = categoryName;
    const url = urlOrPath.startsWith("http")
      ? urlOrPath
      : `https://www.justdial.com${urlOrPath.startsWith("/") ? "" : "/"}${urlOrPath}`;

    console.log(`🎯 Navigating to category URL: ${url} (${categoryName})`);
    await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 35_000 }).catch((e) => {
      console.log(`[Category Nav Note]: ${e.message}`);
    });
    await randomDelay(3000, 5000);

    const cardCount = await this.page.locator("a[href*='_BZDET'], h2.resultbox_title").count();
    if (cardCount === 0) {
      await this.page.reload({ waitUntil: "domcontentloaded", timeout: 25_000 }).catch(() => {});
      await randomDelay(2500, 4500);
    }

    this.targetUrl = this.page.url();
  }

  /**
   * Extract listings from page Next.js data or DOM cards
   */
  private async extractPageListings(city: string): Promise<ScrapedLead[]> {
    const pageLeads: ScrapedLead[] = [];

    // Attempt 1: Extract from __NEXT_DATA__
    try {
      const nextDataJson = await this.page.evaluate(() => {
        const script = (globalThis as any).document?.querySelector?.("#__NEXT_DATA__");
        return script?.textContent || null;
      });

      if (nextDataJson) {
        const nextData = JSON.parse(nextDataJson);
        const listData = nextData?.props?.pageProps?.listData;
        const res = listData?.results;

        if (res && Array.isArray(res.columns) && Array.isArray(res.data) && res.data.length > 0) {
          for (const row of res.data) {
            const parsed = parseJustdialNextDataRow(res.columns, row, city, this.currentCategory);
            if (parsed) {
              pageLeads.push(parsed);
            }
          }
          if (pageLeads.length > 0) {
            console.log(`⚡ Extracted ${pageLeads.length} leads directly from page __NEXT_DATA__!`);
            return pageLeads;
          }
        }
      }
    } catch (e: any) {
      console.log(`[NextData note]: ${e.message}`);
    }

    // Attempt 2: Extract DOM cards (specifically targeting resultbox cards with _BZDET links)
    const domCards = await this.page.evaluate(() => {
      // In case esbuild or tsx injects __name helpers into stringified evaluation
      (globalThis as any).__name = (globalThis as any).__name || ((fn: any) => fn);

      const cards: RawJustdialListing[] = [];
      const doc = (globalThis as any).document;
      if (!doc) return cards;

      const cardNodes = Array.from(
        doc.querySelectorAll(".resultbox, .jdresult_box, div[class*='resultbox_info'], div[class*='resultbox']"),
      );

      const candidateElements: any[] =
        cardNodes.length > 0
          ? cardNodes
          : Array.from(
              doc.querySelectorAll("h2 a[href*='_BZDET'], a.resultbox_title_anchorbox[href*='_BZDET']"),
            )
              .map(
                (a: any) =>
                  a.closest(".jdresult_box, .resultbox, div[class*='result'], li, div[class*='card']") ||
                  a.parentElement?.parentElement,
              )
              .filter(Boolean);

      const seenUrls = new Set<string>();

      for (let i = 0; i < candidateElements.length; i++) {
        const cardEl = candidateElements[i];
        if (!cardEl) continue;

        // Target title anchor inside h2 or with title classes, explicitly avoiding slideshow carousel badges
        let titleAnchor: any =
          cardEl.querySelector("h2.resultbox_title a[href*='_BZDET']") ||
          cardEl.querySelector("h2 a[href*='_BZDET']") ||
          cardEl.querySelector("a.resultbox_title_anchorbox[href*='_BZDET']") ||
          cardEl.querySelector(".resultbox_title_anchor a[href*='_BZDET']");

        if (!titleAnchor) {
          const allLinks = cardEl.querySelectorAll("a[href*='_BZDET']");
          for (let j = 0; j < allLinks.length; j++) {
            const el = allLinks[j];
            const cls = (el.className || "").toLowerCase();
            const txt = (el.innerText || "").trim().toLowerCase();
            if (
              !cls.includes("slideshow") &&
              !cls.includes("thumb") &&
              !cls.includes("slider") &&
              !cls.includes("photo") &&
              !/^\+\s*\d+/.test(txt) &&
              !/\b\d+\s*more\b/.test(txt)
            ) {
              titleAnchor = el;
              break;
            }
          }
        }

        if (!titleAnchor) continue;
        const href = titleAnchor.getAttribute("href") || "";
        if (!href.includes("_BZDET")) continue;
        const cleanPath = href.split("?")[0];
        if (seenUrls.has(cleanPath)) continue;

        const titleSpan = titleAnchor.querySelector(".resultbox_title_anchor") || titleAnchor;
        let rawName = (titleSpan.textContent || titleAnchor.innerText || titleAnchor.getAttribute("title") || "").trim();
        rawName = rawName
          .replace(/^R\d+\s+/i, "")
          .replace(/^\d+[\.\)]\s*/, "")
          .replace(/^N\s+/i, "")
          .replace(/\s+/g, " ")
          .trim();

        // Reject counters, slideshow badges, or noise
        if (/^\+\s*\d+/i.test(rawName) || /\b\d+\s*more\b/i.test(rawName)) {
          const match =
            cleanPath.match(/justdial\.com\/[^\/]+\/([^\/]+)\/[0-9A-Za-z.-]+_BZDET/) ||
            href.match(/\/([^\/]+)\/[0-9A-Za-z.-]+_BZDET/);
          if (match?.[1]) {
            rawName = match[1].replace(/-/g, " ").replace(/\b(near|opp|opposite|behind|road|sector)\b.*$/i, "").trim();
          } else {
            continue;
          }
        }
        if (!rawName || rawName.length < 3 || rawName.toLowerCase().includes("filter")) continue;

        seenUrls.add(cleanPath);

        // Phone extraction:
        // 1. Direct tel link
        const telAnchor = cardEl.querySelector("a[href^='tel:']");
        let phoneStr = telAnchor?.getAttribute("href")?.replace(/^tel:/, "")?.trim() || "";

        // 2. Call button / call content / data attributes
        if (!phoneStr) {
          const callEl = cardEl.querySelector(
            ".callbutton, .callcontent, .callNowAnchor, [class*='callbutton'], [class*='callcontent']",
          );
          if (callEl) {
            const attrPhone =
              callEl.getAttribute("data-phone") ||
              callEl.getAttribute("data-tel") ||
              callEl.getAttribute("data-vnumber");
            if (attrPhone && /\d{8,}/.test(attrPhone)) {
              phoneStr = attrPhone;
            } else {
              const callText = callEl.innerText || "";
              const m = callText.match(/(?:\+91[\s-]?)?[6-9]\d{9}|0\d{10}/);
              if (m) phoneStr = m[0];
            }
          }
        }

        // 3. Scan card innerText with regex for Indian phone numbers
        if (!phoneStr) {
          const cardText = cardEl.innerText || "";
          const phoneMatches = cardText.match(/(?:\+91[\s-]?)?[6-9]\d{9}|0\d{10}/g);
          if (phoneMatches && phoneMatches.length > 0) {
            phoneStr = phoneMatches[0];
          }
        }

        const addressEl = cardEl.querySelector(
          ".address, .address-info, [class*='address'], [class*='loc'], [class*='location']",
        );
        const ratingEl = cardEl.querySelector(".rating, .rating-val, [class*='rating'], .green-box");

        const fullUrl = href.startsWith("http")
          ? href
          : `https://www.justdial.com${href.startsWith("/") ? "" : "/"}${href}`;

        cards.push({
          name: rawName,
          url: fullUrl,
          phone: phoneStr || undefined,
          address: addressEl?.innerText?.trim(),
          rating: ratingEl?.innerText?.trim(),
        });
      }

      return cards;
    });

    for (const card of domCards) {
      const parsed = parseJustdialListing(card, city, this.currentCategory);
      if (parsed) {
        pageLeads.push(parsed);
      }
    }

    return pageLeads;
  }

  /**
   * Enrich a lead with detailed information from its _BZDET page (website, email, full address)
   */
  async enrichLeadFromDetailPage(lead: ScrapedLead): Promise<{ lead: ScrapedLead; rateLimited?: boolean }> {
    if (!lead.sourceUrl || !lead.sourceUrl.includes("_BZDET")) {
      return { lead };
    }

    try {
      // In-browser fetch using active browser session and cookies
      const evalResult = await this.page.evaluate(async (url: string) => {
        (globalThis as any).__name = (globalThis as any).__name || ((fn: any) => fn);
        try {
          const res = await (globalThis as any).fetch(url);
          if (res.status === 403 || res.status === 429) {
            return { rateLimited: true, data: null };
          }
          if (!res.ok) return { rateLimited: false, data: null };
          const text = await res.text();
          const match = text.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
          if (match?.[1]) {
            const json = JSON.parse(match[1]);
            const results =
              json?.props?.pageProps?.results?.results ||
              json?.props?.pageProps?.results ||
              json?.props?.pageProps?.initialData ||
              null;
            return { rateLimited: false, data: results };
          }
          return { rateLimited: false, data: null };
        } catch {
          return { rateLimited: false, data: null };
        }
      }, lead.sourceUrl);

      if (evalResult?.rateLimited) {
        return { lead, rateLimited: true };
      }

      if (evalResult?.data) {
        return { lead: enrichLeadWithJustdialDetail(lead, evalResult.data) };
      }
    } catch (e: any) {
      console.log(`[Detail enrich note for ${lead.name}]: ${e.message}`);
    }

    return { lead };
  }

  /**
   * Stream leads page-by-page as they are discovered (Zero data loss)
   */
  async *streamPages(
    maxResults = 50,
    city = "",
    onProgress?: (info: { current: number; total: number; message: string }) => Promise<void> | void,
  ): AsyncIterable<ScrapedLead[]> {
    let currentPage = 1;
    const maxPages = Math.min(100, Math.max(50, Math.ceil(maxResults / 2)));
    let consecutiveNoNewLeadPages = 0;
    const seenExternalIds = new Set<string>();
    let totalCollected = 0;

    while (totalCollected < maxResults && currentPage <= maxPages) {
      if (currentPage > 1) {
        const cleanBase = (this.targetUrl.split("?")[0] || "").replace(/\/page-\d+$/, "");
        const queryParams = this.targetUrl.includes("?") ? `?${this.targetUrl.split("?")[1] || ""}` : "";
        const pageUrl = `${cleanBase}/page-${currentPage}${queryParams}`;

        console.log(`🌐 Navigating to Page ${currentPage}: ${pageUrl}`);
        await this.page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 25_000 }).catch((e) => {
          console.log(`[Nav Note Page ${currentPage}]: ${e.message}`);
        });
        await randomDelay(2500, 4000);

        const cardCount = await this.page.locator("a[href*='_BZDET'], h2.resultbox_title").count();
        if (cardCount === 0) {
          console.log(`↻ Page ${currentPage} loaded with 0 cards. Conditional reload...`);
          await this.page.reload({ waitUntil: "domcontentloaded", timeout: 20_000 }).catch(() => {});
          await randomDelay(2000, 3500);
        }
      }

      const currentLeads = await this.extractPageListings(city);
      const newLeadsInBatch: ScrapedLead[] = [];

      for (const lead of currentLeads) {
        if (!seenExternalIds.has(lead.externalId)) {
          seenExternalIds.add(lead.externalId);
          newLeadsInBatch.push(lead);
          totalCollected++;
          if (totalCollected >= maxResults) break;
        }
      }

      console.log(
        `📊 Page ${currentPage} complete: +${newLeadsInBatch.length} new leads (${totalCollected} / ${maxResults} total)`,
      );

      if (onProgress) {
        try {
          await onProgress({
            current: totalCollected,
            total: maxResults,
            message: `Discovered ${totalCollected}/${maxResults} leads (Page ${currentPage})`,
          });
        } catch {}
      }

      if (newLeadsInBatch.length > 0) {
        yield newLeadsInBatch;
      }

      if (totalCollected >= maxResults) break;

      if (newLeadsInBatch.length === 0) {
        consecutiveNoNewLeadPages++;
        if (consecutiveNoNewLeadPages >= 5) {
          console.log("ℹ️ No new listings collected across 5 consecutive pages, ending pagination.");
          break;
        }
      } else {
        consecutiveNoNewLeadPages = 0;
      }

      currentPage++;
    }
  }

  async scrollAndCollect(
    maxResults = 50,
    city = "",
    onProgress?: (info: { current: number; total: number; message: string }) => Promise<void> | void,
    enrichDetails = false,
    leadsMap = new Map<string, ScrapedLead>(),
  ): Promise<ScrapedLead[]> {
    let currentPage = 1;
    // Generous page budget so subcategories aren't cut off prematurely; 5 consecutive empty pages will handle termination
    const maxPages = Math.min(100, Math.max(50, Math.ceil(maxResults / 2)));
    let consecutiveNoNewLeadPages = 0;

    while (leadsMap.size < maxResults && currentPage <= maxPages) {
      const startCount = leadsMap.size;

      if (currentPage > 1) {
        const cleanBase = (this.targetUrl.split("?")[0] || "").replace(/\/page-\d+$/, "");
        const queryParams = this.targetUrl.includes("?") ? `?${this.targetUrl.split("?")[1] || ""}` : "";
        const pageUrl = `${cleanBase}/page-${currentPage}${queryParams}`;

        console.log(`🌐 Navigating to Page ${currentPage}: ${pageUrl}`);
        await this.page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 25_000 }).catch((e) => {
          console.log(`[Nav Note Page ${currentPage}]: ${e.message}`);
        });
        await randomDelay(2500, 4000);

        // Check if page loaded empty, conditional reload if needed
        const cardCount = await this.page.locator("a[href*='_BZDET'], h2.resultbox_title").count();
        if (cardCount === 0) {
          console.log(`↻ Page ${currentPage} loaded with 0 cards. Conditional reload...`);
          await this.page.reload({ waitUntil: "domcontentloaded", timeout: 20_000 }).catch(() => {});
          await randomDelay(2000, 3500);
        }
      }

      // Step 1: Extract leads from the current page
      const currentLeads = await this.extractPageListings(city);
      const newLeadsInBatch: ScrapedLead[] = [];

      for (const lead of currentLeads) {
        if (!leadsMap.has(lead.externalId)) {
          leadsMap.set(lead.externalId, lead);
          newLeadsInBatch.push(lead);
          if (leadsMap.size >= maxResults) break;
        }
      }

      const collectedThisPage = leadsMap.size - startCount;
      console.log(
        `📊 Page ${currentPage} complete: +${collectedThisPage} new leads (${leadsMap.size} / ${maxResults} total)`,
      );

      if (onProgress) {
        try {
          await onProgress({
            current: leadsMap.size,
            total: maxResults,
            message: `Collected ${leadsMap.size}/${maxResults} leads (Page ${currentPage})`,
          });
        } catch {
          // Progress update should never fail scraping
        }
      }

      if (leadsMap.size >= maxResults) break;

      if (collectedThisPage === 0) {
        consecutiveNoNewLeadPages++;
        if (consecutiveNoNewLeadPages >= 5) {
          console.log("ℹ️ No new listings collected across 5 consecutive pages, ending pagination.");
          break;
        }
      } else {
        consecutiveNoNewLeadPages = 0;
      }

      currentPage++;
    }

    const finalLeads = Array.from(leadsMap.values()).slice(0, maxResults);

    // Step 2: Detail enrichment if requested
    if (enrichDetails) {
      return this.enrichLeadsList(finalLeads, onProgress);
    }

    return finalLeads;
  }

  /**
   * Enrich a list of leads with details (website, email, canonical link)
   */
  async enrichLeadsList(
    leads: ScrapedLead[],
    onProgress?: (info: { current: number; total: number; message: string }) => Promise<void> | void,
  ): Promise<ScrapedLead[]> {
    console.log(`🌐 Enriching details (website, email, canonical link) for ${leads.length} leads...`);
    let consecutiveRateLimits = 0;

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i]!;

      // Skip if lead already has website
      if (lead.website && lead.website.length > 5) {
        continue;
      }

      if (onProgress && (i % 5 === 0 || i === leads.length - 1)) {
        try {
          await onProgress({
            current: i + 1,
            total: leads.length,
            message: `Enriching website & contact details (${i + 1}/${leads.length}): ${lead.name}`,
          });
        } catch {
          // Progress update should never fail scraping
        }
      }

      // Breathing pause every 20 leads to prevent triggering Akamai velocity alarms
      if (i > 0 && i % 20 === 0) {
        await randomDelay(3000, 5000);
      }

      const res = await this.enrichLeadFromDetailPage(lead);
      leads[i] = res.lead;

      if (res.rateLimited) {
        consecutiveRateLimits++;
        if (consecutiveRateLimits >= 3) {
          console.warn(`⚠️ Justdial rate limit detected (HTTP 403/429). Gracefully completing detail enrichment early to preserve all collected leads.`);
          break; // Stop detail enrichment and immediately proceed to saving all leads!
        }
        await randomDelay(2500, 4500);
      } else {
        consecutiveRateLimits = 0;
        await randomDelay(1200, 2200); // Polite human-like delay
      }
    }
    return leads;
  }
}
