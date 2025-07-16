import { GoogleGenerativeAI, GenerativeModel, ChatSession } from "@google/generative-ai";
import { env } from "~/env";
import type { CreatePlanInput, ChatMessage } from "~/server/api/schemas";

/**
 * Configuration for AI service operations
 */
interface AIConfig {
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

/**
 * Plan generation preferences
 */
interface PlanGenerationPreferences {
  complexity: "simple" | "moderate" | "detailed";
  focusAreas?: string[];
}

/**
 * Context for chat interactions
 */
interface ChatContext {
  planGoal?: string;
  planSummary?: string;
  currentMilestones?: any[];
  recentTasks?: any[];
}

/**
 * AI Service class for handling Gemini API interactions
 */
export class AIService {
  private genAI: GoogleGenerativeAI;
  private defaultConfig: AIConfig;

  constructor() {
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    this.defaultConfig = {
      model: "gemini-1.5-flash",
      temperature: 0.7,
      maxOutputTokens: 4096,
      topP: 0.8,
      topK: 40,
    };
  }

  /**
   * Get a configured Gemini model instance
   */
  private getModel(config?: Partial<AIConfig>): GenerativeModel {
    const modelConfig = { ...this.defaultConfig, ...config };
    
    return this.genAI.getGenerativeModel({
      model: modelConfig.model,
      generationConfig: {
        temperature: modelConfig.temperature,
        maxOutputTokens: modelConfig.maxOutputTokens,
        topP: modelConfig.topP,
        topK: modelConfig.topK,
      },
    });
  }

  /**
   * Generate a comprehensive plan based on a goal
   */
  async generatePlan(
    goal: string,
    timeline?: string,
    additionalContext?: string,
    preferences?: PlanGenerationPreferences
  ): Promise<string> {
    const complexity = preferences?.complexity || "moderate";
    const focusAreas = preferences?.focusAreas || [];
    
    const prompt = this.buildPlanGenerationPrompt(
      goal,
      timeline,
      additionalContext,
      complexity,
      focusAreas
    );

    const model = this.getModel({
      temperature: 0.8, // Slightly more creative for plan generation
      maxOutputTokens: 6000, // Longer output for comprehensive plans
    });

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Error generating plan:", error);
      throw new Error("Failed to generate plan with AI");
    }
  }

