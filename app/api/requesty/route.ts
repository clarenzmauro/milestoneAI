import { NextResponse } from 'next/server';

// Proxy function to forward requests to Requesty.ai
const proxyToRequesty = async (messages: any[], apiKey: string) => {
  try {
    console.log('Proxying request to Requesty.ai with messages:', messages.length);
    
    // Format the request using the OpenAI chat completions format
    const requestBody = {
      model: "google/gemini-2.0-flash-exp", // Specify the model
      messages: messages
    };
    
    console.log('Request body:', JSON.stringify(requestBody).substring(0, 200) + '...');
    
    const response = await fetch('https://router.requesty.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Requesty.ai API error:', response.status, errorText);
      return {
        success: false,
        error: `Requesty.ai API returned status ${response.status}: ${errorText}`
      };
    }
    
    const data = await response.json();
    console.log('Requesty.ai API response:', JSON.stringify(data).substring(0, 200) + '...');
    
    return {
      success: true,
      data: data
    };
  } catch (error: any) {
    console.error('Error calling Requesty.ai:', error);
    
    let errorMessage = 'Failed to connect to Requesty.ai API';
    
    if (error.message) {
      errorMessage = `Error: ${error.message}`;
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
    
    const effectiveApiKey = apiKey || process.env.REQUESTY_API_KEY || '';
    
    if (!effectiveApiKey || effectiveApiKey.length < 10) {
      console.log('Invalid API key provided');
      return NextResponse.json({ 
        success: false, 
        error: 'Valid Requesty.ai API key required. Please enter your API key in settings.' 
      }, { status: 401 });
    }
    
    console.log('Calling Requesty.ai API');
    const result = await proxyToRequesty(messages, effectiveApiKey);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error processing API request:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
} 