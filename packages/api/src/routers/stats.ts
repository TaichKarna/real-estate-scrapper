import { and, count, eq, gte, isNotNull, isNull, lte, sql } from "drizzle-orm";

import { lead, project, scrapeJob } from "@real-estate-scrapper/db";

import { protectedProcedure, router } from "../index";

export const statsRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    const [totalLeadRes] = await ctx.db
      .select({ value: count() })
      .from(lead)
      .where(isNull(lead.mergedInto));

    const totalLeads = totalLeadRes?.value ?? 0;

    // Status breakdown
    const statusCountsRes = await ctx.db
      .select({
        status: lead.status,
        value: count(),
      })
      .from(lead)
      .where(isNull(lead.mergedInto))
      .groupBy(lead.status);

    const statusCounts: Record<string, number> = {
      new: 0,
      contacted: 0,
      interested: 0,
      follow_up: 0,
      not_interested: 0,
      bad_data: 0,
    };
    for (const r of statusCountsRes) {
      if (r.status) statusCounts[r.status] = r.value;
    }

    // New this week (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const [newThisWeekRes] = await ctx.db
      .select({ value: count() })
      .from(lead)
      .where(and(isNull(lead.mergedInto), gte(lead.createdAt, sevenDaysAgo)));
    const newThisWeek = newThisWeekRes?.value ?? 0;

    // Follow ups due
    const now = new Date();
    const [followUpDueRes] = await ctx.db
      .select({ value: count() })
      .from(lead)
      .where(and(isNull(lead.mergedInto), eq(lead.status, "follow_up"), lte(lead.followUpAt, now)));
    const followUpsDue = followUpDueRes?.value ?? 0;

    // Cities breakdown (top 5)
    const topCitiesRes = await ctx.db
      .select({
        city: lead.city,
        value: count(),
      })
      .from(lead)
      .where(and(isNull(lead.mergedInto), isNotNull(lead.city)))
      .groupBy(lead.city)
      .orderBy(sql`count() desc`)
      .limit(5);

    // Active projects count
    const [activeProjectsRes] = await ctx.db
      .select({ value: count() })
      .from(project);
    const totalProjects = activeProjectsRes?.value ?? 0;

    // Scrape jobs count
    const [runningJobsRes] = await ctx.db
      .select({ value: count() })
      .from(scrapeJob)
      .where(eq(scrapeJob.status, "running"));
    const runningJobs = runningJobsRes?.value ?? 0;

    return {
      totalLeads,
      statusCounts,
      newThisWeek,
      followUpsDue,
      topCities: topCitiesRes.map((c) => ({ city: c.city!, count: c.value })),
      totalProjects,
      runningJobs,
    };
  }),
});
