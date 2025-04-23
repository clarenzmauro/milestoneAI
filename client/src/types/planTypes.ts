import { ChatMessage } from './chatTypes';       // Added import
import { InteractionMode } from './generalTypes'; // Added import

// Defines the structure for the AI-generated 90-day plan

export interface DailyTask {
  day: number; // e.g., 1-7 within the week
  description: string;
  completed: boolean; // For tracking
}

export interface WeeklyObjective {
  week: number; // e.g., 1-4 within the month
  objective: string;
  dailyTasks: DailyTask[];
}

export interface MonthlyMilestone {
  month: number; // e.g., 1-3
  milestone: string;
  weeklyObjectives: WeeklyObjective[];
}

// Represents the entire 90-day plan structure
export interface FullPlan {
  goal: string;
  monthlyMilestones: MonthlyMilestone[];
  chatHistory?: ChatMessage[]; // Optional: Added to reflect saved data
  interactionMode?: InteractionMode; // Optional: Added to reflect saved data
}

// Type guard to check if an object is a valid FullPlan
export const isFullPlan = (obj: any): obj is FullPlan => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.goal === 'string' &&
    Array.isArray(obj.monthlyMilestones) &&
    obj.monthlyMilestones.every(
      (m: any) =>
        typeof m === 'object' &&
        m !== null &&
        typeof m.month === 'number' &&
        typeof m.milestone === 'string' &&
        Array.isArray(m.weeklyObjectives) &&
        m.weeklyObjectives.every(
          (w: any) =>
            typeof w === 'object' &&
            w !== null &&
            typeof w.week === 'number' &&
            typeof w.objective === 'string' &&
            Array.isArray(w.dailyTasks) &&
            w.dailyTasks.every(
              (d: any) =>
                typeof d === 'object' &&
                d !== null &&
                typeof d.day === 'number' &&
                typeof d.description === 'string' &&
                typeof d.completed === 'boolean' // Updated check
            )
        )
    )
    // Optionally check for chatHistory and interactionMode if needed for validation
    // (typeof obj.chatHistory === 'undefined' || Array.isArray(obj.chatHistory)) &&
    // (typeof obj.interactionMode === 'undefined' || typeof obj.interactionMode === 'string')
  );
};
