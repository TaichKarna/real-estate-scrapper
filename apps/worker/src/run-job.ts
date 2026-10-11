import { and, eq, isNotNull, isNull, like } from "drizzle-orm";
import type { Database, JobLogEntry, ScrapeJobParams } from "@real-estate-scrapper/db";
import { heartbeat, lead, leadSource, scrapeJob } from "@real-estate-scrapper/db";
import { createBrowserContext, JustdialAdapter, JustdialSearchResultsPage, randomDelay } from "@real-estate-scrapper/scraper";
import { computeLeadScore, upsertScrapedLead } from "./upsert";

/**
 * Resumable detail collector for leads that have missing details (Zero data loss continuation).
 * Only processes leads where enrichedAt is NULL. Flags enrichedAt on completion.
 */
export async function enrichPendingJustdialLeads(
  db: Database,
  jobId: string | undefined,
  limit = 250,
  onProgress?: (progressPercent: number, message: string) => Promise<void>,
): Promise<{ enrichedCount: number; rateLimited: boolean }> {
  // Check if there are unenriched leads specifically linked to jobId
  let queryWhere = and(
    isNull(lead.enrichedAt),
    isNotNull(leadSource.sourceUrl),
    like(leadSource.sourceUrl, "%_BZDET%"),
  );

  if (jobId) {
    const jobSpecificLeads = await db
      .select({ leadId: leadSource.leadId })
      .from(leadSource)
      .innerJoin(lead, eq(lead.id, leadSource.leadId))
      .where(and(queryWhere, eq(leadSource.jobId, jobId)))
      .limit(1);

    if (jobSpecificLeads.length > 0) {
      queryWhere = and(queryWhere, eq(leadSource.jobId, jobId));
    }
  }

  const pendingSources = await db
    .select({
      leadId: leadSource.leadId,
      sourceUrl: leadSource.sourceUrl,
      sourceName: leadSource.source,
      externalId: leadSource.externalId,
      leadName: lead.name,
      phones: lead.phones,
      emails: lead.emails,
      website: lead.website,
      address: lead.address,
      contactPerson: lead.contactPerson,
      rating: lead.rating,
      pincode: lead.pincode,
      reraNumbers: lead.reraNumbers,
    })
    .from(leadSource)
    .innerJoin(lead, eq(lead.id, leadSource.leadId))
    .where(queryWhere)
    .limit(limit);

  if (pendingSources.length === 0) {
    return { enrichedCount: 0, rateLimited: false };
  }

  console.log(`🌐 Resumable Detail Collector: Enriching ${pendingSources.length} leads without details...`);

  const browserCtx = await createBrowserContext({ headless: false });
  const searchPage = new JustdialSearchResultsPage(browserCtx.page);

  // Warm session on Justdial so fetch calls inside evaluate are same-origin
  await browserCtx.page
    .goto("https://www.justdial.com", { waitUntil: "domcontentloaded", timeout: 20_000 })
    .catch(() => {});
  await randomDelay(1500, 2500);

  let enrichedCount = 0;
  let rateLimited = false;
  let consecutiveBlocks = 0;

  try {
    for (let i = 0; i < pendingSources.length; i++) {
      const item = pendingSources[i]!;

      // Breathing pause every 20 leads
      if (i > 0 && i % 20 === 0) {
        await randomDelay(3000, 5000);
      }

      if (onProgress) {
        const percent = Math.min(99, Math.round(((i + 1) / pendingSources.length) * 100));
        await onProgress(percent, `Enriching details (${i + 1}/${pendingSources.length}): ${item.leadName}`);
      }

      const scrapedLeadStub: any = {
        name: item.leadName,
        sourceUrl: item.sourceUrl,
        phones: item.phones || [],
        emails: item.emails || [],
        website: item.website || undefined,
        address: item.address || undefined,
        pincode: item.pincode || undefined,
        contactPerson: item.contactPerson || undefined,
      };

      const enrichRes = await searchPage.enrichLeadFromDetailPage(scrapedLeadStub);

      if (enrichRes.rateLimited) {
        consecutiveBlocks++;
        if (consecutiveBlocks >= 3) {
          console.warn(`⚠️ Justdial rate limit detected. Halting detail collection early; all progress is saved!`);
          rateLimited = true;
          break;
        }
        await randomDelay(2000, 4000);
      } else {
        consecutiveBlocks = 0;
        const enriched = enrichRes.lead;

        const updatedScore = computeLeadScore({
          phones: enriched.phones,
          website: enriched.website,
          emails: enriched.emails,
          contactPerson: enriched.contactPerson,
          rating: item.rating,
          reraNumbers: item.reraNumbers as string[],
        });

        const validName =
          enriched.name && !/^\+\s*\d+/.test(enriched.name) && !/\b\d+\s*more\b/i.test(enriched.name)
            ? enriched.name
            : undefined;

        const firstPhone = enriched.phones?.[0] || item.phones?.[0] || null;

        // Save immediately into SQLite - this ensures the continuation flag is set!
        await db
          .update(lead)
          .set({
            ...(validName
              ? {
                  name: validName,
                  normalizedName: validName.toLowerCase().replace(/[^a-z0-9]/g, ""),
                }
              : {}),
            primaryPhone: firstPhone,
            phones: enriched.phones,
            website: enriched.website || item.website,
            emails: enriched.emails,
            contactPerson: enriched.contactPerson || item.contactPerson,
            address: enriched.address || item.address,
            pincode: enriched.pincode || item.pincode,
            score: updatedScore,
            enrichedAt: new Date(), // Flagged as detail-collected!
            updatedAt: new Date(),
          })
          .where(eq(lead.id, item.leadId));

        if (enriched.raw) {
          await db
            .update(leadSource)
            .set({ raw: enriched.raw })
            .where(and(eq(leadSource.leadId, item.leadId), eq(leadSource.source, "justdial")));
        }

        enrichedCount++;
        await randomDelay(1200, 2200);
      }
    }
  } finally {
    await browserCtx.close().catch(() => {});
  }

  return { enrichedCount, rateLimited };
}

