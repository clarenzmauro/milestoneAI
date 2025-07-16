import { z } from "zod";

// Base plan schemas
export const planBaseSchema = z.object({
  goal: z.string().min(1, "Goal is required").max(500, "Goal must be 500 characters or less"),
  summary: z.string().max(1000, "Summary must be 1000 characters or less").optional(),
  timeline: z.string().max(100, "Timeline must be 100 characters or less").optional(),
});

export const milestoneSchema = z.object({
  id: z.string().cuid().optional(),
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  description: z.string().max(1000, "Description must be 1000 characters or less").optional(),
  completed: z.boolean().default(false),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export const objectiveSchema = z.object({
  id: z.string().cuid().optional(),
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  description: z.string().max(1000, "Description must be 1000 characters or less").optional(),
  completed: z.boolean().default(false),
  weekNumber: z.number().int().min(1).max(52).optional(),
});

export const taskSchema = z.object({
  id: z.string().cuid().optional(),
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  description: z.string().max(1000, "Description must be 1000 characters or less").optional(),
  completed: z.boolean().default(false),
  date: z.string().datetime().optional(),
  estimatedHours: z.number().min(0).max(24).optional(),
});

export const achievementSchema = z.object({
  id: z.string().cuid().optional(),
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  description: z.string().max(1000, "Description must be 1000 characters or less").optional(),
  date: z.string().datetime(),
  category: z.enum(["milestone", "objective", "task", "custom"]).default("custom"),
});

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1, "Content is required"),
  timestamp: z.string().datetime(),
  context: z.string().optional(),
});

// Plan creation and update schemas
export const createPlanSchema = planBaseSchema.extend({
  monthlyMilestones: z.array(milestoneSchema).optional(),
  weeklyObjectives: z.array(objectiveSchema).optional(),
  dailyTasks: z.array(taskSchema).optional(),
  interactionMode: z.enum(["chat", "plan"]).default("plan"),
});

export const updatePlanSchema = z.object({
  id: z.string().cuid(),
  goal: z.string().min(1).max(500).optional(),
  summary: z.string().max(1000).optional(),
  timeline: z.string().max(100).optional(),
  monthlyMilestones: z.array(milestoneSchema).optional(),
  weeklyObjectives: z.array(objectiveSchema).optional(),
  dailyTasks: z.array(taskSchema).optional(),
  achievements: z.array(achievementSchema).optional(),
  chatHistory: z.array(chatMessageSchema).optional(),
  interactionMode: z.enum(["chat", "plan"]).optional(),
});

// AI-related schemas
export const aiGeneratePlanSchema = z.object({
  goal: z.string().min(1, "Goal is required").max(500),
  timeline: z.string().max(100).optional(),
  additionalContext: z.string().max(2000, "Additional context must be 2000 characters or less").optional(),
  preferences: z.object({
    complexity: z.enum(["simple", "moderate", "detailed"]).default("moderate"),
    focusAreas: z.array(z.string()).optional(),
  }).optional(),
});

export const aiChatSchema = z.object({
  planId: z.string().cuid(),
  message: z.string().min(1, "Message is required").max(2000, "Message must be 2000 characters or less"),
  context: z.string().max(1000, "Context must be 1000 characters or less").optional(),
});

// User-related schemas
export const userProfileSchema = z.object({
  name: z.string().max(100, "Name must be 100 characters or less").optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
});

// Query schemas
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export const filterSchema = z.object({
  interactionMode: z.enum(["chat", "plan"]).optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  updatedAfter: z.string().datetime().optional(),
  updatedBefore: z.string().datetime().optional(),
});

// Response schemas
export const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
});

export const successSchema = z.object({
  success: z.literal(true),
  data: z.any(),
});

// Type exports
export type PlanBase = z.infer<typeof planBaseSchema>;
export type Milestone = z.infer<typeof milestoneSchema>;
export type Objective = z.infer<typeof objectiveSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Achievement = z.infer<typeof achievementSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type AIGeneratePlanInput = z.infer<typeof aiGeneratePlanSchema>;
export type AIChatInput = z.infer<typeof aiChatSchema>;
export type UserProfileInput = z.infer<typeof userProfileSchema>;
