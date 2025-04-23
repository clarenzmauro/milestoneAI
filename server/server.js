require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3001; // Use port 3001 for the backend server

// --- Configuration ---
const API_KEY = process.env.REQUESTY_API_KEY;
const BASE_URL = "https://router.requesty.ai/v1";
const MODEL_NAME = "google/gemini-2.0-flash-exp";

if (!API_KEY) {
  console.error("REQUESTY_API_KEY is not defined in the server's .env file.");
  process.exit(1); // Exit if the key is missing
}

// Initialize OpenAI client (server-side)
const client = new OpenAI({
  apiKey: API_KEY,
  baseURL: BASE_URL,
  // No dangerouslyAllowBrowser here!
});

// --- Middleware ---
app.use(cors({ origin: 'http://localhost:3000' })); // Allow requests from React app
app.use(express.json()); // Parse JSON bodies

// --- API Routes ---

// Endpoint for generating the plan
app.post('/api/generate-plan', async (req, res) => {
  const { goal } = req.body;

  if (!goal) {
    return res.status(400).json({ error: 'Goal is required in the request body.' });
  }

  const prompt = `
    You are an expert project planner. Create a detailed, actionable 90-day plan to achieve the following goal:
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

    Ensure every day within every week has a task assigned. Use the exact headings (# Goal:, ## Month <number>:, ### Week <number>:, - Day <number>:) as shown.
  `;

  const messages = [
    { role: "system", content: "You are an expert project planner." },
    { role: "user", content: prompt }
  ];

  try {
    console.log(`[Server] Received /api/generate-plan request for goal: "${goal.substring(0, 50)}..."`);
    const response = await client.chat.completions.create({
      model: MODEL_NAME,
      messages: messages,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content received from AI.");
    }
    console.log("[Server] Successfully received plan from Requesty.ai.");
    res.json({ plan: content }); // Send the plan back to the client

  } catch (error) {
    console.error("[Server] Error calling Requesty.ai API (generatePlan):", error);
    res.status(500).json({ error: 'Failed to generate plan from AI service.' });
  }
});

// Endpoint for chat interactions
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

    // Convert history to OpenAI format (model -> assistant)
    let currentUserMessageContent = message;

    // --- Add Formatting Reminder to User Message if Refining Plan ---
    const formattingReminder = `\n\n[SYSTEM REMINDER: If you are updating the plan based on this message, your response MUST be ONLY the complete, revised plan in the required Markdown format, starting directly with "# Goal:". NO other text is allowed.]`;
    if (plan) {
        currentUserMessageContent += formattingReminder;
        console.log('[Server] Added formatting reminder to user message.');
    }
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map((msg) => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.parts
      })),
      { role: 'user', content: currentUserMessageContent }
    ];

    const response = await client.chat.completions.create({
      model: MODEL_NAME,
      messages: messages,
    });

        let finalContent = response.choices[0]?.message?.content;
        if (!finalContent) {
          throw new Error("No content received from AI chat.");
        }
    
        console.log("[Server] Successfully received chat response from Requesty.ai.");
    
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
    
        res.json({ response: finalContent }); // Send the (potentially modified) response back

  } catch (error) {
    console.error("[Server] Error calling Requesty.ai API (chat):", error);
    res.status(500).json({ error: 'Failed to get chat response from AI service.' });
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Backend proxy server listening on http://localhost:${PORT}`);
});