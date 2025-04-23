import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { FullPlan } from '../types/planTypes'; // Import FullPlan type
import { InteractionMode } from '../types/generalTypes'; // Import InteractionMode

// Base URL for the backend proxy server
const BACKEND_URL = 'http://localhost:3001/api';

// Function to generate the initial 90-day plan via backend proxy
export const generatePlan = async (goal: string): Promise<string> => {
  console.log(`[Client] Sending generate plan request for goal: "${goal}" to backend proxy...`);
  try {
    const response = await fetch(`${BACKEND_URL}/generate-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ goal }), // Send goal in the request body
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle errors returned from the backend API
      throw new Error(data.error || `Backend Error: ${response.status} ${response.statusText}`);
    }

    if (!data.plan) {
      throw new Error("No plan content received from backend.");
    }

    console.log("[Client] Received plan from backend proxy.");
    return data.plan;
  } catch (error) {
    console.error("[Client] Error calling backend proxy (generatePlan):", error);
    // Re-throw a more specific error message if possible
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to generate plan via backend: ${errorMessage}`);
  }
};

// Function for chat interactions via backend proxy
export const chatWithAI = async (
  message: string,
  history: { role: 'user' | 'model'; parts: string }[],
  plan: FullPlan | null, // Add plan as an argument
  mode: InteractionMode // Add mode parameter
): Promise<string> => {
  console.log(`[Client] Sending chat message: "${message}" with mode: ${mode} and plan context to backend proxy...`);
  try {
    const response = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Send message, history, plan, and the current interaction mode
      body: JSON.stringify({ message, history, plan, mode }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Backend Error: ${response.status} ${response.statusText}`);
    }

    if (!data.response) {
      throw new Error("No chat response received from backend.");
    }

    console.log("[Client] Received chat response from backend proxy.");
    return data.response;
  } catch (error) {
    console.error("[Client] Error calling backend proxy (chatWithAI):", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to get chat response via backend: ${errorMessage}`);
  }
};
