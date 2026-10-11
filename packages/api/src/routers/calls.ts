import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  activity,
  CALL_OUTCOMES,
  callRequest,
  heartbeat,
  lead,
} from "@real-estate-scrapper/db";


import { protectedProcedure, router } from "../index";

export const callsRouter = router({
  request: protectedProcedure
    .input(
      z.object({
        leadId: z.string(),
        phone: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const targetLead = await ctx.db.query.lead.findFirst({
        where: { id: input.leadId },
      });

      if (!targetLead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }

      // Expire previous pending calls for this user
      await ctx.db
        .update(callRequest)
        .set({ status: "expired" })
        .where(
          and(
            eq(callRequest.userId, ctx.session.user.id),
            eq(callRequest.status, "pending"),
          ),
        );

      const [req] = await ctx.db
        .insert(callRequest)
        .values({
          userId: ctx.session.user.id,
          leadId: input.leadId,
          phone: input.phone,
          status: "pending",
        })
        .returning();

      return req;
    }),

  pendingForUser: protectedProcedure.query(async ({ ctx }) => {
    // Write phone heartbeat
    await ctx.db
      .insert(heartbeat)
      .values({
        key: `phone:${ctx.session.user.id}`,
        info: { userId: ctx.session.user.id, name: ctx.session.user.name },
        seenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: heartbeat.key,
        set: { seenAt: new Date() },
      });

    const pending = await ctx.db.query.callRequest.findFirst({
      where: { userId: ctx.session.user.id, status: "pending" },
      with: {
        lead: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return pending || null;
  }),

  markDialed: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(callRequest)
        .set({ status: "dialed", updatedAt: new Date() })
        .where(eq(callRequest.id, input.id));

      return { success: true };
    }),

  logOutcome: protectedProcedure
    .input(
      z.object({
        leadId: z.string(),
        callRequestId: z.string().optional(),
        outcome: z.enum(CALL_OUTCOMES),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.callRequestId) {
        await ctx.db
          .update(callRequest)
          .set({
            status: "done",
            outcome: input.callRequestId ? input.outcome : undefined,
            updatedAt: new Date(),
          })
          .where(eq(callRequest.id, input.callRequestId));
      }

      // Map outcome to lead status update if relevant
      let newLeadStatus: any = undefined;
      if (input.outcome === "interested") newLeadStatus = "interested";
      if (input.outcome === "not_interested") newLeadStatus = "not_interested";
      if (input.outcome === "wrong_number") newLeadStatus = "bad_data";
      if (input.outcome === "call_back" || input.outcome === "no_answer") newLeadStatus = "follow_up";

      const now = new Date();
      const updates: any = {
        lastContactedAt: now,
      };

      if (newLeadStatus) {
        updates.status = newLeadStatus;
      }

      if (input.notes) {
        updates.notes = input.notes;
      }

      await ctx.db.update(lead).set(updates).where(eq(lead.id, input.leadId));

      // Record call activity
      await ctx.db.insert(activity).values({
        leadId: input.leadId,
        userId: ctx.session.user.id,
        type: "call",
        outcome: input.outcome,
        body: `Call logged: ${input.outcome.replace(/_/g, " ").toUpperCase()}${input.notes ? ` — ${input.notes}` : ""}`,
      });

      return { success: true };
    }),

  phoneStatus: protectedProcedure.query(async ({ ctx }) => {
    const hb = await ctx.db.query.heartbeat.findFirst({
      where: { key: `phone:${ctx.session.user.id}` },
    });

    if (!hb) {
      return { connected: false, lastSeen: null };
    }

    const ageSeconds = (Date.now() - new Date(hb.seenAt).getTime()) / 1000;
    return {
      connected: ageSeconds < 15,
      lastSeen: hb.seenAt,
    };
  }),
});
