import { NextResponse } from 'next/server';

// Generate a unique ID
const generateId = () => {
  return Math.random().toString(36).substring(2, 11);
};

// Create a plan structure based on the user's goal
const generatePlanFromGoal = async (goal: string, apiKey: string) => {
  // Parse the goal to determine the type of plan needed
  const goalLower = goal.toLowerCase();
  let planTitle = "90-Day Goal Plan";
  
  try {
    // Check API key validity - reject demo-key
    const validApiKey = apiKey && apiKey.length > 10 && apiKey !== 'demo-key';
    
    if (!validApiKey) {
      return {
        success: false,
        error: 'Valid Gemini API key required',
        title: planTitle,
        goal,
        months: []
      };
    }
    
    // Call Gemini API to generate the goals
    console.log('Calling Gemini API to generate plan for goal:', goal);
    
    try {
      // Initialize the Google Gemini API client
      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // First try a simple generation to validate the API key
      try {
        console.log('Testing API key with simple text generation');
        const testModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        await testModel.generateContent("Hello");
        console.log('API key test passed');
      } catch (testError) {
        console.error('API key test failed:', testError);
        throw testError;
      }
      
      // Now proceed with content generation
      console.log('Using model: gemini-2.0-flash-exp');
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      
      // Prompt for Gemini to generate personalized goals
      const prompt = `
Generate a structured 90-day plan for the following goal: "${goal}"

The plan should include:
1. Three months of goals, with unique titles for each month based on the goal's progression
2. Four weeks of goals for each month, with specific weekly focuses
3. Daily tasks for each week (Monday-Sunday) that progress toward the weekly goals

VERY IMPORTANT: Your response MUST contain ONLY valid JSON. Do not include any text before or after the JSON. Do not add markdown code fences or explanation. Return ONLY the raw JSON.

The JSON object must have the following structure:
{
  "months": [
    {
      "title": "Month 1: [DESCRIPTIVE TITLE]",
      "weeks": [
        {
          "title": "Week 1: [SPECIFIC FOCUS]",
          "days": [
            {"title": "Monday", "tasks": [{"title": "Specific task description", "completed": false}]},
            ...and so on for each day
          ]
        },
        ...and so on for each week
      ]
    },
    ...and so on for each month
  ]
}

The month titles MUST include descriptive names after the 'Month X:' format, like 'Month 1: Foundation Building'.
The week titles MUST include specific focus areas after the 'Week X:' format, like 'Week 1: Getting Started'.

Make the goals and tasks specific, actionable, and tailored to the user's stated goal.
`;

      // Call Gemini API and wait for response
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log("Raw Gemini response:", text.substring(0, 500) + "...");
      
      // Parse the JSON response from Gemini
      try {
        // Extract JSON from the response (it might be wrapped in code blocks)
        let jsonStr = text;
        
        // Handle case where response might have markdown code blocks or other text
        if (text.includes('```json')) {
          jsonStr = text.split('```json')[1].split('```')[0].trim();
        } else if (text.includes('```')) {
          jsonStr = text.split('```')[1].split('```')[0].trim();
        }
        
        // Clean up any additional text before or after JSON
        // Look for first { and last } to extract just the JSON portion
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
        }
        
        // Attempt to parse the JSON
        let plan = JSON.parse(jsonStr);
        
        // Ensure the plan has the right structure
        if (!plan.months) {
          plan = { months: [] };
        }
        
        // Add IDs to all elements
        if (Array.isArray(plan.months)) {
          plan.months.forEach((month: any) => {
            month.id = generateId();
            
            if (Array.isArray(month.weeks)) {
              month.weeks.forEach((week: any) => {
                week.id = generateId();
                
                if (Array.isArray(week.days)) {
                  week.days.forEach((day: any) => {
                    day.id = generateId();
                    
                    if (Array.isArray(day.tasks)) {
                      day.tasks.forEach((task: any) => {
                        task.id = generateId();
                        // Ensure completed field exists
                        task.completed = false;
                      });
                    } else {
                      day.tasks = [];
                    }
                  });
                } else {
                  week.days = [];
                }
              });
            } else {
              month.weeks = [];
            }
          });
        }
        
        console.log("Processed plan structure:", 
          JSON.stringify({
            monthCount: plan.months.length,
            sampleMonth: plan.months[0] ? {
              id: plan.months[0].id,
              title: plan.months[0].title,
              weekCount: plan.months[0].weeks?.length || 0
            } : null
          })
        );
        
        return {
          success: true,
          title: planTitle,
          goal,
          months: plan.months
        };
      } catch (parseError) {
        console.error('Error parsing Gemini response:', parseError);
        console.log('Gemini raw response:', text);
        return {
          success: false,
          error: 'Error parsing AI response. Please try again with a clearer goal description.',
          title: planTitle,
          goal,
          months: []
        };
      }
    } catch (apiError: any) {
      console.error('Error calling Gemini API:', apiError);
      
      // Check for specific error messages to provide better feedback
      let errorMessage = 'Failed to connect to Gemini API. Please check your API key.';
      
      if (apiError.message && apiError.message.includes('API key')) {
        errorMessage = 'Invalid API key. Please check your Gemini API key in settings.';
      } else if (apiError.message && apiError.message.includes('quota')) {
        errorMessage = 'API quota exceeded. Please try again later or check your Gemini API usage limits.';
      } else if (apiError.message && apiError.message.includes('PERMISSION_DENIED')) {
        errorMessage = 'API key permission denied. Your API key may not have access to the Gemini models.';
      } else if (apiError.message && apiError.message.includes('not found')) {
        errorMessage = 'Model not found. The Gemini model name may have changed. Please check for updates.';
      }
      
      return {
        success: false,
        error: errorMessage,
        title: planTitle,
        goal,
        months: []
      };
    }
  } catch (error: any) {
    console.error('Error generating plan:', error);
    return {
      success: false,
      error: `Error: ${error.message || 'An unexpected error occurred'}`,
      title: planTitle,
      goal,
      months: []
    };
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { goal, apiKey } = body;
    
    if (!goal) {
      return NextResponse.json(
        { success: false, error: 'No goal provided' },
        { status: 400 }
      );
    }
    
    // Check for valid API key - reject demo-key
    const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY || '';
    const validApiKey = effectiveApiKey && effectiveApiKey.length > 10 && effectiveApiKey !== 'demo-key';
    
    if (!validApiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Valid Gemini API key required. Please enter your API key in settings.' 
      }, { status: 401 });
    }
    
    // Generate plan based on the goal using Gemini API if available
    const result = await generatePlanFromGoal(goal, effectiveApiKey);
    
    // Check if the plan generation was successful
    if (!result.success) {
      console.error("Plan generation failed:", result.error);
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Failed to generate plan' 
      }, { status: 500 });
    }
    
    const plan = result;
    
    // Ensure all necessary IDs exist in the plan structure
    if (plan && plan.months) {
      // Add ID to months if missing
      plan.months.forEach((month: any) => {
        if (!month.id) month.id = generateId();
        
        if (Array.isArray(month.weeks)) {
          // Add ID to weeks if missing
          month.weeks.forEach((week: any) => {
            if (!week.id) week.id = generateId();
            
            if (Array.isArray(week.days)) {
              // Add ID to days if missing
              week.days.forEach((day: any) => {
                if (!day.id) day.id = generateId();
                
                if (Array.isArray(day.tasks)) {
                  // Add ID to tasks if missing
                  day.tasks.forEach((task: any) => {
                    if (!task.id) task.id = generateId();
                  });
                } else {
                  day.tasks = [];
                }
              });
            } else {
              week.days = [];
            }
          });
        } else {
          month.weeks = [];
        }
      });
    }
    
    console.log("Sending plan to client:", JSON.stringify(plan).substring(0, 200) + "...");
    
    return NextResponse.json({ 
      success: true, 
      plan,
      message: `Plan generated for goal: "${goal}"`
    });
  } catch (error: any) {
    console.error('Error processing plan request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to generate plan. There was an unexpected error.'
      },
      { status: 500 }
    );
  }
} 