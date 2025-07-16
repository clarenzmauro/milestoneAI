import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// Input validation schemas
const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
});

export const userRouter = createTRPCRouter({
  // Get current user profile
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.user_metadata?.name || null,
      avatarUrl: ctx.user.user_metadata?.avatar_url || null,
      createdAt: ctx.user.created_at,
      updatedAt: ctx.user.updated_at,
    };
  }),

  // Get user's plans summary
  getPlansSummary: protectedProcedure.query(async ({ ctx }) => {
    const plans = await ctx.db.plan.findMany({
      where: {
        userId: ctx.user.id,
      },
      select: {
        id: true,
        goal: true,
        interactionMode: true,
        createdAt: true,
        updatedAt: true,
        achievements: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const totalPlans = plans.length;
    const chatModePlans = plans.filter(p => p.interactionMode === "chat").length;
    const planModePlans = plans.filter(p => p.interactionMode === "plan").length;
    const completedAchievements = plans.reduce(
      (acc, plan) => acc + (plan.achievements as any[]).length,
      0
    );

    return {
      totalPlans,
      chatModePlans,
      planModePlans,
      completedAchievements,
      recentPlans: plans.slice(0, 5),
    };
  }),

  // Get user's statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const plans = await ctx.db.plan.findMany({
      where: {
        userId: ctx.user.id,
      },
      select: {
        achievements: true,
        chatHistory: true,
        createdAt: true,
      },
    });

    const totalPlans = plans.length;
    const totalAchievements = plans.reduce(
      (acc, plan) => acc + (plan.achievements as any[]).length,
      0
    );
    const totalMessages = plans.reduce(
      (acc, plan) => acc + (plan.chatHistory as any[]).length,
      0
    );
    const accountAge = Math.floor(
      (Date.now() - new Date(ctx.user.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      totalPlans,
      totalAchievements,
      totalMessages,
      accountAge,
    };
  }),
});
