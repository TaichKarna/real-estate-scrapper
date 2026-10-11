import { createBrowserContext } from "../../core/browser";
import type { ScrapedLead, ScraperRunParams, SourceAdapter } from "../../types";
import { JustdialSearchResultsPage } from "./search-results.page";

export class JustdialAdapter implements SourceAdapter {
  readonly source = "justdial" as const;

  async *run(params: ScraperRunParams): AsyncIterable<{ lead: ScrapedLead }> {
    const city = params.city || "Pune";
    const category = params.category || "Real Estate Agents";
    const maxResults = params.maxResults || 50;

    let close: (() => Promise<void>) | null = null;

    try {
      console.log(`🚀 Starting Justdial scraper via persistent CDP browser for ${city} - ${category}...`);
      const browserCtx = await createBrowserContext({
        headless: false,
      });
      close = browserCtx.close;
      const page = browserCtx.page;

      const searchPage = new JustdialSearchResultsPage(page);
      await searchPage.navigate(city, category);

      if (params.onProgress) {
        try {
          await params.onProgress({
            current: 0,
            total: maxResults,
            message: `Navigated to ${city} - ${category}`,
          });
        } catch { }
      }

      for await (const batch of searchPage.streamPages(maxResults, city, params.onProgress)) {
        for (const lead of batch) {
          yield { lead };
        }
      }
    } catch (err: any) {
      console.error(`❌ Note during Justdial scraping: ${err.message}`);
      throw err;
    } finally {
      if (close) {
        await close().catch(() => {});
      }
    }
  }
}
