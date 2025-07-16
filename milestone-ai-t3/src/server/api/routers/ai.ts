import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { aiGeneratePlanSchema, aiChatSchema } from "~/server/api/schemas";

const streamChatSchema = aiChatSchema;

export const aiRouter = createTRPCRouter({
  // Generate a new plan using AI
  generatePlan: protectedProcedure
    .input(aiGeneratePlanSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // This is a placeholder for the actual AI integration
        // In the next task, we'll implement the Gemini AI service
        const mockPlan = {
          goal: input.goal,
          summary: `AI-generated plan for ${input.goal}`,
          timeline: input.timeline || "3 months",
          monthlyMilestones: [
            {
              month: 1,
              title: "Research and Planning",
              description: "Initial research and planning phase",
              completed: false,
            },
            {
              month: 2,
              title: "Implementation",
              description: "Main implementation phase",
              completed: false,
            },
            {
              month: 3,
              title: "Review and Refinement",
              description: "Final review and refinement",
              completed: false,
            },
          ],
          weeklyObjectives: [],
          dailyTasks: [],
          achievements: [],
          chatHistory: [],
        };

        // Create the plan in the database
        const plan = await ctx.db.plan.create({
          data: {
            goal: input.goal,
            summary: mockPlan.summary,
            timeline: mockPlan.timeline,
            monthlyMilestones: mockPlan.monthlyMilestones,
            weeklyObjectives: mockPlan.weeklyObjectives,
            dailyTasks: mockPlan.dailyTasks,
            achievements: mockPlan.achievements,
            chatHistory: mockPlan.chatHistory,
            userId: ctx.user.id,
            interactionMode: "plan",
          },
        });

        return plan;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate plan",
        });
      }
    }),

  // Send a chat message and get AI response
  chat: protectedProcedure
    .input(aiChatSchema)
    .mutation(async ({ ctx, input }) => {
      const { planId, message, context } = input;

      // Get the plan to ensure it belongs to the user
      const plan = await ctx.db.plan.findFirst({
        where: {
          id: planId,
          userId: ctx.user.id,
        },
      });

      if (!plan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Plan not found",
        });
      }

      // This is a placeholder for actual AI chat integration
      const mockResponse = {
        role: "assistant",
        content: `I understand you're asking about: ${message}. This is a mock response. In the next task, we'll integrate with Gemini AI for real responses.`,
        timestamp: new Date().toISOString(),
      };

      // Update the chat history
      const updatedChatHistory = [
        ...(plan.chatHistory as any[]),
        {
          role: "user",
          content: message,
          timestamp: new Date().toISOString(),
        },
        mockResponse,
      ];

      const updatedPlan = await ctx.db.plan.update({
        where: { id: planId },
        data: {
          chatHistory: updatedChatHistory,
          updatedAt: new Date(),
        },
      });

      return {
        response: mockResponse,
        plan: updatedPlan,
      };
    }),

  // Stream chat responses (for real-time AI responses)
  streamChat: protectedProcedure
    .input(streamChatSchema)
    .mutation(async ({ ctx, input }) => {
      // This will be implemented when we add streaming support
      // For now, return a mock response
      const { planId, message, context } = input;

      // Get the plan to ensure it belongs to the user
      const plan = await ctx.db.plan.findFirst({
        where: {
          id: planId,
          userId: ctx.user.id,
        },
      });

      if (!plan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Plan not found",
        });
      }

      const mockResponse = {
        role: "assistant",
        content: `Stream response: ${message}`,
        timestamp: new Date().toISOString(),
      };

      return {
        response: mockResponse,
        plan,
      };
    }),

  // Get AI suggestions for plan improvements
  getSuggestions: protectedProcedure
    .input(z.object({ planId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const plan = await ctx.db.plan.findFirst({
        where: {
          id: input.planId,
          userId: ctx.user.id,
        },
      });

      if (!plan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Plan not found",
        });
      }

      // Mock suggestions - will be replaced with actual AI integration
      const suggestions = [
        {
          type: "milestone",
          title: "Add specific metrics",
          description: "Consider adding measurable KPIs to track progress",
          priority: "high",
        },
        {
          type: "timeline",
          title: "Adjust timeline",
          description: "The current timeline might be too aggressive. Consider extending by 2 weeks.",
          priority: "medium",
        },
        {
          type: "task",
          title: "Break down tasks",
          description: "Break down large tasks into smaller, manageable daily tasks",
          priority: "medium",
        },
      ];

      return suggestions;
    }),
});
