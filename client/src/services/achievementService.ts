import { FullPlan } from '../types/planTypes';
import {
  achievementDefinitions,
  AchievementDefinition,
} from '../config/achievements';

/**
 * Checks the current plan state against all achievement definitions
 * and updates the plan's unlocked achievements map.
 *
 * @param plan The current plan state.
 * @returns An object containing the potentially updated plan with new achievements unlocked,
 *          and an array of achievement definitions that were newly unlocked in this check.
 */
export const checkAndUnlockAchievements = (
  plan: FullPlan
): { updatedPlan: FullPlan; newlyUnlocked: AchievementDefinition[] } => {
  const newlyUnlocked: AchievementDefinition[] = [];
  // Ensure we have a map to work with, even if the plan didn't have one initially
  const currentUnlocked = { ...(plan.unlockedAchievements || {}) };
  let achievementsChanged = false;

  achievementDefinitions.forEach((definition) => {
    // Check only if not already unlocked
    if (!currentUnlocked[definition.id]) {
      try {
        if (definition.checkCriteria(plan)) {
          currentUnlocked[definition.id] = true; // Mark as unlocked
          newlyUnlocked.push(definition); // Add to the list of newly unlocked
          achievementsChanged = true;
        }
      } catch (error) {
        console.error(
          `Error checking achievement criteria for '${definition.id}':`,
          error
        );
        // Optionally handle or log the error further
      }
    }
  });

  // Only create a new plan object if achievements actually changed
  const updatedPlan = achievementsChanged
    ? { ...plan, unlockedAchievements: currentUnlocked }
    : plan;

  return { updatedPlan, newlyUnlocked };
};
