import { protectedProcedure, publicProcedure, router } from "../index";
import { callsRouter } from "./calls";
import { jobsRouter } from "./jobs";
import { leadsRouter } from "./leads";
import { statsRouter } from "./stats";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  leads: leadsRouter,
  stats: statsRouter,
  jobs: jobsRouter,
  calls: callsRouter,
});
export type AppRouter = typeof appRouter;



