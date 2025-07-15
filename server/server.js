require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3001; // Use port 3001 for the backend server

// --- Configuration ---
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.5-flash";

// Gemini 2.5 Flash Configuration Parameters
const GEMINI_CONFIG = {
  // Core generation parameters
  temperature: 0.7,        // Controls randomness (0.0-2.0). Lower = more focused, Higher = more creative
  topK: 40,               // Limits token selection to top K most probable tokens (1-1000)
  topP: 0.95,             // Nucleus sampling - selects from tokens with cumulative probability up to this value (0.0-1.0)
  maxOutputTokens: 8192,  // Maximum tokens in response
  
  // Thinking configuration (Gemini 2.5 Flash feature)
  thinkingConfig: {
    includeThoughts: false, // Set to true to see the model's internal reasoning process
    thinkingBudget: 2048   // Token budget for thinking process (0=disabled, -1=automatic, or specific number)
  },
  
  // Additional parameters for fine-tuning
  frequencyPenalty: 0.0,  // Penalize frequent tokens (0.0-2.0)
  presencePenalty: 0.0,   // Penalize tokens that appear in the text (0.0-2.0)
  
  // For plan generation - more focused
  planGeneration: {
    temperature: 0.5,     // More deterministic for structured plans
    topK: 20,            // More focused token selection
    topP: 0.9,           // Slightly more conservative
    thinkingBudget: 24576 // Maximum thinking budget for comprehensive planning (default max)
  },
  
  // For chat - more conversational
  chatGeneration: {
    temperature: 0.8,     // More creative for conversations
    topK: 50,            // Broader token selection
    topP: 0.95,          // Standard nucleus sampling
    thinkingBudget: 1024 // Moderate thinking for quick responses
  }
};

if (!API_KEY) {
  console.error("GEMINI_API_KEY is not defined in the server's .env file.");
  process.exit(1); // Exit if the key is missing
}

// Initialize Google Generative AI client with generation config
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ 
  model: MODEL_NAME,
  generationConfig: {
    temperature: 0.7, // Controls randomness (0.0-1.0+). Lower = more focused, Higher = more creative
    topK: 40, // Limits token selection to top K most probable tokens
    topP: 0.95, // Nucleus sampling - selects from tokens with cumulative probability up to this value
    maxOutputTokens: 8192, // Maximum tokens in response
    thinkingConfig: {
      includeThoughts: false, // Set to true if you want to see the model's internal reasoning
      thinkingBudget: 2048 // Token budget for thinking process (0=disabled, -1=automatic)
    }
  }
});

// --- Middleware ---
app.use(cors({ 
  origin: ['http://localhost:3000', 'http://localhost:3001'], // Allow requests from React app on both ports
  credentials: true
}));
app.use(express.json()); // Parse JSON bodies

// --- Helper Functions ---

// Real streaming function using Gemini's streaming capabilities
async function streamAIResponse(res, prompt, generationConfig) {
  // Set up streaming headers
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  try {
    const result = await model.generateContentStream(prompt, { generationConfig });
    
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        res.write(chunkText);
      }
    }
    
    res.end();
    console.log("[Server] Successfully streamed AI response.");
  } catch (error) {
    console.error("[Server] Error during streaming:", error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Streaming failed' }));
    } else {
      res.end();
    }
  }
}

// --- API Routes ---

