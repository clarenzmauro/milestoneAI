import { FullPlan, MonthlyMilestone, WeeklyObjective, DailyTask } from '../types/planTypes';

/**
 * Attempts to parse a raw string (likely markdown) from the AI into a structured FullPlan object.
 * NOTE: This is a basic parser and relies heavily on the AI providing output
 * in a consistent format (e.g., using specific Markdown headings and lists).
 * It may need significant refinement based on actual AI output.
 *
 * Example Expected Format:
 * # Goal: [User's Goal]
 *
 * ## Month 1: [Milestone Title]
 * ### Week 1: [Objective Title]
 * - Day 1: [Task description]
 * - Day 2: [Task description]
 * ... (up to Day 7)
 * ### Week 2: [Objective Title]
 * ... (up to 4 weeks)
 * ## Month 2: [Milestone Title]
 * ... (up to 3 months)
 *
 * @param rawPlanString The raw string output from the AI.
 * @param userGoal The original goal provided by the user.
 * @returns A FullPlan object or null if parsing fails.
 */
export const parsePlanString = (rawPlanString: string, userGoal: string): FullPlan | null => {
  if (!rawPlanString) return null;

  const lines = rawPlanString.split('\n').filter(line => line.trim() !== '');
  const plan: FullPlan = {
    goal: userGoal, // Use the goal passed in, as the AI might not include it consistently
    monthlyMilestones: [],
  };

  let currentMilestone: MonthlyMilestone | null = null;
  let currentObjective: WeeklyObjective | null = null;
  let monthCounter = 0;
  let weekCounter = 0;
  let dayCounter = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Match Month Milestone (e.g., ## Month 1: Title or similar)
    const monthMatch = trimmedLine.match(/^#+\s*Month\s*(\d+):?\s*(.*)/i);
    if (monthMatch) {
      monthCounter = parseInt(monthMatch[1], 10);
      currentMilestone = {
        month: monthCounter,
        milestone: monthMatch[2].trim() || `Month ${monthCounter} Milestone`,
        weeklyObjectives: [],
      };
      plan.monthlyMilestones.push(currentMilestone);
      currentObjective = null; // Reset objective when month changes
      weekCounter = 0; // Reset week counter
      continue; // Move to next line
    }

    // Match Weekly Objective (e.g., ### Week 1: Title or similar)
    const weekMatch = trimmedLine.match(/^#+\s*Week\s*(\d+):?\s*(.*)/i);
    if (weekMatch && currentMilestone) {
      weekCounter = parseInt(weekMatch[1], 10);
      currentObjective = {
        week: weekCounter,
        objective: weekMatch[2].trim() || `Week ${weekCounter} Objective`,
        dailyTasks: [],
      };
      currentMilestone.weeklyObjectives.push(currentObjective);
      dayCounter = 0; // Reset day counter
      continue; // Move to next line
    }

    // Match Daily Task (e.g., - Day 1: Task or - Task)
    // Simple version: assumes any line starting with '-' or '*' in context is a task
    const taskMatch = trimmedLine.match(/^(-|\*)\s*(?:Day\s*(\d+):?)?\s*(.*)/i);
    if (taskMatch && currentObjective) {
      dayCounter++;
      const dayNumber = taskMatch[2] ? parseInt(taskMatch[2], 10) : dayCounter;
      const task: DailyTask = {
        day: dayNumber,
        description: taskMatch[3].trim(),
        completed: false, // Initialize the new field
      };
      currentObjective.dailyTasks.push(task);
      continue; // Move to next line
    }

    // If a line doesn't match known patterns but we are inside an objective,
    // potentially append it to the last task's description (basic multi-line handling)
    // This is rudimentary and might need improvement.
    // if (currentObjective && currentObjective.dailyTasks.length > 0 && /^[a-zA-Z]/.test(trimmedLine)) {
    //   const lastTask = currentObjective.dailyTasks[currentObjective.dailyTasks.length - 1];
    //   lastTask.description += '\n' + trimmedLine;
    // }
  }

  // Basic validation: Check if we got at least one milestone
  if (plan.monthlyMilestones.length === 0) {
    console.warn('Parser could not find any monthly milestones in the expected format.');
    return null;
  }

  return plan;
};
