import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { createPlanSchema, updatePlanSchema } from "~/server/api/schemas";

const planIdSchema = z.object({
  id: z.string().cuid(),
});

export const planRouter = createTRPCRouter({
  // Create a new plan
  create: protectedProcedure
    .input(createPlanSchema)
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.db.plan.create({
        data: {
          ...input,
          userId: ctx.user.id,
        },
      });
      return plan;
    }),

  // Get all plans for the current user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const plans = await ctx.db.plan.findMany({
      where: {
        userId: ctx.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return plans;
  }),

  // Get a single plan by ID
  getById: protectedProcedure
    .input(planIdSchema)
    .query(async ({ ctx, input }) => {
      const plan = await ctx.db.plan.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!plan) {
        throw new Error("Plan not found");
      }

      return plan;
    }),

  // Update a plan
  update: protectedProcedure
    .input(updatePlanSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      
      const plan = await ctx.db.plan.update({
        where: {
          id,
          userId: ctx.user.id,
        },
        data: updateData,
      });

      return plan;
    }),

  // Delete a plan
  delete: protectedProcedure
    .input(planIdSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.plan.delete({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      return { success: true };
    }),

  // Get plans by interaction mode
  getByMode: protectedProcedure
    .input(z.object({ mode: z.enum(["chat", "plan"]) }))
    .query(async ({ ctx, input }) => {
      const plans = await ctx.db.plan.findMany({
        where: {
          userId: ctx.user.id,
          interactionMode: input.mode,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
      return plans;
    }),
});