// Endpoint for generating the plan with simulated streaming
app.post('/api/generate-plan', async (req, res) => {
  const { goal } = req.body;

  if (!goal) {
    return res.status(400).json({ error: 'Goal is required in the request body.' });
  }

  try {
    console.log(`[Server] Received /api/generate-plan request for goal: "${goal.substring(0, 50)}..."`);
    
    const fullPrompt = `You are an expert project planner. Create a detailed, actionable 90-day plan to achieve the following goal:
"${goal}"

Structure the plan rigorously using the following Markdown format:

# Goal: [Restate the User's Goal Here]

## Month 1: [Concise Milestone Title for Month 1]
### Week 1: [Objective Title for Week 1 of Month 1]
- Day 1: [Specific, actionable task for Day 1]
- Day 2: [Specific, actionable task for Day 2]
- Day 3: [Specific, actionable task for Day 3]
- Day 4: [Specific, actionable task for Day 4]
- Day 5: [Specific, actionable task for Day 5]
- Day 6: [Specific, actionable task for Day 6]
- Day 7: [Specific, actionable task for Day 7]
### Week 2: [Objective Title for Week 2 of Month 1]
- Day 1: [Task...]
... (Repeat for all 7 days)
### Week 3: [Objective Title for Week 3 of Month 1]
... (Repeat for all 7 days)
### Week 4: [Objective Title for Week 4 of Month 1]
... (Repeat for all 7 days)

## Month 2: [Concise Milestone Title for Month 2]
### Week 1: [Objective Title for Week 1 of Month 2]
... (Repeat structure for 4 weeks and 7 days/week)

## Month 3: [Concise Milestone Title for Month 3]
### Week 1: [Objective Title for Week 1 of Month 3]
... (Repeat structure for 4 weeks and 7 days/week)

Ensure every day within every week has a task assigned. Use the exact headings (# Goal:, ## Month <number>:, ### Week <number>:, - Day <number>:) as shown.`;

    // Use plan generation specific configuration with real streaming
    const planGenerationConfig = {
      temperature: GEMINI_CONFIG.planGeneration.temperature,
      topK: GEMINI_CONFIG.planGeneration.topK,
      topP: GEMINI_CONFIG.planGeneration.topP,
      maxOutputTokens: GEMINI_CONFIG.maxOutputTokens,
      frequencyPenalty: GEMINI_CONFIG.frequencyPenalty,
      presencePenalty: GEMINI_CONFIG.presencePenalty,
      thinkingConfig: {
        includeThoughts: GEMINI_CONFIG.thinkingConfig.includeThoughts,
        thinkingBudget: GEMINI_CONFIG.planGeneration.thinkingBudget
      }
    };

    // Stream the response using real streaming
    await streamAIResponse(res, fullPrompt, planGenerationConfig);

  } catch (error) {
    console.error("[Server] Error calling Google AI Studio API (generatePlan):", error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate plan from AI service.' });
    }
  }
});

