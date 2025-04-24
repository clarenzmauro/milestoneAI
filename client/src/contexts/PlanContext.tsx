import React, { createContext, useState, useContext, ReactNode } from 'react';
import { generatePlan as apiGeneratePlan } from '../services/aiService';
import { FullPlan } from '../types/planTypes';
import { parsePlanString } from '../utils/planParser';
import { useAuth } from './AuthContext';
import { savePlan } from '../services/firestoreService';
import { ChatMessage } from '../types/chatTypes';
import { InteractionMode } from '../types/generalTypes';

// 1. Define the shape of the context data
interface IPlanContext {
  plan: FullPlan | null;
  isLoading: boolean;
  error: string | null;
  currentChatHistory: ChatMessage[];
  currentInteractionMode: InteractionMode;
  generateNewPlan: (goal: string, chatHistory: ChatMessage[], interactionMode: InteractionMode) => Promise<void>;
  setPlanFromString: (planString: string, originalGoal: string | undefined, chatHistory: ChatMessage[], interactionMode: InteractionMode) => Promise<boolean>;
  setPlan: (loadedPlan: FullPlan, chatHistory?: ChatMessage[], interactionMode?: InteractionMode) => void;
  saveCurrentPlan: () => Promise<void>;
  toggleTaskCompletion: (monthIndex: number, weekIndex: number, taskDay: number) => Promise<void>;
  resetPlanState: () => void;
}

// 2. Create the Context
const PlanContext = createContext<IPlanContext | undefined>(undefined);

// 3. Create the Provider Component
interface PlanProviderProps {
  children: ReactNode;
}

