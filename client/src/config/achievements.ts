import { FullPlan, MonthlyMilestone, WeeklyObjective } from '../types/planTypes';

// --- Helper Functions ---

/**
 * Counts the total number of daily tasks in the plan.
 */
const countTotalTasks = (plan: FullPlan): number => {
  return plan.monthlyMilestones.reduce((monthCount, month) => {
    return (
      monthCount +
      month.weeklyObjectives.reduce((weekCount, week) => {
        return weekCount + (week.dailyTasks?.length || 0);
      }, 0)
    );
  }, 0);
};

/**
 * Counts the number of completed daily tasks in the plan.
 */
const countCompletedTasks = (plan: FullPlan): number => {
  return plan.monthlyMilestones.reduce((monthCount, month) => {
    return (
      monthCount +
      month.weeklyObjectives.reduce((weekCount, week) => {
        return (
          weekCount +
          (week.dailyTasks?.filter((task) => task.completed).length || 0)
        );
      }, 0)
    );
  }, 0);
};

/**
 * Checks if all tasks in a specific week are completed.
 */
const isWeekComplete = (week: WeeklyObjective): boolean => {
  return week.dailyTasks?.length > 0 && week.dailyTasks.every((task) => task.completed);
};

/**
 * Checks if all tasks in a specific month are completed.
 */
const isMonthComplete = (month: MonthlyMilestone): boolean => {
  return (
    month.weeklyObjectives?.length > 0 &&
    month.weeklyObjectives.every((week) => isWeekComplete(week))
  );
};

/**
 * Checks if any week in the plan has exactly 7 daily tasks.
 */
const hasSevenDayWeek = (plan: FullPlan): boolean => {
  return plan.monthlyMilestones.some((month) =>
    month.weeklyObjectives.some((week) => week.dailyTasks?.length === 7)
  );
};

/**
 * Counts completed tasks within a specific month (1-based index).
 */
const countCompletedTasksInMonth = (plan: FullPlan, monthIndex: number): number => {
  const monthData = plan.monthlyMilestones?.[monthIndex - 1];
  if (!monthData) return 0;

  return monthData.weeklyObjectives.reduce((weekCount, week) => {
    return weekCount + (week.dailyTasks?.filter(t => t.completed).length || 0);
  }, 0);
};

/**
 * Checks if the plan is comprehensive (at least 3 months and 10 total weeks).
 */
const isComprehensivePlan = (plan: FullPlan): boolean => {
  const totalMonths = plan.monthlyMilestones?.length || 0;
  const totalWeeks = plan.monthlyMilestones.reduce((count, month) => {
    return count + (month.weeklyObjectives?.length || 0);
  }, 0);

  return totalMonths >= 3 && totalWeeks >= 10;
};

/**
 * Defines the structure for an achievement.
 */
export interface AchievementDefinition {
  id: string; // Unique identifier (e.g., 'first-task')
  name: string; // User-facing name (e.g., "One Small Step")
  description: string; // User-facing description
  // Function to check if the achievement criteria are met based on the plan
  checkCriteria: (plan: FullPlan) => boolean;
}

/**
 * List of all defined achievements in the application.
 * Achievements are checked in the order they appear in this list.
 */