  /**
   * Generate a plan with streaming support
   */
  async *generatePlanStream(
    goal: string,
    timeline?: string,
    additionalContext?: string,
    preferences?: PlanGenerationPreferences
  ): AsyncGenerator<string, void, unknown> {
    const complexity = preferences?.complexity || "moderate";
    const focusAreas = preferences?.focusAreas || [];
    
    const prompt = this.buildPlanGenerationPrompt(
      goal,
      timeline,
      additionalContext,
      complexity,
      focusAreas
    );

    const model = this.getModel({
      temperature: 0.8,
      maxOutputTokens: 6000,
    });

    try {
      const result = await model.generateContentStream(prompt);
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          yield chunkText;
        }
      }
    } catch (error) {
      console.error("Error streaming plan generation:", error);
      throw new Error("Failed to generate plan with AI streaming");
    }
  }

  /**
   * Chat with AI with conversation context
   */
  async chat(
    message: string,
    chatHistory: ChatMessage[] = [],
    context?: ChatContext
  ): Promise<string> {
    const model = this.getModel({
      temperature: 0.7,
      maxOutputTokens: 2048,
    });

    // Convert chat history to Gemini format
    const history = this.convertChatHistoryToGeminiFormat(chatHistory);
    
    // Build system prompt with context
    const systemPrompt = this.buildChatSystemPrompt(context);
    
    try {
      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: systemPrompt }],
          },
          {
            role: "model",
            parts: [{ text: "I understand. I'm ready to assist you with your milestone planning and answer any questions you have about your plan." }],
          },
          ...history,
        ],
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Error in AI chat:", error);
      throw new Error("Failed to get AI chat response");
    }
  }

  /**
   * Chat with streaming support
   */
  async *chatStream(
    message: string,
    chatHistory: ChatMessage[] = [],
    context?: ChatContext
  ): AsyncGenerator<string, void, unknown> {
    const model = this.getModel({
      temperature: 0.7,
      maxOutputTokens: 2048,
    });

    const history = this.convertChatHistoryToGeminiFormat(chatHistory);
    const systemPrompt = this.buildChatSystemPrompt(context);
    
    try {
      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: systemPrompt }],
          },
          {
            role: "model",
            parts: [{ text: "I understand. I'm ready to assist you with your milestone planning and answer any questions you have about your plan." }],
          },
          ...history,
        ],
      });

      const result = await chat.sendMessageStream(message);
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          yield chunkText;
        }
      }
    } catch (error) {
      console.error("Error in AI chat streaming:", error);
      throw new Error("Failed to get AI chat response with streaming");
    }
  }

  /**
   * Generate suggestions for plan improvements
   */
  async generateSuggestions(planData: any): Promise<Array<{
    type: string;
    title: string;
    description: string;
    priority: string;
  }>> {
    const prompt = this.buildSuggestionsPrompt(planData);
    
    const model = this.getModel({
      temperature: 0.6, // More focused for suggestions
      maxOutputTokens: 1500,
    });

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const suggestions = this.parseSuggestions(response.text());
      return suggestions;
    } catch (error) {
      console.error("Error generating suggestions:", error);
      throw new Error("Failed to generate AI suggestions");
    }
  }

  /**
   * Build the plan generation prompt
   */
  private buildPlanGenerationPrompt(
    goal: string,
    timeline?: string,
    additionalContext?: string,
    complexity: string = "moderate",
    focusAreas: string[] = []
  ): string {
    const timelineText = timeline ? ` within ${timeline}` : " over a reasonable timeframe";
    const contextText = additionalContext ? `\n\nAdditional Context: ${additionalContext}` : "";
    const focusText = focusAreas.length > 0 ? `\n\nFocus Areas: ${focusAreas.join(", ")}` : "";
    
    const complexityInstructions = {
      simple: "Keep the plan concise with 2-3 main milestones and essential tasks only.",
      moderate: "Create a balanced plan with 3-4 key milestones, weekly objectives, and daily tasks.",
      detailed: "Develop a comprehensive plan with 4-6 milestones, detailed weekly objectives, specific daily tasks, and implementation strategies."
    };

    return `You are an expert strategic planner and productivity coach. Create a comprehensive, actionable milestone-based plan for achieving the following goal${timelineText}:

GOAL: ${goal}${contextText}${focusText}

COMPLEXITY LEVEL: ${complexity} - ${complexityInstructions[complexity as keyof typeof complexityInstructions]}

Please structure your response as a detailed plan that includes:

1. **Plan Summary**: A concise overview of the strategy and approach
2. **Monthly Milestones**: Major checkpoints with clear deliverables
3. **Weekly Objectives**: Specific targets for each week that build toward milestones
4. **Daily Tasks**: Actionable tasks that can be completed in a day
5. **Success Metrics**: How to measure progress and success
6. **Potential Challenges**: Anticipated obstacles and mitigation strategies

Format your response in clear markdown with appropriate headers and bullet points. Make sure the plan is realistic, actionable, and well-structured for tracking progress.

The plan should be motivating and achievable while maintaining high standards for success.`;
  }

  /**
   * Build the chat system prompt with context
   */
  private buildChatSystemPrompt(context?: ChatContext): string {
    let systemPrompt = `You are MilestoneAI, an intelligent assistant specialized in helping users achieve their goals through strategic planning and milestone tracking. You provide thoughtful, actionable advice and support.

Your role is to:
- Help users refine and improve their plans
- Provide motivation and guidance
- Answer questions about goal achievement strategies
- Suggest improvements to milestones and tasks
- Offer accountability and progress tracking support

Keep your responses helpful, encouraging, and focused on actionable advice.`;

    if (context?.planGoal) {
      systemPrompt += `\n\nCURRENT USER CONTEXT:
- Goal: ${context.planGoal}`;
      
      if (context.planSummary) {
        systemPrompt += `\n- Plan Summary: ${context.planSummary}`;
      }
      
      if (context.currentMilestones?.length) {
        systemPrompt += `\n- Current Milestones: ${context.currentMilestones.map(m => m.title).join(", ")}`;
      }
      
      if (context.recentTasks?.length) {
        systemPrompt += `\n- Recent Tasks: ${context.recentTasks.map(t => t.title).join(", ")}`;
      }
    }

    return systemPrompt;
  }

  /**
   * Build suggestions prompt
   */
  private buildSuggestionsPrompt(planData: any): string {
    return `Analyze the following plan and provide 3-5 specific, actionable suggestions for improvement:

GOAL: ${planData.goal}
SUMMARY: ${planData.summary || "No summary provided"}
TIMELINE: ${planData.timeline || "No timeline specified"}

MILESTONES: ${JSON.stringify(planData.monthlyMilestones || [], null, 2)}
TASKS: ${JSON.stringify(planData.dailyTasks || [], null, 2)}

Please provide suggestions in the following format for each suggestion:
TYPE: [milestone/timeline/task/general]
TITLE: [Brief title]
DESCRIPTION: [Detailed description of the suggestion]
PRIORITY: [high/medium/low]

Focus on practical improvements that would increase the likelihood of success.`;
  }

  /**
   * Convert internal chat history to Gemini format
   */
  private convertChatHistoryToGeminiFormat(chatHistory: ChatMessage[]) {
    return chatHistory.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));
  }

  /**
   * Parse AI suggestions from text response
   */
  private parseSuggestions(text: string): Array<{
    type: string;
    title: string;
    description: string;
    priority: string;
  }> {
    // This is a simple parser - in production, you might want to use a more robust approach
    const suggestions: Array<{
      type: string;
      title: string;
      description: string;
      priority: string;
    }> = [];

    const lines = text.split('\n');
    let currentSuggestion: any = {};

    for (const line of lines) {
      if (line.startsWith('TYPE:')) {
        if (currentSuggestion.type) {
          suggestions.push(currentSuggestion);
        }
        currentSuggestion = { type: line.replace('TYPE:', '').trim().toLowerCase() };
      } else if (line.startsWith('TITLE:')) {
        currentSuggestion.title = line.replace('TITLE:', '').trim();
      } else if (line.startsWith('DESCRIPTION:')) {
        currentSuggestion.description = line.replace('DESCRIPTION:', '').trim();
      } else if (line.startsWith('PRIORITY:')) {
        currentSuggestion.priority = line.replace('PRIORITY:', '').trim().toLowerCase();
      }
    }

    if (currentSuggestion.type) {
      suggestions.push(currentSuggestion);
    }

    // Validate and provide defaults
    return suggestions.map(s => ({
      type: s.type || 'general',
      title: s.title || 'Improvement suggestion',
      description: s.description || 'No description provided',
      priority: s.priority || 'medium'
    }));
  }
}

// Export a singleton instance
export const aiService = new AIService();
