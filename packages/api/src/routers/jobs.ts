import { TRPCError } from "@trpc/server";
import { count, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { JOB_TYPES, scrapeJob } from "@real-estate-scrapper/db";


import { protectedProcedure, router } from "../index";

export const jobsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.limit;

      const [totalRes] = await ctx.db.select({ value: count() }).from(scrapeJob);
      const total = totalRes?.value ?? 0;

      const items = await ctx.db
        .select()
        .from(scrapeJob)
        .orderBy(desc(scrapeJob.createdAt))
        .limit(input.limit)
        .offset(offset);

      return {
        items,
        total,
        page: input.page,
        totalPages: Math.ceil(total / input.limit),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        type: z.enum(JOB_TYPES),
        cities: z.array(z.string()).min(1),
        categories: z.array(z.string()).optional(),
        maxResults: z.number().int().min(5).max(1000).default(50),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [job] = await ctx.db
        .insert(scrapeJob)
        .values({
          type: input.type,
          params: {
            cities: input.cities,
            categories: input.categories?.length ? input.categories : ["Builders & Developers"],
            maxResults: input.maxResults,
          },
          status: "queued",
          createdBy: ctx.session.user.id,
        })
        .returning();

      return job;
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.db.query.scrapeJob.findFirst({
        where: { id: input.id },
      });

      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      await ctx.db
        .update(scrapeJob)
        .set({
          status: "cancelled",
          cancelRequested: true,
          finishedAt: new Date(),
        })
        .where(eq(scrapeJob.id, input.id));

      return { success: true };
    }),

  workerStatus: protectedProcedure.query(async ({ ctx }) => {
    const hb = await ctx.db.query.heartbeat.findFirst({
      where: { key: "worker" },
    });

    if (!hb) {
      return { online: false, lastSeen: null };
    }

    const ageSeconds = (Date.now() - new Date(hb.seenAt).getTime()) / 1000;
    return {
      online: ageSeconds < 45,
      lastSeen: hb.seenAt,
      info: hb.info,
    };
  }),

  listSchedules: protectedProcedure.query(async ({ ctx }) => {
    const { scrapeSchedule } = await import("@real-estate-scrapper/db");
    const schedules = await ctx.db.select().from(scrapeSchedule).orderBy(desc(scrapeSchedule.createdAt));
    return schedules;
  }),

  createSchedule: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        type: z.enum(JOB_TYPES),
        cron: z.string().min(1),
        cities: z.array(z.string()).optional(),
        maxResults: z.number().int().min(5).max(1000).default(50),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { scrapeSchedule } = await import("@real-estate-scrapper/db");
      const [schedule] = await ctx.db
        .insert(scrapeSchedule)
        .values({
          name: input.name,
          type: input.type,
          cron: input.cron,
          params: {
            cities: input.cities || ["Pune"],
            maxResults: input.maxResults,
          },
          enabled: true,
          createdBy: ctx.session.user.id,
        })
        .returning();

      return schedule;
    }),

  deleteSchedule: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { scrapeSchedule } = await import("@real-estate-scrapper/db");
      await ctx.db.delete(scrapeSchedule).where(eq(scrapeSchedule.id, input.id));
      return { success: true };
    }),
});