export const PlanProvider: React.FC<PlanProviderProps> = ({ children }) => {
  const [plan, setPlanState] = useState<FullPlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentChatHistory, setCurrentChatHistory] = useState<ChatMessage[]>([]);
  const [currentInteractionMode, setCurrentInteractionMode] = useState<InteractionMode>('chat'); // Default mode
  const { user } = useAuth();

  // Function to reset all relevant plan states
  const resetPlanState = () => {
    console.log('[PlanContext] Resetting plan state.');
    setPlanState(null);
    setIsLoading(false);
    setError(null);
    setCurrentChatHistory([]);
    setCurrentInteractionMode('chat'); // Reset to default mode
  };

  // Function to be called by components to generate/update the plan
  const generateNewPlan = async (goal: string, chatHistory: ChatMessage[], interactionMode: InteractionMode) => {
    const trimmedGoal = goal.trim();
    if (!trimmedGoal) {
      setError('Goal cannot be empty.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setPlanState(null);
    setCurrentChatHistory(chatHistory); // Store history
    setCurrentInteractionMode(interactionMode); // Store mode

    try {
      const rawPlanString = await apiGeneratePlan(trimmedGoal);
      const parsedPlan = parsePlanString(rawPlanString, trimmedGoal);

      if (parsedPlan) {
        setPlanState(parsedPlan);
        // setCurrentChatHistory and setCurrentInteractionMode already set

        // --- Auto-save if user is logged in --- (Use the saveCurrentPlan logic)
        if (user) {
           // Construct payload for saving
            const planToSave: FullPlan = {
                ...parsedPlan,
                chatHistory: chatHistory,       // Include metadata for saving
                interactionMode: interactionMode,
            };
          try {
            console.log('[PlanContext] Auto-saving newly generated plan for user:', user.uid);
            await savePlan(user.uid, planToSave);
            console.log('[PlanContext] Auto-save successful.');
          } catch (saveError) {
            console.error('[PlanContext] Auto-save failed:', saveError);
          }
        }
        // --- End auto-save ---

      } else {
        console.error('Failed to parse the generated plan string. Raw string:', rawPlanString);
        setError('AI generated a plan, but it could not be structured correctly.');
        setPlanState(null);
        // Clear metadata if plan generation fails?
        // setCurrentChatHistory([]);
        // setCurrentInteractionMode('chat');
      }

    } catch (err) {
      console.error('-----------------------------------------');
      console.error('Caught error during plan generation:');
      console.error('Error Object:', err);
      if (err instanceof Error) {
          console.error('Error Message:', err.message);
          console.error('Error Stack:', err.stack);
          setError(`Failed to generate plan: ${err.message}`);
      } else {
          setError('Failed to generate plan due to an unknown error.');
      }
      console.error('-----------------------------------------');
      setPlanState(null);
       // Clear metadata on error
       setCurrentChatHistory([]);
       setCurrentInteractionMode('chat');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to parse a string and update the plan state
  const setPlanFromString = async (planString: string, originalGoal: string | undefined, chatHistory: ChatMessage[], interactionMode: InteractionMode): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    // Store metadata first
    setCurrentChatHistory(chatHistory);
    setCurrentInteractionMode(interactionMode);
    try {
      console.log('[PlanContext] Attempting to parse plan string for update...');
      const goalForParsing = plan?.goal || originalGoal || 'Updated Plan';
      const parsedPlan = parsePlanString(planString, goalForParsing);

      if (parsedPlan) {
        console.log('[PlanContext] Plan string parsed successfully. Updating state.');
        setPlanState(parsedPlan);
        setIsLoading(false);

        // --- Auto-save updated plan if user is logged in --- (Use saveCurrentPlan logic)
        if (user) {
           // Construct payload for saving
            const planToSave: FullPlan = {
                ...parsedPlan,
                chatHistory: chatHistory,       // Include metadata for saving
                interactionMode: interactionMode,
            };
          try {
            console.log('[PlanContext] Auto-saving updated plan for user:', user.uid);
            await savePlan(user.uid, planToSave);
            console.log('[PlanContext] Updated plan auto-save successful.');
          } catch (saveError) {
            console.error('[PlanContext] Updated plan auto-save failed:', saveError);
            // Log error, but don't interrupt user flow
          }
        }
        // --- End auto-save ---

        return true;
      } else {
        console.error('[PlanContext] Failed to parse the updated plan string. String:', planString);
        setError('Received an AI response, but it could not be structured into an updated plan.');
        setIsLoading(false);
        // Optionally clear metadata if parse fails
        // setCurrentChatHistory([]);
        // setCurrentInteractionMode('chat');
        return false;
      }
    } catch (parseError) {
        console.error('[PlanContext] Error during plan string parsing:', parseError);
        setError('An error occurred while trying to structure the updated plan.');
        setIsLoading(false);
        // Clear metadata on error
        setCurrentChatHistory([]);
        setCurrentInteractionMode('chat');
        return false;
    }
  };

  // Function to directly set the plan state, usually when loading a saved plan
  const setPlan = (loadedPlan: FullPlan, chatHistory?: ChatMessage[], interactionMode?: InteractionMode) => {
    console.log('[PlanContext] Setting plan directly:', loadedPlan.goal);
    // Separate core plan data from metadata before setting state
    const { chatHistory: loadedHistory, interactionMode: loadedMode, ...corePlanData } = loadedPlan;

    setPlanState(corePlanData); // Set only core plan data
    setCurrentChatHistory(chatHistory ?? loadedHistory ?? []); // Set history from args or loaded data or default
    setCurrentInteractionMode(interactionMode ?? loadedMode ?? 'chat'); // Set mode from args or loaded data or default

    setError(null); // Clear any previous errors when setting a new plan
    setIsLoading(false); // Ensure loading is false
  };

  // Function to save the current plan state using the context's state
  const saveCurrentPlan = async () => {
    if (!user) {
      console.log('[PlanContext] User not logged in, cannot save plan.');
      // Optionally set an error
      setError('You must be logged in to save.');
      return;
    }
    if (!plan) {
      console.log('[PlanContext] No active plan to save.');
      // Optionally set an error
      // setError('No plan to save.');
      return;
    }

    // Combine core plan with current metadata state for saving
    const planToSave: FullPlan = {
        ...plan,
        chatHistory: currentChatHistory, // Use state variable
        interactionMode: currentInteractionMode, // Use state variable
    };

    console.log(`[PlanContext] Attempting to save current plan (${planToSave.goal}) with mode: ${planToSave.interactionMode}`);
    try {
      await savePlan(user.uid, planToSave);
      console.log('[PlanContext] Current plan state saved successfully.');
    } catch (saveError) {
      console.error('[PlanContext] Failed to save current plan state:', saveError);
      setError('Failed to save the current plan progress.'); // Set an error for the user
      // Re-throw or handle as needed
    }
  };

  // Function to toggle the completion status of a specific daily task
  const toggleTaskCompletion = async (monthIndex: number, weekIndex: number, taskDay: number) => {
    if (!plan) return; // No plan loaded

    // Create a deep copy to avoid direct state mutation
    const updatedPlan = JSON.parse(JSON.stringify(plan)) as FullPlan;

    try {
      const task = updatedPlan.monthlyMilestones?.[monthIndex]?.weeklyObjectives?.[weekIndex]?.dailyTasks?.find(t => t.day === taskDay);

      if (task) {
        task.completed = !task.completed;
        console.log(`[PlanContext] Toggled task completion: Month ${monthIndex + 1}, Week ${weekIndex + 1}, Day ${taskDay} to ${task.completed}`);
        setPlanState(updatedPlan); // Update local state immediately for responsiveness

        // Persist the change if user is logged in using saveCurrentPlan logic
        if (user) {
           // Combine the *updated* core plan with the *current* metadata from state
            const planToSave: FullPlan = {
                ...updatedPlan, // Use the locally modified plan
                chatHistory: currentChatHistory, // Use metadata from state
                interactionMode: currentInteractionMode, // Use metadata from state
            };
           try {
               console.log('[PlanContext] Saving plan after task toggle for user:', user.uid);
               await savePlan(user.uid, planToSave);
               console.log('[PlanContext] Saved plan after task toggle.');
           } catch (saveError) {
                console.error('[PlanContext] Save after task toggle failed:', saveError);
                // Revert optimistic UI update on save failure
                setPlanState(plan); // Revert to the original plan state
                setError('Failed to save task update. Please try again.');
           }
        }
      } else {
        console.error(`[PlanContext] Task not found for toggling: Month ${monthIndex + 1}, Week ${weekIndex + 1}, Day ${taskDay}`);
      }
    } catch (error) {
        // This catch block likely handles errors in the JSON parse/stringify or finding the task
        console.error('[PlanContext] Error toggling task completion (local operation):', error);
        setError('An internal error occurred while updating the task.');
        // No need to revert here as the state wasn't successfully updated before saving attempt
    }
  };

  // Value object provided by the context
  const contextValue: IPlanContext = {
    plan,
    isLoading,
    error,
    currentChatHistory, // Provide metadata state
    currentInteractionMode, // Provide metadata state
    generateNewPlan,
    setPlanFromString,
    setPlan,
    saveCurrentPlan, // Updated function
    toggleTaskCompletion, // Updated function
    resetPlanState, // Expose reset function
  };

  return (
    <PlanContext.Provider value={contextValue}>
      {children}
    </PlanContext.Provider>
  );
};

// 4. Create a custom hook for easy consumption
export const usePlan = (): IPlanContext => {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
};
