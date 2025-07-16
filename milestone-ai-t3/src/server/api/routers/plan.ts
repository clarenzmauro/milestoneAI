import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { 
  createPlanSchema, 
  updatePlanSchema, 
  paginationSchema, 
  filterSchema,
  milestoneSchema,
  objectiveSchema,
  taskSchema,
  achievementSchema
} from "~/server/api/schemas";

const planIdSchema = z.object({
  id: z.string().cuid(),
});

const bulkUpdateSchema = z.object({
  planId: z.string().cuid(),
  milestones: z.array(milestoneSchema).optional(),
  objectives: z.array(objectiveSchema).optional(),
  tasks: z.array(taskSchema).optional(),
});

const progressUpdateSchema = z.object({
  planId: z.string().cuid(),
  type: z.enum(["milestone", "objective", "task"]),
  itemId: z.string().cuid(),
  completed: z.boolean(),
});

export const planRouter = createTRPCRouter({
  // Create a new plan
  create: protectedProcedure
    .input(createPlanSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const plan = await ctx.db.plan.create({
          data: {
            ...input,
            userId: ctx.user.id,
          },
        });
        return plan;
      } catch (error) {
        console.error("Error creating plan:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create plan",
          cause: error,
        });
      }
    }),

  // Get all plans for the current user with pagination and filtering
  getAll: protectedProcedure
    .input(paginationSchema.merge(filterSchema).optional())
    .query(async ({ ctx, input }) => {
      try {
        const limit = input?.limit ?? 20;
        const offset = input?.offset ?? 0;
        const interactionMode = input?.interactionMode;
        const createdAfter = input?.createdAfter;
        const createdBefore = input?.createdBefore;
        const updatedAfter = input?.updatedAfter;
        const updatedBefore = input?.updatedBefore;
        
        const where = {
          userId: ctx.user.id,
          ...(interactionMode && { interactionMode }),
          ...(createdAfter && { createdAt: { gte: new Date(createdAfter) } }),
          ...(createdBefore && { createdAt: { lte: new Date(createdBefore) } }),
          ...(updatedAfter && { updatedAt: { gte: new Date(updatedAfter) } }),
          ...(updatedBefore && { updatedAt: { lte: new Date(updatedBefore) } }),
        };

        const [plans, total] = await Promise.all([
          ctx.db.plan.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
          }),
          ctx.db.plan.count({ where }),
        ]);

        return {
          plans,
          total,
          hasMore: offset + plans.length < total,
        };
      } catch (error) {
        console.error("Error fetching plans:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch plans",
          cause: error,
        });
      }
    }),

  // Get a single plan by ID
  getById: protectedProcedure
    .input(planIdSchema)
    .query(async ({ ctx, input }) => {
      try {
        const plan = await ctx.db.plan.findFirst({
          where: {
            id: input.id,
            userId: ctx.user.id,
          },
        });

        if (!plan) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Plan not found or you don't have permission to access it",
          });
        }

        return plan;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching plan:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch plan",
          cause: error,
        });
      }
    }),

  // Update a plan
  update: protectedProcedure
    .input(updatePlanSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...updateData } = input;
        
        // Check if plan exists and belongs to user
        const existingPlan = await ctx.db.plan.findFirst({
          where: {
            id,
            userId: ctx.user.id,
          },
        });

        if (!existingPlan) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Plan not found or you don't have permission to update it",
          });
        }

        const plan = await ctx.db.plan.update({
          where: { id },
          data: {
            ...updateData,
            updatedAt: new Date(),
          },
        });

        return plan;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error updating plan:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update plan",
          cause: error,
        });
      }
    }),

  // Delete a plan
  delete: protectedProcedure
    .input(planIdSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if plan exists and belongs to user
        const existingPlan = await ctx.db.plan.findFirst({
          where: {
            id: input.id,
            userId: ctx.user.id,
          },
        });

        if (!existingPlan) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Plan not found or you don't have permission to delete it",
          });
        }

        await ctx.db.plan.delete({
          where: { id: input.id },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error deleting plan:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete plan",
          cause: error,
        });
      }
    }),

  // Get plans by interaction mode
  getByMode: protectedProcedure
    .input(z.object({ mode: z.enum(["chat", "plan"]) }))
    .query(async ({ ctx, input }) => {
      try {
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
      } catch (error) {
        console.error("Error fetching plans by mode:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch plans by mode",
          cause: error,
        });
      }
    }),

  // Bulk update plan items (milestones, objectives, tasks)
  bulkUpdate: protectedProcedure
    .input(bulkUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { planId, milestones, objectives, tasks } = input;

        // Check if plan exists and belongs to user
        const existingPlan = await ctx.db.plan.findFirst({
          where: {
            id: planId,
            userId: ctx.user.id,
          },
        });

        if (!existingPlan) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Plan not found or you don't have permission to update it",
          });
        }

        const updateData: any = {
          updatedAt: new Date(),
        };

        if (milestones !== undefined) {
          updateData.monthlyMilestones = milestones;
        }
        if (objectives !== undefined) {
          updateData.weeklyObjectives = objectives;
        }
        if (tasks !== undefined) {
          updateData.dailyTasks = tasks;
        }

        const plan = await ctx.db.plan.update({
          where: { id: planId },
          data: updateData,
        });

        return plan;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error bulk updating plan:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to bulk update plan",
          cause: error,
        });
      }
    }),

  // Update progress of a specific item
  updateProgress: protectedProcedure
    .input(progressUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { planId, type, itemId, completed } = input;

        // Check if plan exists and belongs to user
        const existingPlan = await ctx.db.plan.findFirst({
          where: {
            id: planId,
            userId: ctx.user.id,
          },
        });

        if (!existingPlan) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Plan not found or you don't have permission to update it",
          });
        }

        // Update the specific item based on type
        let updatedData: any = {};
        
        if (type === "milestone" && existingPlan.monthlyMilestones) {
          const milestones = existingPlan.monthlyMilestones as any[];
          const updatedMilestones = milestones.map((milestone: any) =>
            milestone.id === itemId ? { ...milestone, completed } : milestone
          );
          updatedData.monthlyMilestones = updatedMilestones;
        } else if (type === "objective" && existingPlan.weeklyObjectives) {
          const objectives = existingPlan.weeklyObjectives as any[];
          const updatedObjectives = objectives.map((objective: any) =>
            objective.id === itemId ? { ...objective, completed } : objective
          );
          updatedData.weeklyObjectives = updatedObjectives;
        } else if (type === "task" && existingPlan.dailyTasks) {
          const tasks = existingPlan.dailyTasks as any[];
          const updatedTasks = tasks.map((task: any) =>
            task.id === itemId ? { ...task, completed } : task
          );
          updatedData.dailyTasks = updatedTasks;
        }

        const plan = await ctx.db.plan.update({
          where: { id: planId },
          data: {
            ...updatedData,
            updatedAt: new Date(),
          },
        });

        return plan;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error updating progress:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update progress",
          cause: error,
        });
      }
    }),

  // Add achievement to a plan
  addAchievement: protectedProcedure
    .input(z.object({
      planId: z.string().cuid(),
      achievement: achievementSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { planId, achievement } = input;

        // Check if plan exists and belongs to user
        const existingPlan = await ctx.db.plan.findFirst({
          where: {
            id: planId,
            userId: ctx.user.id,
          },
        });

        if (!existingPlan) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Plan not found or you don't have permission to update it",
          });
        }

        const currentAchievements = (existingPlan.achievements as any[]) || [];
        const updatedAchievements = [...currentAchievements, {
          ...achievement,
          id: achievement.id || crypto.randomUUID(),
        }];

        const plan = await ctx.db.plan.update({
          where: { id: planId },
          data: {
            achievements: updatedAchievements,
            updatedAt: new Date(),
          },
        });

        return plan;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error adding achievement:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add achievement",
          cause: error,
        });
      }
    }),

  // Get plan statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const [totalPlans, chatPlans, planPlans, recentPlans] = await Promise.all([
        ctx.db.plan.count({
          where: { userId: ctx.user.id },
        }),
        ctx.db.plan.count({
          where: { userId: ctx.user.id, interactionMode: "chat" },
        }),
        ctx.db.plan.count({
          where: { userId: ctx.user.id, interactionMode: "plan" },
        }),
        ctx.db.plan.count({
          where: {
            userId: ctx.user.id,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        }),
      ]);

      return {
        totalPlans,
        chatPlans,
        planPlans,
        recentPlans,
      };
    } catch (error) {
      console.error("Error fetching plan stats:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch plan statistics",
        cause: error,
      });
    }
  }),
});