export const achievementDefinitions: AchievementDefinition[] = [
  // --- Task Completion Achievements ---
  {
    id: 'first-task',
    name: 'One Small Step',
    description: 'Completed your first daily task.',
    checkCriteria: (plan) => countCompletedTasks(plan) >= 1,
  },
  {
    id: 'five-tasks',
    name: 'Getting Started',
    description: 'Completed 5 daily tasks.',
    checkCriteria: (plan) => countCompletedTasks(plan) >= 5,
  },
  {
    id: 'ten-tasks',
    name: 'Making Progress',
    description: 'Completed 10 daily tasks.',
    checkCriteria: (plan) => countCompletedTasks(plan) >= 10,
  },
  {
    id: 'twenty-five-tasks',
    name: 'Dedicated Learner',
    description: 'Completed 25 daily tasks.',
    checkCriteria: (plan) => countCompletedTasks(plan) >= 25,
  },
  {
    id: 'fifty-tasks',
    name: 'Halfway There (Maybe!)',
    description: 'Completed 50 daily tasks.',
    checkCriteria: (plan) => countCompletedTasks(plan) >= 50,
  },

  // --- Section Completion Achievements ---
  {
    id: 'first-week-complete',
    name: 'Week Down!',
    description: 'Completed all tasks for your first week.',
    checkCriteria: (plan) =>
      plan.monthlyMilestones?.[0]?.weeklyObjectives?.[0] &&
      isWeekComplete(plan.monthlyMilestones[0].weeklyObjectives[0]),
  },
  {
    id: 'first-month-complete',
    name: 'Month Mastered!',
    description: 'Completed all tasks for your first month.',
    checkCriteria: (plan) =>
      plan.monthlyMilestones?.[0] && isMonthComplete(plan.monthlyMilestones[0]),
  },
  {
    id: 'all-weeks-complete',
    name: 'Weekly Conqueror',
    description: 'Completed all tasks for every week in the plan.',
    checkCriteria: (plan) =>
      plan.monthlyMilestones.every((month) =>
        month.weeklyObjectives.every((week) => isWeekComplete(week))
      ),
  },
  {
    id: 'all-months-complete',
    name: 'Milestone Monarch',
    description: 'Completed all tasks for every month in the plan.',
    checkCriteria: (plan) => plan.monthlyMilestones.every((month) => isMonthComplete(month)),
  },
  {
    id: 'plan-half-complete',
    name: 'Over the Hump',
    description: 'Completed 50% of all tasks in your plan.',
    checkCriteria: (plan) => {
      const total = countTotalTasks(plan);
      return total > 0 && countCompletedTasks(plan) >= total / 2;
    },
  },
  {
    id: 'plan-100-complete',
    name: 'Plan Perfected!',
    description: 'Completed 100% of all tasks in your plan!',
    checkCriteria: (plan) => {
      const total = countTotalTasks(plan);
      return total > 0 && countCompletedTasks(plan) >= total;
    },
  },

  // --- Plan Structure/Goal Achievements ---
  {
    id: 'goal-set',
    name: 'Aiming High',
    description: 'Your plan has a defined goal.',
    checkCriteria: (plan) => !!plan.goal && plan.goal.trim().length > 0,
  },
  {
    id: 'goal-detailed',
    name: 'Clear Vision',
    description: 'Your plan goal is detailed (over 50 characters).',
    checkCriteria: (plan) => plan.goal?.length > 50,
  },
  {
    id: 'plan-packed',
    name: 'Action Packed',
    description: 'Your plan contains over 100 daily tasks.',
    checkCriteria: (plan) => countTotalTasks(plan) > 100,
  },
  {
    id: 'completionist-prep',
    name: 'Ready for Anything',
    description: 'Your plan has more than 80 tasks.', // Encourages bigger plans
    checkCriteria: (plan) => countTotalTasks(plan) > 80,
  },
  {
    id: 'comprehensive-plan',
    name: 'Comprehensive Plan',
    description: 'Your plan spans at least 3 months and 10 weeks.',
    checkCriteria: (plan) => isComprehensivePlan(plan),
  },
  {
    id: 'task-master-week',
    name: 'Weekly Task Master',
    description: 'At least one week in your plan has 7 daily tasks.',
    checkCriteria: (plan) => hasSevenDayWeek(plan),
  },

  // --- Miscellaneous Achievements ---
  {
    id: 'month-1-starter',
    name: 'Month 1 Kickstart',
    description: 'Completed at least one task in the first month.',
    checkCriteria: (plan) => countCompletedTasksInMonth(plan, 1) >= 1,
  },
  {
    id: 'month-2-progress',
    name: 'Month 2 Momentum',
    description: 'Completed at least one task in the second month.',
    checkCriteria: (plan) => countCompletedTasksInMonth(plan, 2) >= 1,
  },
  {
    id: 'month-3-finisher',
    name: 'Month 3 Finisher',
    description: 'Completed at least one task in the third month.',
    checkCriteria: (plan) => countCompletedTasksInMonth(plan, 3) >= 1,
  },
  // TODO: Consider adding more complex ones later if needed (e.g., using chat)
];