// Endpoint for chat interactions with simulated streaming
app.post('/api/chat', async (req, res) => {
  const { message, history, plan } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  console.log(`[Server] Received /api/chat request: "${message.substring(0, 50)}..."`);

  try {
    let systemPrompt = "You are a helpful assistant. Answer the user's questions.";

    // If a plan exists, add it to the system context
    if (plan) {
      try {
        // Attempt to stringify the plan nicely for the AI
        const planString = JSON.stringify(plan, null, 2); // Pretty-print JSON

        // --- MODIFIED SYSTEM PROMPT --- 
        systemPrompt = `You are an AI assistant supporting a user with their 90-day plan.\nCONTEXT:\nHere is their current plan structure:\n${planString}\n\nTASK:\nReview the user's latest message in the context of the chat history and the provided plan.\n1. If the user is asking a question, seeking advice, or making a comment that DOES NOT require changing the plan structure: Respond conversationally.\n2. If the user explicitly asks to modify the plan, change focus, add/remove items, or otherwise requests a structural update: Your response MUST contain ONLY the complete, revised 90-day plan. ABSOLUTELY NO other text, introductions, explanations, or confirmations are allowed before or after the plan. The response MUST start directly with "# Goal:" and follow the precise Markdown structure shown below. Ensure every day has a task.\n\nREQUIRED MARKDOWN FORMAT:\n# Goal: [New Goal Title]\n\n## Month 1: [Milestone Title]\n### Week 1: [Objective Title]\n- Day 1: [Task Description]\n- Day 2: [Task Description]\n...\n(Repeat for all months, weeks, and days)\n\nFAILURE TO FOLLOW THIS FORMAT WILL BREAK THE APPLICATION. Output ONLY the Markdown plan.`;
        // --- END MODIFIED SYSTEM PROMPT ---

        console.log('[Server] Added plan context and specific instructions to chat request.');
      } catch (stringifyError) {
        console.error('[Server] Error stringifying plan for chat context:', stringifyError);
        // Fallback if stringify fails
        systemPrompt = "You are a helpful assistant. The user has a 90-day plan, but there was an issue formatting it for context. Answer the user's questions.";
      }
    } else {
        // If no plan exists yet, keep the simple prompt (or tailor for initial goal clarification if needed)
        systemPrompt = "You are a helpful assistant helping a user define a 90-day goal. Ask clarifying questions if the goal is unclear, otherwise confirm you understand.";
    }

    // Build conversation history for Gemini
    let conversationHistory = [];
    
    // Add history if exists - ensure it starts with 'user' role
    if (history && history.length > 0) {
      conversationHistory = history.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.parts }]
      }));
      
      // Ensure the first message is from user, if not, skip or adjust
      if (conversationHistory.length > 0 && conversationHistory[0].role !== 'user') {
        // If first message is not from user, we'll use generateContent instead
        conversationHistory = [];
      }
    }

    // --- Add Formatting Reminder to User Message if Refining Plan ---
    let currentUserMessageContent = message;
    const formattingReminder = `\n\n[SYSTEM REMINDER: If you are updating the plan based on this message, your response MUST be ONLY the complete, revised plan in the required Markdown format, starting directly with "# Goal:". NO other text is allowed.]`;
    if (plan) {
        currentUserMessageContent += formattingReminder;
        console.log('[Server] Added formatting reminder to user message.');
    }

    // Combine system prompt with user message for Gemini
    const fullPrompt = `${systemPrompt}\n\nUser: ${currentUserMessageContent}`;

    // Start a chat session if there's valid history, otherwise use generateContent
    let finalContent;
    if (conversationHistory.length > 0) {
      try {
        const chat = model.startChat({
          history: conversationHistory,
        });
        const result = await chat.sendMessage(currentUserMessageContent, {
          generationConfig: {
            temperature: GEMINI_CONFIG.chatGeneration.temperature,
            topK: GEMINI_CONFIG.chatGeneration.topK,
            topP: GEMINI_CONFIG.chatGeneration.topP,
            maxOutputTokens: GEMINI_CONFIG.maxOutputTokens,
            frequencyPenalty: GEMINI_CONFIG.frequencyPenalty,
            presencePenalty: GEMINI_CONFIG.presencePenalty,
            thinkingConfig: {
              includeThoughts: GEMINI_CONFIG.thinkingConfig.includeThoughts,
              thinkingBudget: GEMINI_CONFIG.chatGeneration.thinkingBudget
            }
          }
        });
        const response = await result.response;
        finalContent = response.text();
      } catch (historyError) {
        console.log('[Server] Chat history validation failed, falling back to generateContent:', historyError.message);
        // Fallback to generateContent if history is invalid
        const result = await model.generateContent(fullPrompt, {
          generationConfig: {
            temperature: GEMINI_CONFIG.chatGeneration.temperature,
            topK: GEMINI_CONFIG.chatGeneration.topK,
            topP: GEMINI_CONFIG.chatGeneration.topP,
            maxOutputTokens: GEMINI_CONFIG.maxOutputTokens,
            frequencyPenalty: GEMINI_CONFIG.frequencyPenalty,
            presencePenalty: GEMINI_CONFIG.presencePenalty,
            thinkingConfig: {
              includeThoughts: GEMINI_CONFIG.thinkingConfig.includeThoughts,
              thinkingBudget: GEMINI_CONFIG.chatGeneration.thinkingBudget
            }
          }
        });
        const response = await result.response;
        finalContent = response.text();
      }
    } else {
      const result = await model.generateContent(fullPrompt, {
        generationConfig: {
          temperature: GEMINI_CONFIG.chatGeneration.temperature,
          topK: GEMINI_CONFIG.chatGeneration.topK,
          topP: GEMINI_CONFIG.chatGeneration.topP,
          maxOutputTokens: GEMINI_CONFIG.maxOutputTokens,
          frequencyPenalty: GEMINI_CONFIG.frequencyPenalty,
          presencePenalty: GEMINI_CONFIG.presencePenalty,
          thinkingConfig: {
            includeThoughts: GEMINI_CONFIG.thinkingConfig.includeThoughts,
            thinkingBudget: GEMINI_CONFIG.chatGeneration.thinkingBudget
          }
        }
      });
      const response = await result.response;
      finalContent = response.text();
    }

    if (!finalContent) {
      throw new Error("No content received from AI chat.");
    }

    console.log("[Server] Successfully received chat response from Google AI Studio.");
    
    // --- Attempt to extract Markdown plan if refining ---
    if (plan && finalContent.includes('# Goal:')) { // Check if plan context existed AND '# Goal:' is in the response
        const planStartIndex = finalContent.indexOf('# Goal:');
        if (planStartIndex !== -1) {
            const extractedPlan = finalContent.substring(planStartIndex);
            // Basic check: Does it look like a plan? (Has month/week markers)
            if (extractedPlan.includes('## Month') && extractedPlan.includes('### Week')) {
                 console.log('[Server] Extracted potential Markdown plan from AI response.');
                 finalContent = extractedPlan; // Use only the extracted part
            } else {
                 console.log('[Server] Found "# Goal:" but response lacks other plan markers. Sending raw response.');
            }
        } else {
             console.log('[Server] Plan context existed but "# Goal:" not found in response. Sending raw response.');
        }
    } else if (plan) {
         console.log('[Server] Plan context existed but "# Goal:" not found in response. Sending raw response.');
    }
    // --- End extraction logic ---

    // Stream the response using a simple text stream
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    
    res.write(finalContent);
    res.end();
    console.log("[Server] Successfully sent chat response.");

  } catch (error) {
    console.error("[Server] Error calling Google AI Studio API (chat):", error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to get chat response from AI service.' });
    }
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Backend proxy server listening on http://localhost:${PORT}`);
});