export async function executeScrapeJob(db: Database, jobId: string): Promise<void> {
  const job = await db.query.scrapeJob.findFirst({
    where: { id: jobId },
  });

  if (!job) {
    console.error(`❌ Job ${jobId} not found`);
    return;
  }

  const logs: JobLogEntry[] = job.log || [];
  const addLog = (level: "info" | "warn" | "error", message: string) => {
    const entry: JobLogEntry = { at: Date.now(), level, message };
    logs.push(entry);
    console.log(`[Job ${jobId.slice(0, 8)}] [${level.toUpperCase()}] ${message}`);
  };

  // Update status to running
  await db
    .update(scrapeJob)
    .set({
      status: "running",
      startedAt: new Date(),
      log: logs,
    })
    .where(eq(scrapeJob.id, jobId));

  addLog("info", `Started ${job.type} scrape job`);

  let foundCount = 0;
  let newCount = 0;
  let updatedCount = 0;
  let lastProgressSync = 0;

  const syncJobProgress = async (progressPercent: number, force = false) => {
    const now = Date.now();
    if (!force && now - lastProgressSync < 2000) {
      return; // Throttle DB updates to once every 2 seconds
    }
    lastProgressSync = now;
    try {
      await db
        .update(scrapeJob)
        .set({
          progress: Math.min(99, Math.max(0, progressPercent)),
          foundCount,
          newCount,
          updatedCount,
          log: logs,
        })
        .where(eq(scrapeJob.id, jobId));
    } catch (err: any) {
      // Progress reporting failure must NEVER crash the scrape job
      console.warn(`[Job ${jobId.slice(0, 8)}] Progress sync non-fatal error: ${err.message || err}`);
    }
  };

  try {
    const params: ScrapeJobParams = job.params || {};
    const cities = params.cities?.length ? params.cities : ["Mumbai"];
    const categories = params.categories?.length ? params.categories : ["Builders & Developers"];
    const maxPerCity = params.maxResults || 50;

    if (job.type === "justdial") {
      const adapter = new JustdialAdapter();

      for (const city of cities) {
        for (const cat of categories) {
          addLog("info", `Scraping ${city} - ${cat}`);

          const stream = adapter.run({
            city,
            category: cat,
            maxResults: maxPerCity,
            onProgress: async (info) => {
              if (!info) return;
              const current = info.current || 0;
              const total = Math.max(1, info.total || maxPerCity);
              const estimated = Math.min(50, Math.round((current / total) * 50));
              await syncJobProgress(estimated);
            },
          });

          for await (const item of stream) {
            foundCount++;
            try {
              const res = await upsertScrapedLead(
                db,
                item.lead,
                (item as any).projects || [],
                jobId,
              );
              if (res.action === "created") newCount++;
              if (res.action === "updated") updatedCount++;
            } catch (itemErr: any) {
              addLog("warn", `Failed to upsert lead "${item.lead.name}": ${itemErr.message || itemErr}`);
            }

            const streamProgress = Math.min(50, Math.round((foundCount / Math.max(1, maxPerCity)) * 50));
            await syncJobProgress(streamProgress);
          }

          // Update heartbeat
          await db
            .insert(heartbeat)
            .values({
              key: "worker",
              info: { lastActiveJob: jobId, status: "running" },
              seenAt: new Date(),
            })
            .onConflictDoUpdate({
              target: heartbeat.key,
              set: { seenAt: new Date(), info: { lastActiveJob: jobId, status: "running" } },
            });
        }
      }

      // Phase 2: Resumable detail collection for discovered leads (50% -> 99%)
      addLog("info", "Starting detail enrichment for discovered leads...");
      const enrichResult = await enrichPendingJustdialLeads(db, jobId, maxPerCity, async (pct) => {
        const overall = 50 + Math.round((pct / 100) * 49);
        await syncJobProgress(overall);
      });
      addLog("info", `Enriched details for ${enrichResult.enrichedCount} leads (rateLimited: ${enrichResult.rateLimited})`);
    } else if (job.type === "enrich") {
      addLog("info", "Starting resumable detail enrichment job...");
      const enrichResult = await enrichPendingJustdialLeads(db, jobId, maxPerCity, async (pct) => {
        await syncJobProgress(pct);
      });
      foundCount = enrichResult.enrichedCount;
      updatedCount = enrichResult.enrichedCount;
      addLog("info", `Completed enrichment! Enriched ${enrichResult.enrichedCount} leads (rateLimited: ${enrichResult.rateLimited})`);
    } else if (job.type === "rera") {
      const { ReraAdapter } = await import("@real-estate-scrapper/scraper");
      const adapter = new ReraAdapter();

      for (const city of cities) {
        addLog("info", `Scraping RERA for ${city}`);

        const stream = adapter.run({
          city,
          maxResults: maxPerCity,
          onProgress: async (info) => {
            const current = info?.current || foundCount;
            const total = Math.max(1, info?.total || maxPerCity);
            const currentProgress = Math.min(99, Math.round((current / total) * 100));
            await syncJobProgress(currentProgress);
          },
        });

        for await (const item of stream) {
          foundCount++;
          try {
            const res = await upsertScrapedLead(
              db,
              item.lead,
              item.projects || [],
              jobId,
            );
            if (res.action === "created") newCount++;
            if (res.action === "updated") updatedCount++;
          } catch (itemErr: any) {
            addLog("warn", `Failed to upsert RERA lead "${item.lead.name}": ${itemErr.message || itemErr}`);
          }

          const currentProgress = Math.min(99, Math.round((foundCount / Math.max(1, maxPerCity)) * 100));
          await syncJobProgress(currentProgress);
        }
      }
    } else {
      addLog("warn", `Unsupported job type: ${job.type}`);
    }


    addLog("info", `Completed! Found ${foundCount}, New: ${newCount}, Updated: ${updatedCount}`);

    await db
      .update(scrapeJob)
      .set({
        status: "done",
        progress: 100,
        foundCount,
        newCount,
        updatedCount,
        finishedAt: new Date(),
        log: logs,
      })
      .where(eq(scrapeJob.id, jobId));
  } catch (err: any) {
    const errorMsg = err.message || String(err);
    addLog("error", `Job failed: ${errorMsg}`);

    await db
      .update(scrapeJob)
      .set({
        status: "failed",
        error: errorMsg,
        finishedAt: new Date(),
        log: logs,
      })
      .where(eq(scrapeJob.id, jobId));
  }
}
