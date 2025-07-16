import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { planRouter } from "~/server/api/routers/plan";
import { aiRouter } from "~/server/api/routers/ai";
import { userRouter } from "~/server/api/routers/user";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  plan: planRouter,
  ai: aiRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.plan.getAll();
 *       ^? Plan[]
 */
export const createCaller = createCallerFactory(appRouter);
