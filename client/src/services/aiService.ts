import { FullPlan } from '../types/planTypes';
import { InteractionMode } from '../types/generalTypes';

// Base URL from environment variable or default to localhost
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001/api';

/**
 * Reusable fetch helper for backend API calls.
 * Handles common logic like headers, stringifying body, checking response status, and parsing JSON.
 * Throws a formatted error on failure.
 */
async function _fetchAPI<T>(endpoint: string, body: object): Promise<T> {
  const url = `${BACKEND_URL}/${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  // Attempt to parse JSON regardless of status to potentially get error details
  let data;
  try {
    data = await response.json();
  } catch (jsonError) {
    // If JSON parsing fails AND status is bad, throw based on status
    if (!response.ok) {
      throw new Error(`Backend Error: ${response.status} ${response.statusText} at ${url}`);
    }
    // If JSON parsing fails but status is ok, something else is wrong
    throw new Error(`Failed to parse JSON response from ${url}, status: ${response.status}`);
  }

  if (!response.ok) {
    // Use error message from backend if available, otherwise use status text
    throw new Error(data?.error || `Backend Error: ${response.status} ${response.statusText} at ${url}`);
  }

  return data;
}

// Function to generate the initial 90-day plan via backend proxy
export const generatePlan = async (goal: string): Promise<string> => {
  console.log(`[Client] Sending generate plan request for goal: "${goal}" to backend proxy...`);
  try {
    // Use the fetch helper
    const data = await _fetchAPI<{ plan?: string }>('generate-plan', { goal });

    if (!data.plan) {
      throw new Error("No plan content received from backend.");
    }

    console.log("[Client] Received plan from backend proxy.");
    return data.plan;
  } catch (error) {
    console.error("[Client] Error calling backend proxy (generatePlan):", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    // Re-throw error with context
    throw new Error(`Failed to generate plan via backend: ${errorMessage}`);
  }
};

// NOTE: Ensure this history type matches exactly what the backend expects.
// If the backend uses OpenAI format, this might need adjustment or conversion.
type GeminiHistoryItem = { role: 'user' | 'model'; parts: string };

// Function for chat interactions via backend proxy
export const chatWithAI = async (
  message: string,
  history: GeminiHistoryItem[], // Use specific type alias
  plan: FullPlan | null,
  mode: InteractionMode
): Promise<string> => {
  console.log(`[Client] Sending chat message: "${message}" with mode: ${mode} and plan context to backend proxy...`);
  try {
    // Use the fetch helper
    const data = await _fetchAPI<{ response?: string }>('chat', {
      message,
      history,
      plan,
      mode
    });

    if (!data.response) {
      throw new Error("No chat response received from backend.");
    }

    console.log("[Client] Received chat response from backend proxy.");
    return data.response;
  } catch (error) {
    console.error("[Client] Error calling backend proxy (chatWithAI):", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    // Re-throw error with context
    throw new Error(`Failed to get chat response via backend: ${errorMessage}`);
  }
};
