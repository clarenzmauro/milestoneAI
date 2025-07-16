import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { aiGeneratePlanSchema, aiChatSchema } from "~/server/api/schemas";
import { aiService } from "~/server/services/ai.service";
import type { ChatMessage } from "~/server/api/schemas";

const streamChatSchema = aiChatSchema;

export const aiRouter = createTRPCRouter({
  // Generate a new plan using AI
  generatePlan: protectedProcedure
    .input(aiGeneratePlanSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("Generating AI plan for goal:", input.goal);
        
        // Generate plan content using AI
        const aiPlanContent = await aiService.generatePlan(
          input.goal,
          input.timeline,
          input.additionalContext,
          input.preferences
        );

        // Parse the AI response to extract structured data
        const planData = parseAIPlanResponse(aiPlanContent, input.goal, input.timeline);

        // Create the plan in the database
        const plan = await ctx.db.plan.create({
          data: {
            goal: input.goal,
            summary: planData.summary,
            timeline: planData.timeline || input.timeline || "3 months",
            monthlyMilestones: planData.monthlyMilestones || [],
            weeklyObjectives: planData.weeklyObjectives || [],
            dailyTasks: planData.dailyTasks || [],
            achievements: [],
            chatHistory: [],
            userId: ctx.user.id,
            interactionMode: "plan",
          },
        });

        console.log("AI plan generated successfully with ID:", plan.id);
        return plan;
      } catch (error) {
        console.error("Error generating AI plan:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate plan",
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

      try {
        console.log("Processing AI chat for plan:", planId);
        
        // Prepare chat context
        const chatContext = {
          planGoal: plan.goal,
          planSummary: plan.summary || undefined,
          currentMilestones: plan.monthlyMilestones as any[],
          recentTasks: (plan.dailyTasks as any[])?.slice(-5) || [],
        };

        // Get existing chat history
        const existingHistory = (plan.chatHistory as ChatMessage[]) || [];

        // Get AI response
        const aiResponse = await aiService.chat(message, existingHistory, chatContext);

        // Create response message
        const responseMessage: ChatMessage = {
          role: "assistant",
          content: aiResponse,
          timestamp: new Date().toISOString(),
          context: context,
        };

        // Create user message
        const userMessage: ChatMessage = {
          role: "user",
          content: message,
          timestamp: new Date().toISOString(),
          context: context,
        };

        // Update the chat history
        const updatedChatHistory = [
          ...existingHistory,
          userMessage,
          responseMessage,
        ];

        const updatedPlan = await ctx.db.plan.update({
          where: { id: planId },
          data: {
            chatHistory: updatedChatHistory,
            updatedAt: new Date(),
          },
        });

        console.log("AI chat response generated successfully");
        return {
          response: responseMessage,
          plan: updatedPlan,
        };
      } catch (error) {
        console.error("Error in AI chat:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get AI response",
        });
      }
    }),

  // Stream chat responses (for real-time AI responses)
  streamChat: protectedProcedure
    .input(streamChatSchema)
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

      try {
        console.log("Processing AI streaming chat for plan:", planId);
        
        // Prepare chat context
        const chatContext = {
          planGoal: plan.goal,
          planSummary: plan.summary || undefined,
          currentMilestones: plan.monthlyMilestones as any[],
          recentTasks: (plan.dailyTasks as any[])?.slice(-5) || [],
        };

        // Get existing chat history
        const existingHistory = (plan.chatHistory as ChatMessage[]) || [];

        // Note: For now, we'll return a single response since tRPC doesn't support streaming mutations
        // In a real implementation, you'd want to use Server-Sent Events or WebSockets
        const aiResponse = await aiService.chat(message, existingHistory, chatContext);

        const responseMessage: ChatMessage = {
          role: "assistant",
          content: aiResponse,
          timestamp: new Date().toISOString(),
          context: context,
        };

        return {
          response: responseMessage,
          plan,
        };
      } catch (error) {
        console.error("Error in AI streaming chat:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get AI response",
        });
      }
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

      try {
        console.log("Generating AI suggestions for plan:", input.planId);
        
        const suggestions = await aiService.generateSuggestions({
          goal: plan.goal,
          summary: plan.summary,
          timeline: plan.timeline,
          monthlyMilestones: plan.monthlyMilestones,
          weeklyObjectives: plan.weeklyObjectives,
          dailyTasks: plan.dailyTasks,
        });

        console.log("AI suggestions generated successfully");
        return suggestions;
      } catch (error) {
        console.error("Error generating AI suggestions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate suggestions",
        });
      }
    }),
});

/**
 * Parse AI plan response and extract structured data
 */
function parseAIPlanResponse(aiContent: string, goal: string, timeline?: string) {
  // This is a simplified parser. In production, you might want more sophisticated parsing
  const lines = aiContent.split('\n');
  let summary = "";
  const monthlyMilestones: any[] = [];
  const weeklyObjectives: any[] = [];
  const dailyTasks: any[] = [];
  
  let currentSection = "";
  let currentMilestone: any = null;
  let milestoneCounter = 1;
  let taskCounter = 1;
  let objectiveCounter = 1;

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.toLowerCase().includes('plan summary') || trimmedLine.toLowerCase().includes('summary')) {
      currentSection = "summary";
      continue;
    }
    
    if (trimmedLine.toLowerCase().includes('monthly milestone') || trimmedLine.toLowerCase().includes('milestone')) {
      currentSection = "milestones";
      continue;
    }
    
    if (trimmedLine.toLowerCase().includes('weekly objective') || trimmedLine.toLowerCase().includes('weekly')) {
      currentSection = "objectives";
      continue;
    }
    
    if (trimmedLine.toLowerCase().includes('daily task') || trimmedLine.toLowerCase().includes('daily')) {
      currentSection = "tasks";
      continue;
    }

    // Parse content based on current section
    if (currentSection === "summary" && trimmedLine && !trimmedLine.startsWith('#')) {
      summary += (summary ? " " : "") + trimmedLine;
    }
    
    if (currentSection === "milestones" && trimmedLine && trimmedLine.startsWith('-')) {
      const title = trimmedLine.replace(/^-\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '');
      if (title) {
        monthlyMilestones.push({
          id: `milestone-${milestoneCounter}`,
          title: title.substring(0, 200),
          description: title,
          completed: false,
          priority: "medium",
        });
        milestoneCounter++;
      }
    }
    
    if (currentSection === "objectives" && trimmedLine && trimmedLine.startsWith('-')) {
      const title = trimmedLine.replace(/^-\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '');
      if (title) {
        weeklyObjectives.push({
          id: `objective-${objectiveCounter}`,
          title: title.substring(0, 200),
          description: title,
          completed: false,
          weekNumber: Math.ceil(objectiveCounter / 4), // Rough estimation
        });
        objectiveCounter++;
      }
    }
    
    if (currentSection === "tasks" && trimmedLine && trimmedLine.startsWith('-')) {
      const title = trimmedLine.replace(/^-\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '');
      if (title) {
        dailyTasks.push({
          id: `task-${taskCounter}`,
          title: title.substring(0, 200),
          description: title,
          completed: false,
          estimatedHours: 2, // Default estimation
        });
        taskCounter++;
      }
    }
  }

  return {
    summary: summary || `AI-generated plan for ${goal}`,
    timeline: timeline || "3 months",
    monthlyMilestones,
    weeklyObjectives,
    dailyTasks,
  };
}
