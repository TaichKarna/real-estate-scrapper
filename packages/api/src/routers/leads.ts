import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import * as XLSX from "xlsx";
import { z } from "zod";

import { activity, LEAD_SOURCES, LEAD_STATUSES, LEAD_TYPES, lead, leadSource, user } from "@real-estate-scrapper/db";

import { protectedProcedure, router } from "../index";

export const leadsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        type: z.enum(LEAD_TYPES).optional(),
        status: z.enum(LEAD_STATUSES).optional(),
        source: z.enum(LEAD_SOURCES).optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        hasPhone: z.boolean().optional(),
        hasEmail: z.boolean().optional(),
        assignedTo: z.string().optional(),
        sortBy: z.enum(["createdAt", "updatedAt", "name", "score", "rating", "lastContactedAt", "type"]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(2000).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.limit;
      const conditions = [isNull(lead.mergedInto)];

      if (input.search && input.search.trim() !== "") {
        const term = `%${input.search.trim().toLowerCase()}%`;
        conditions.push(
          sql`(lower(${lead.name}) LIKE ${term} OR lower(${lead.normalizedName}) LIKE ${term} OR lower(coalesce(${lead.contactPerson}, '')) LIKE ${term} OR lower(coalesce(${lead.primaryPhone}, '')) LIKE ${term} OR lower(coalesce(${lead.city}, '')) LIKE ${term} OR lower(coalesce(${lead.address}, '')) LIKE ${term})`,
        );
      }

      if (input.type) {
        conditions.push(eq(lead.type, input.type));
      }

      if (input.status) {
        conditions.push(eq(lead.status, input.status));
      }

      if (input.city) {
        conditions.push(eq(lead.city, input.city));
      }

      if (input.state) {
        conditions.push(eq(lead.state, input.state));
      }

      if (input.assignedTo) {
        if (input.assignedTo === "unassigned") {
          conditions.push(isNull(lead.assignedTo));
        } else {
          conditions.push(eq(lead.assignedTo, input.assignedTo));
        }
      }

      if (input.hasPhone) {
        conditions.push(isNotNull(lead.primaryPhone));
      }

      if (input.hasEmail) {
        conditions.push(sql`json_array_length(${lead.emails}) > 0`);
      }

      if (input.source) {
        conditions.push(
          sql`exists (select 1 from ${leadSource} where ${leadSource.leadId} = ${lead.id} and ${leadSource.source} = ${input.source})`,
        );
      }

      const whereClause = and(...conditions);

      const [totalResult] = await ctx.db
        .select({ value: count() })
        .from(lead)
        .where(whereClause);

      const total = totalResult?.value ?? 0;

      const orderCol =
        input.sortBy === "name"
          ? lead.name
          : input.sortBy === "score"
            ? lead.score
            : input.sortBy === "rating"
              ? lead.rating
              : input.sortBy === "type"
                ? lead.type
                : input.sortBy === "lastContactedAt"
                  ? lead.lastContactedAt
                  : input.sortBy === "updatedAt"
                    ? lead.updatedAt
                    : lead.createdAt;

      const items = await ctx.db
        .select({
          id: lead.id,
          name: lead.name,
          contactPerson: lead.contactPerson,
          primaryPhone: lead.primaryPhone,
          phones: lead.phones,
          emails: lead.emails,
          website: lead.website,
          websiteDomain: lead.websiteDomain,
          address: lead.address,
          locality: lead.locality,
          city: lead.city,
          state: lead.state,
          pincode: lead.pincode,
          reraNumbers: lead.reraNumbers,
          projectCount: lead.projectCount,
          activeProjectCount: lead.activeProjectCount,
          rating: lead.rating,
          reviewCount: lead.reviewCount,
          type: lead.type,
          categories: lead.categories,
          sources: lead.sources,
          score: lead.score,
          status: lead.status,
          followUpAt: lead.followUpAt,
          lastContactedAt: lead.lastContactedAt,
          assignedTo: lead.assignedTo,
          notes: lead.notes,
          createdAt: lead.createdAt,
          updatedAt: lead.updatedAt,
        })
        .from(lead)
        .where(whereClause)
        .orderBy(input.sortOrder === "asc" ? orderCol : desc(orderCol))
        .limit(input.limit)
        .offset(offset);

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(total / input.limit),
      };
    }),

  exportExcel: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        type: z.enum(LEAD_TYPES).optional(),
        status: z.enum(LEAD_STATUSES).optional(),
        source: z.enum(LEAD_SOURCES).optional(),
        city: z.string().optional(),
        state: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const conditions = [isNull(lead.mergedInto)];

      if (input.search && input.search.trim() !== "") {
        const term = `%${input.search.trim().toLowerCase()}%`;
        conditions.push(
          sql`(lower(${lead.name}) LIKE ${term} OR lower(${lead.normalizedName}) LIKE ${term} OR lower(coalesce(${lead.contactPerson}, '')) LIKE ${term} OR lower(coalesce(${lead.primaryPhone}, '')) LIKE ${term} OR lower(coalesce(${lead.city}, '')) LIKE ${term} OR lower(coalesce(${lead.address}, '')) LIKE ${term})`,
        );
      }

      if (input.type) {
        conditions.push(eq(lead.type, input.type));
      }

      if (input.status) {
        conditions.push(eq(lead.status, input.status));
      }

      if (input.city) {
        conditions.push(eq(lead.city, input.city));
      }

      if (input.state) {
        conditions.push(eq(lead.state, input.state));
      }

      if (input.source) {
        conditions.push(
          sql`exists (select 1 from ${leadSource} where ${leadSource.leadId} = ${lead.id} and ${leadSource.source} = ${input.source})`,
        );
      }

      const items = await ctx.db
        .select({
          id: lead.id,
          name: lead.name,
          contactPerson: lead.contactPerson,
          primaryPhone: lead.primaryPhone,
          phones: lead.phones,
          emails: lead.emails,
          website: lead.website,
          websiteDomain: lead.websiteDomain,
          address: lead.address,
          locality: lead.locality,
          city: lead.city,
          state: lead.state,
          pincode: lead.pincode,
          reraNumbers: lead.reraNumbers,
          projectCount: lead.projectCount,
          activeProjectCount: lead.activeProjectCount,
          rating: lead.rating,
          reviewCount: lead.reviewCount,
          type: lead.type,
          categories: lead.categories,
          sources: lead.sources,
          score: lead.score,
          status: lead.status,
          notes: lead.notes,
          createdAt: lead.createdAt,
          updatedAt: lead.updatedAt,
        })
        .from(lead)
        .where(and(...conditions))
        .orderBy(desc(lead.score));

      const excelRows = items.map((l, idx) => ({
        "S.No": idx + 1,
        "Lead ID": l.id,
        "Company Name": l.name,
        "Lead Type": l.type,
        "Lead Score": l.score,
        "Pipeline Status": l.status.toUpperCase(),
        "Contact Person": l.contactPerson || "—",
        "Primary Phone": l.primaryPhone || "—",
        "All Alternate Phones": (l.phones || []).join(", ") || "—",
        "Email Addresses": (l.emails || []).join(", ") || "—",
        "Official Website": l.website || "—",
        "Website Domain": l.websiteDomain || "—",
        "Full Address": l.address || "—",
        "Locality / Area": l.locality || "—",
        "City": l.city || "—",
        "State": l.state || "—",
        "Pincode": l.pincode || "—",
        "Rating": l.rating || "—",
        "Review Count": l.reviewCount || 0,
        "RERA Registration Numbers": (l.reraNumbers || []).join(", ") || "—",
        "Active Projects": l.activeProjectCount || 0,
        "Total Projects": l.projectCount || 0,
        "Categories & Tags": (l.categories || []).join(" • "),
        "Lead Sources": (l.sources || []).join(", "),
        "Internal Notes": l.notes || "—",
        "Created Date": new Date(l.createdAt).toLocaleDateString("en-IN"),
        "Last Updated": new Date(l.updatedAt).toLocaleDateString("en-IN"),
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelRows);

      if (excelRows.length > 0) {
        worksheet["!cols"] = Object.keys(excelRows[0] || {}).map((key) => {
          const maxLen = Math.max(
            key.length,
            ...excelRows.slice(0, 100).map((r) => String((r as any)[key] || "").length),
          );
          return { wch: Math.min(50, Math.max(10, maxLen + 2)) };
        });
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Real Estate Leads");

      const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
      const filename = `RealEstate_Leads_${new Date().toISOString().split("T")[0]}.xlsx`;

      return {
        base64,
        filename,
        count: items.length,
      };
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.db.query.lead.findFirst({
        where: { id: input.id },
        with: {
          sourcesRows: true,
          projects: true,
          activities: {
            orderBy: { createdAt: "desc" },
          },
          assignee: true,
        },
      });

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }

      return item;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(LEAD_STATUSES).optional(),
        notes: z.string().optional(),
        contactPerson: z.string().optional(),
        followUpAt: z.number().nullable().optional(),
        assignedTo: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.lead.findFirst({
        where: { id: input.id },
      });




      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }

      const updates: Partial<typeof lead.$inferInsert> = {};

      if (input.status !== undefined && input.status !== existing.status) {
        updates.status = input.status;
        await ctx.db.insert(activity).values({
          leadId: input.id,
          userId: ctx.session.user.id,
          type: "status_change",
          body: `Status changed from ${existing.status} to ${input.status}`,
        });
      }

      if (input.notes !== undefined) {
        updates.notes = input.notes;
      }

      if (input.contactPerson !== undefined) {
        updates.contactPerson = input.contactPerson;
      }

      if (input.followUpAt !== undefined) {
        updates.followUpAt = input.followUpAt ? new Date(input.followUpAt) : null;
      }

      if (input.assignedTo !== undefined) {
        updates.assignedTo = input.assignedTo;
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.update(lead).set(updates).where(eq(lead.id, input.id));
      }

      return { success: true };
    }),

  addNote: protectedProcedure
    .input(
      z.object({
        leadId: z.string(),
        body: z.string().min(1, "Note cannot be empty"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(activity).values({
        leadId: input.leadId,
        userId: ctx.session.user.id,
        type: "note",
        body: input.body,
      });

      await ctx.db
        .update(lead)
        .set({ notes: input.body })
        .where(eq(lead.id, input.leadId));

      return { success: true };
    }),

  bulkUpdateStatus: protectedProcedure
    .input(
      z.object({
        leadIds: z.array(z.string()).min(1),
        status: z.enum(LEAD_STATUSES),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(lead)
        .set({ status: input.status })
        .where(inArray(lead.id, input.leadIds));

      for (const id of input.leadIds) {
        await ctx.db.insert(activity).values({
          leadId: id,
          userId: ctx.session.user.id,
          type: "status_change",
          body: `Bulk updated status to ${input.status}`,
        });
      }

      return { success: true, count: input.leadIds.length };
    }),

  filterOptions: protectedProcedure.query(async ({ ctx }) => {
    const citiesRes = await ctx.db
      .select({ city: lead.city })
      .from(lead)
      .where(and(isNotNull(lead.city), isNull(lead.mergedInto)))
      .groupBy(lead.city);

    const statesRes = await ctx.db
      .select({ state: lead.state })
      .from(lead)
      .where(and(isNotNull(lead.state), isNull(lead.mergedInto)))
      .groupBy(lead.state);

    const usersRes = await ctx.db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user);

    return {
      cities: citiesRes.map((r) => r.city!).filter(Boolean).sort(),
      states: statesRes.map((r) => r.state!).filter(Boolean).sort(),
      users: usersRes,
      sources: [...LEAD_SOURCES],
      statuses: [...LEAD_STATUSES],
      types: [...LEAD_TYPES],
    };
  }),

  detectDuplicates: protectedProcedure.query(async ({ ctx }) => {
    const activeLeads = await ctx.db
      .select({
        id: lead.id,
        name: lead.name,
        city: lead.city,
        phones: lead.phones,
        emails: lead.emails,
        website: lead.website,
        reraNumbers: lead.reraNumbers,
        score: lead.score,
        createdAt: lead.createdAt,
      })
      .from(lead)
      .where(isNull(lead.mergedInto));

    // Dynamic import/call dedupe helper
    const { detectDuplicates } = await import("@real-estate-scrapper/scraper");
    const matches = detectDuplicates(activeLeads);

    return matches;
  }),

  mergeLeads: protectedProcedure
    .input(
      z.object({
        primaryLeadId: z.string(),
        secondaryLeadId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const primary = await ctx.db.query.lead.findFirst({
        where: { id: input.primaryLeadId },
      });
      const secondary = await ctx.db.query.lead.findFirst({
        where: { id: input.secondaryLeadId },
      });

      if (!primary || !secondary) {
        throw new TRPCError({ code: "NOT_FOUND", message: "One or both leads not found" });
      }

      // Union phones, emails, reraNumbers
      const mergedPhones = Array.from(new Set([...(primary.phones || []), ...(secondary.phones || [])]));
      const mergedEmails = Array.from(new Set([...(primary.emails || []), ...(secondary.emails || [])]));
      const mergedRera = Array.from(new Set([...(primary.reraNumbers || []), ...(secondary.reraNumbers || [])]));
      const mergedSources = Array.from(new Set([...(primary.sources || []), ...(secondary.sources || [])]));

      await ctx.db
        .update(lead)
        .set({
          phones: mergedPhones,
          emails: mergedEmails,
          reraNumbers: mergedRera,
          sources: mergedSources,
          website: primary.website || secondary.website,
          contactPerson: primary.contactPerson || secondary.contactPerson,
          address: primary.address || secondary.address,
        })
        .where(eq(lead.id, input.primaryLeadId));

      // Mark secondary as merged into primary
      await ctx.db
        .update(lead)
        .set({ mergedInto: input.primaryLeadId })
        .where(eq(lead.id, input.secondaryLeadId));

      // Re-assign activities
      await ctx.db
        .update(activity)
        .set({ leadId: input.primaryLeadId })
        .where(eq(activity.leadId, input.secondaryLeadId));

      // Log merge activity
      await ctx.db.insert(activity).values({
        leadId: input.primaryLeadId,
        userId: ctx.session.user.id,
        type: "system",
        body: `Merged duplicate lead "${secondary.name}" (ID: ${secondary.id}) into this lead`,
      });

      return { success: true };
    }),
});

