import { FullPlan } from '../types/planTypes';

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

// Function to generate the initial 90-day plan via backend proxy with streaming
export const generatePlan = async (
  goal: string, 
  onChunk?: (chunk: string) => void
): Promise<string> => {
  console.log(`[Client] Sending generate plan request for goal: "${goal}" to backend proxy...`);
  
  const url = `${BACKEND_URL}/generate-plan`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ goal }),
  });

  if (!response.ok) {
    // For streaming endpoints, try to get error from response body
    const errorText = await response.text();
    try {
      const errorData = JSON.parse(errorText);
      throw new Error(errorData.error || `Backend Error: ${response.status} ${response.statusText}`);
    } catch {
      throw new Error(`Backend Error: ${response.status} ${response.statusText}`);
    }
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  if (!reader) {
    throw new Error("No response stream available");
  }

  let fullContent = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      fullContent += chunk;
      
      // Call the chunk callback if provided
      if (onChunk) {
        onChunk(chunk);
      }
    }
    
    console.log("[Client] Received streamed plan from backend proxy.");
    return fullContent;
    
  } catch (error) {
    console.error("[Client] Error during plan streaming:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to generate plan via backend: ${errorMessage}`);
  } finally {
    reader.releaseLock();
  }
};

// NOTE: Ensure this history type matches exactly what the backend expects.
type GeminiHistoryItem = { role: 'user' | 'model'; parts: string };

// Function for chat interactions via backend proxy with streaming
export const chatWithAI = async (
  message: string,
  history: GeminiHistoryItem[], 
  plan: FullPlan | null,
  onChunk?: (chunk: string) => void
): Promise<string> => {
  console.log(`[Client] Sending chat message: "${message}" with plan context to backend proxy...`);
  
  const url = `${BACKEND_URL}/chat`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      history,
      plan
    }),
  });

  if (!response.ok) {
    // For streaming endpoints, try to get error from response body
    const errorText = await response.text();
    try {
      const errorData = JSON.parse(errorText);
      throw new Error(errorData.error || `Backend Error: ${response.status} ${response.statusText}`);
    } catch {
      throw new Error(`Backend Error: ${response.status} ${response.statusText}`);
    }
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  if (!reader) {
    throw new Error("No response stream available");
  }

  let fullContent = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      fullContent += chunk;
      
      // Call the chunk callback if provided
      if (onChunk) {
        onChunk(chunk);
      }
    }
    
    console.log("[Client] Received streamed chat response from backend proxy.");
    return fullContent;
    
  } catch (error) {
    console.error("[Client] Error during chat streaming:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to get chat response via backend: ${errorMessage}`);
  } finally {
    reader.releaseLock();
  }
};
