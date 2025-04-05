import { NextResponse } from 'next/server';

const generateGeminiResponse = async (messages: any[], apiKey: string) => {
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
    
    // Now proceed with chat functionality
    console.log('Using model: gemini-2.0-flash-exp');
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    // Format messages for Gemini API
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));
    
    // Create a chat session with system prompt for general assistant
    const systemPrompt = "You are a helpful assistant for the 'Achieve Your Goals in 90 Days' application. You can help users with general questions about goal setting, productivity, and using the application features. Be supportive, practical, and motivational in your responses. \n\nIf the user asks you to create a plan or requests a structured 90-day plan, respond with a JSON object containing the plan structure with the exact format: \n{\"months\":[{\"title\":\"Month 1: [Title]\",\"weeks\":[{\"title\":\"Week 1: [Title]\",\"days\":[{\"title\":\"Monday\",\"tasks\":[{\"title\":\"[Task description]\",\"completed\":false}]}]}]}]}\n\nOnly when returning JSON for a plan, make sure to follow this exact format without additional text before or after the JSON.";
    
    // Ensure the first message has user role as required by Gemini API
    const history = [];
    
    // Add system prompt as the first user message if needed
    if (formattedMessages.length === 0 || formattedMessages[0].role !== 'user') {
      history.push({ role: 'user', parts: [{ text: 'Hello, I need help with goal setting.' }] });
      history.push({ role: 'model', parts: [{ text: systemPrompt }] });
    }
    
    // Add the rest of the conversation history
    if (formattedMessages.length > 1) {
      history.push(...formattedMessages.slice(0, -1));
    }
    
    const chat = model.startChat({
      history: history,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
      }
    });
    
    // Get the last user message
    const lastUserMessage = messages.findLast(msg => msg.role === 'user')?.content || '';
    
    try {
      // Send the message to Gemini and get the response
      const result = await chat.sendMessage(lastUserMessage);
      const response = await result.response;
      const responseText = response.text();
      
      return {
        success: true,
        response: responseText
      };
    } catch (apiCallError: any) {
      console.error('Error during Gemini API call:', apiCallError);
      let errorMessage = 'Failed to generate response from Gemini API';
      
      // Determine specific error type
      if (apiCallError.message && apiCallError.message.includes('API key')) {
        errorMessage = 'Invalid API key. Please check your Gemini API key in settings.';
      } else if (apiCallError.message && apiCallError.message.includes('quota')) {
        errorMessage = 'API quota exceeded. Please try again later or check your Gemini API usage limits.';
      } else if (apiCallError.message && apiCallError.message.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (apiCallError.message && apiCallError.message.includes('not found')) {
        errorMessage = 'Model not found. The Gemini model name may have changed. Please check for updates.';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  } catch (error: any) {
    console.error('Error generating response:', error);
    
    // Check for specific error messages to provide better feedback
    let errorMessage = `Error: ${error.message || 'Failed to generate response'}`;
    
    if (error.message && error.message.includes('API key')) {
      errorMessage = 'Invalid API key. Please check your Gemini API key in settings.';
    } else if (error.message && error.message.includes('quota')) {
      errorMessage = 'API quota exceeded. Please try again later or check your Gemini API usage limits.';
    } else if (error.message && error.message.includes('PERMISSION_DENIED')) {
      errorMessage = 'API key permission denied. Your API key may not have access to the Gemini models.';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

export async function POST(request: Request) {
  try {
    const { messages, apiKey } = await request.json();
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid messages format' 
      }, { status: 400 });
    }
    
    // Use environment API key as fallback if available, but reject demo-key
    const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY || '';
    const validApiKey = effectiveApiKey && effectiveApiKey.length > 10 && effectiveApiKey !== 'demo-key';
    
    if (!validApiKey) {
      console.log('Invalid API key provided:', effectiveApiKey ? effectiveApiKey.substring(0, 5) + '...' : 'no key');
      return NextResponse.json({ 
        success: false, 
        error: 'Valid Gemini API key required. Please enter your API key in settings.' 
      }, { status: 401 });
    }
    
    console.log('Calling Gemini API with valid key format, first 5 chars:', effectiveApiKey.substring(0, 5));
    const result = await generateGeminiResponse(messages, effectiveApiKey);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error processing chat request:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
} 