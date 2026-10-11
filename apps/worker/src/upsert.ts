import { eq } from "drizzle-orm";

import type { Database } from "@real-estate-scrapper/db";
import { activity, lead, leadSource, project } from "@real-estate-scrapper/db";
import { normalizeName, normalizePhones } from "@real-estate-scrapper/scraper";
import type { ScrapedLead, ScrapedProject } from "@real-estate-scrapper/scraper";

export type UpsertResult = {
  action: "created" | "updated" | "skipped";
  leadId: string;
};

function extractDomain(urlStr?: string | null): string | null {
  if (!urlStr) return null;
  try {
    const formatted = urlStr.startsWith("http") ? urlStr : `https://${urlStr}`;
    return new URL(formatted).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function computeLeadScore(params: {
  phones: string[];
  website?: string | null;
  emails: string[];
  contactPerson?: string | null;
  rating?: number | null;
  reraNumbers?: string[] | null;
}): number {
  let score = 0;
  const hasPhone = params.phones.length > 0;
  const hasWebsite = Boolean(params.website && params.website.trim().length > 3);

  // Phone: +35 points
  if (hasPhone) score += 35;

  // Website: +25 points
  if (hasWebsite) score += 25;

  // High-Value Lead Bonus: BOTH Website and Phone present: +15 bonus points!
  // (Leads with both phone and website immediately get 75 baseline)
  if (hasPhone && hasWebsite) score += 15;

  // Email present: +10 points
  if (params.emails.length > 0) score += 10;

  // Contact person identified: +5 points
  if (params.contactPerson && params.contactPerson.trim().length > 2) score += 5;

  // Good Rating (>= 4.0): +5 points
  if (params.rating && params.rating >= 4.0) score += 5;

  // Verified RERA registration: +5 points
  if (params.reraNumbers && params.reraNumbers.length > 0) score += 5;

  return Math.min(100, Math.max(0, score));
}

export async function upsertScrapedLead(
  db: Database,
  scraped: ScrapedLead,
  projectsList: ScrapedProject[] = [],
  jobId?: string,
): Promise<UpsertResult> {
  // Reject any badge strings, slideshow indicators, or invalid names outright
  if (
    !scraped.name ||
    scraped.name.length < 2 ||
    /^\+\s*\d+/i.test(scraped.name) ||
    /\b\d+\s*more\b/i.test(scraped.name)
  ) {
    return { action: "skipped", leadId: "" };
  }

  const normName = normalizeName(scraped.name);
  const primaryPhone = scraped.phones[0] || null;
  const domain = extractDomain(scraped.website);

  // Step 1: Check existing lead by exact external source ID first
  let existingLead: typeof lead.$inferSelect | undefined;

  if (scraped.source && scraped.externalId) {
    const existingSource = await db.query.leadSource.findFirst({
      where: { source: scraped.source, externalId: scraped.externalId },
    });
    if (existingSource) {
      existingLead = await db.query.lead.findFirst({
        where: { id: existingSource.leadId },
      });
    }
  }

  // Step 2: Check by primary phone
  if (!existingLead && primaryPhone) {
    existingLead = await db.query.lead.findFirst({
      where: { primaryPhone },
    });
  }

  // Step 3: Check by normalized name and city if not found by external ID or phone
  if (!existingLead && normName && scraped.city) {
    existingLead = await db.query.lead.findFirst({
      where: { normalizedName: normName, city: scraped.city },
    });
  }

  if (existingLead) {
    // Merge & Update existing lead
    const mergedPhones = normalizePhones([...existingLead.phones, ...scraped.phones]);
    const mergedEmails = Array.from(new Set([...existingLead.emails, ...scraped.emails]));
    const mergedCategories = Array.from(new Set([...existingLead.categories, ...(scraped.categories || [])]));
    const mergedSources = Array.from(new Set([...existingLead.sources, scraped.source]));

    const isExistingBadName =
      existingLead.name.startsWith("+") || /\b\d+\s*more\b/i.test(existingLead.name);

    const updatedScore = computeLeadScore({
      phones: mergedPhones,
      website: scraped.website || existingLead.website,
      emails: mergedEmails,
      contactPerson: scraped.contactPerson || existingLead.contactPerson,
      rating: scraped.rating || existingLead.rating,
      reraNumbers: (scraped.reraNumbers?.length ? scraped.reraNumbers : existingLead.reraNumbers) as string[],
    });

    await db
      .update(lead)
      .set({
        name: isExistingBadName ? scraped.name : existingLead.name,
        normalizedName: isExistingBadName ? normName : existingLead.normalizedName,
        phones: mergedPhones,
        primaryPhone: mergedPhones[0] || existingLead.primaryPhone,
        emails: mergedEmails,
        type:
          scraped.type && (existingLead.type === "Real Estate Agent" || !existingLead.type)
            ? scraped.type
            : existingLead.type,
        categories: mergedCategories,
        sources: mergedSources as any,
        rating: scraped.rating || existingLead.rating,
        reviewCount: scraped.reviewCount || existingLead.reviewCount,
        address: scraped.address || existingLead.address,
        locality: scraped.locality || existingLead.locality,
        state: scraped.state || existingLead.state,
        pincode: scraped.pincode || existingLead.pincode,
        website: scraped.website || existingLead.website,
        websiteDomain: domain || existingLead.websiteDomain,
        score: updatedScore,
        updatedAt: new Date(),
      })
      .where(eq(lead.id, existingLead.id));

    // Upsert source record
    await db
      .insert(leadSource)
      .values({
        leadId: existingLead.id,
        source: scraped.source,
        externalId: scraped.externalId,
        sourceUrl: scraped.sourceUrl,
        raw: scraped.raw,
        jobId,
      })
      .onConflictDoNothing();

    // Insert Projects
    for (const proj of projectsList) {
      await db
        .insert(project)
        .values({
          leadId: existingLead.id,
          name: proj.name,
          reraNumber: proj.reraNumber,
          state: proj.state || scraped.state,
          district: proj.district || scraped.city,
          projectStatus: proj.projectStatus,
          completionDate: proj.completionDate,
          sourceUrl: proj.sourceUrl,
        })
        .onConflictDoNothing();
    }

    return { action: "updated", leadId: existingLead.id };
  }

  // Create new Lead
  const initialScore = computeLeadScore({
    phones: scraped.phones,
    website: scraped.website,
    emails: scraped.emails,
    contactPerson: scraped.contactPerson,
    rating: scraped.rating,
    reraNumbers: scraped.reraNumbers,
  });

  const [created] = await db
    .insert(lead)
    .values({
      name: scraped.name,
      normalizedName: normName || scraped.name.toLowerCase().replace(/[^a-z0-9]/g, ""),
      contactPerson: scraped.contactPerson,
      primaryPhone,
      phones: scraped.phones,
      emails: scraped.emails,
      website: scraped.website,
      websiteDomain: domain,
      address: scraped.address,
      locality: scraped.locality,
      city: scraped.city,
      state: scraped.state,
      pincode: scraped.pincode,
      reraNumbers: scraped.reraNumbers || [],
      rating: scraped.rating,
      reviewCount: scraped.reviewCount,
      type: scraped.type || "Real Estate Agent",
      categories: scraped.categories || [],
      sources: [scraped.source],
      score: initialScore,
      status: "new",
    })
    .returning();

  if (!created) {
    return { action: "skipped", leadId: "" };
  }

  // Insert source record
  await db
    .insert(leadSource)
    .values({
      leadId: created.id,
      source: scraped.source,
      externalId: scraped.externalId,
      sourceUrl: scraped.sourceUrl,
      raw: scraped.raw,
      jobId,
    })
    .onConflictDoNothing();

  // Insert Projects
  for (const proj of projectsList) {
    await db
      .insert(project)
      .values({
        leadId: created.id,
        name: proj.name,
        reraNumber: proj.reraNumber,
        state: proj.state || scraped.state,
        district: proj.district || scraped.city,
        projectStatus: proj.projectStatus,
        completionDate: proj.completionDate,
        sourceUrl: proj.sourceUrl,
      })
      .onConflictDoNothing();
  }

  // Activity log
  await db.insert(activity).values({
    leadId: created.id,
    type: "system",
    body: `Lead discovered from ${scraped.source} (Job: ${jobId || "manual"}).`,
  });

  return { action: "created", leadId: created.id };
}
