// src/services/supabaseService.ts
import { supabase } from '../supabaseConfig';
import { FullPlan } from '../types/planTypes'; 
import { ChatMessage } from '../types/chatTypes'; 

// --- Supabase Service Functions --- 

// Type definition for the plan data stored in Supabase
interface PlanDocument extends FullPlan {
  created_at: string; // Supabase uses ISO string for timestamps
  chat_history?: ChatMessage[]; // Optional: Store chat history
  interaction_mode?: 'plan' | 'chat'; // Optional: Store the mode ('plan' or 'chat')
}

// Type definition for plan data returned with Supabase ID
export type PlanWithId = PlanDocument & { id: string };

/**
 * Saves a new plan document to Supabase.
 * @param userId - The authenticated user's ID.
 * @param dataToSave - The plan data to save, including optional chat history and interaction mode.
 * @returns The ID of the newly created plan document.
 */
export const savePlan = async (userId: string, dataToSave: Partial<PlanDocument>): Promise<string> => {
  if (!userId) throw new Error("User must be logged in to save a plan.");
  if (!dataToSave || !dataToSave.goal) throw new Error("Plan data is invalid.");

  try {
    // Transform camelCase properties to snake_case for database
    const transformedData = {
      ...dataToSave,
      monthly_milestones: dataToSave.monthlyMilestones, // Transform monthlyMilestones to monthly_milestones
      chat_history: dataToSave.chatHistory, // Transform chatHistory to chat_history
      interaction_mode: dataToSave.interactionMode, // Transform interactionMode to interaction_mode
      achievements: dataToSave.unlockedAchievements, // Transform unlockedAchievements to achievements
    };

    // Remove the camelCase properties to avoid conflicts
    delete transformedData.monthlyMilestones;
    delete transformedData.chatHistory;
    delete transformedData.interactionMode;
    delete transformedData.unlockedAchievements;

    // Insert the plan into the 'plans' table
    const { data, error } = await supabase
      .from('plans')
      .insert([
        {
          user_id: userId,
          ...transformedData,
          created_at: new Date().toISOString()
        }
      ])
      .select('id')
      .single();

    if (error) {
      console.error("Supabase error:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data?.id) {
      throw new Error("Failed to get plan ID from database response");
    }

    console.log('Plan saved successfully with ID:', data.id);
    return data.id;
  } catch (error) {
    console.error("Error saving plan to Supabase:", error);
    throw new Error(`Failed to save plan: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Retrieves all plans saved by a specific user, ordered by goal (ascending) and creation date (newest first).
 * @param userId - The authenticated user's ID.
 * @returns A promise that resolves to an array of plan objects, each including its Supabase ID.
 */
export const getUserPlans = async (userId: string): Promise<(PlanWithId)[]> => {
  if (!userId) throw new Error("User ID is required to fetch plans.");

  try {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', userId)
      .order('goal', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    const plans: PlanWithId[] = data.map((plan) => ({
      ...plan,
      id: plan.id,
      // Transform snake_case back to camelCase for frontend
      monthlyMilestones: plan.monthly_milestones,
      chatHistory: plan.chat_history,
      interactionMode: plan.interaction_mode,
      unlockedAchievements: plan.achievements,
    }));

    console.log(`Fetched ${plans.length} plans for user ${userId}`);
    return plans;
  } catch (error) {
    console.error("Error fetching user plans from Supabase:", error);
    throw new Error("Failed to fetch plans.");
  }
};

/**
 * Deletes a specific plan document from Supabase.
 * @param userId - The authenticated user's ID.
 * @param planId - The ID of the plan document to delete.
 * @returns A promise that resolves when the deletion is complete.
 */
export const deletePlan = async (userId: string, planId: string): Promise<void> => {
  if (!userId || !planId) throw new Error("User ID and Plan ID are required to delete a plan.");

  try {
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', planId)
      .eq('user_id', userId); // Ensure user can only delete their own plans

    if (error) {
      console.error("Supabase error:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log(`Plan with ID ${planId} deleted successfully for user ${userId}.`);
  } catch (error) {
    console.error("Error deleting plan from Supabase:", error);
    throw new Error("Failed to delete plan.");
  }
};

/**
 * Deletes all plan documents associated with a specific goal for a user.
 * @param userId - The authenticated user's ID.
 * @param goal - The goal string to match for deletion.
 * @returns A promise that resolves when the batch deletion is complete.
 */
export const deletePlansByGoal = async (userId: string, goal: string): Promise<void> => {
  if (!userId || !goal) throw new Error("User ID and Goal are required for batch deletion.");

  try {
    const { data, error } = await supabase
      .from('plans')
      .delete()
      .eq('user_id', userId)
      .eq('goal', goal)
      .select('id');

    if (error) {
      console.error("Supabase error:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    const deletedCount = data?.length || 0;
    
    if (deletedCount === 0) {
      console.log(`No plans found with goal "${goal}" for user ${userId} to delete.`);
      return;
    }

    console.log(`Successfully deleted ${deletedCount} plans with goal "${goal}" for user ${userId}.`);

  } catch (error) {
    console.error("Error batch deleting plans by goal from Supabase:", error);
    throw new Error("Failed to batch delete plans by goal.");
  }
};
