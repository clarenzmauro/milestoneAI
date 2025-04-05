import React, { useState, useEffect } from 'react';
import { Settings, MessageSquare, ChevronLeft, ChevronRight, WifiOff, Wifi, List, MessageCircle, LogIn, LogOut, User } from 'lucide-react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Logo from './Logo';
import UserPlans from './UserPlans';

// Static variable to track if we've already performed an API test in this session
let hasTestedApiInSession = false;

interface ChatSidebarProps {
  onPlanGenerated: (plan: any) => void;
  onLoadPlan?: (plan: any) => void;
  planLastUpdated?: number; // Add timestamp to track plan updates
}

type Mode = 'Plan' | 'Chat';

// Add proper interfaces for the plan structure
interface PlanTask {
  id: string;
  title: string;
  completed: boolean;
  description?: string;
}

interface PlanDay {
  id: string;
  title: string;
  tasks: PlanTask[];
}

interface PlanWeek {
  id: string;
  title: string;
  days: PlanDay[];
}

interface PlanMonth {
  id: string;
  title: string;
  weeks: PlanWeek[];
}

interface Plan {
  months: PlanMonth[];
  title?: string;
  goal?: string;
}

// Add additional fields to the message interface
interface ChatMessage {
  role: string;
  content: string;
  isRateLimited?: boolean;
  originalInput?: string;
  id?: string; // Add ID for tracking messages
}

export default function ChatSidebar({ onPlanGenerated, onLoadPlan, planLastUpdated }: ChatSidebarProps) {
  // Component state for tracking if this is the initial load of the page
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(process.env.NEXT_PUBLIC_REQUESTY_API_KEY || '');
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [mode, setMode] = useState<Mode>('Plan');
  const [hasPlan, setHasPlan] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [planMessages, setPlanMessages] = useState<ChatMessage[]>([
    { 
      role: 'system', 
      content: 'Welcome to your 90-Day Goal Planner!\n\nThe Plan mode is specifically for creating and modifying your structured plan.\n\nEnter your specific 90-day goal below to get started. Be clear about what you want to achieve in the next 90 days.\n\nFor example:\n• "I want to lose 15 pounds in 90 days"\n• "I want to learn Python and build a web application"\n• "I want to write and publish my first book"\n\nYour plan will appear in the main content area where you can track your progress.'
    }
  ]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { 
      role: 'system', 
      content: '• Chat with your AI Goal Coach\n\nThe Chat mode is exclusively for discussing your plan and getting advice.\n\nOnce you\'ve created your plan in Plan mode, you can chat here to get help with:\n• Overcoming obstacles\n• Finding motivation\n• Getting advice about your goal\n• Answering questions\n\nTo modify your plan structure, switch back to the Plan tab.'
    }
  ]);
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');

  // Generate a new session ID on initial render
  useEffect(() => {
    // Generate a random session ID to track this browser session
    const newSessionId = Math.random().toString(36).substring(2, 15);
    setSessionId(newSessionId);
    console.log('New session ID generated:', newSessionId);
    
    // Check if we have a stored session ID that's different (indicates a new session)
    const storedSessionId = localStorage.getItem('chatSessionId');
    
    if (storedSessionId !== newSessionId) {
      console.log('Session ID changed from', storedSessionId, 'to', newSessionId);
      localStorage.setItem('chatSessionId', newSessionId);
      
      // If the session ID changed, force a complete reset of the chat
      resetChatStateCompletely();
      
      // Mark the chat context as needing reset
      localStorage.setItem('chatContextReset', 'true');
    }
    
    // Always reset chat context on page load
    resetChatContext();
    
    // Clean up any orphaned plan summaries
    if (localStorage.getItem('planSummary')) {
      console.log('Clearing cached plan summary on page load');
      localStorage.removeItem('planSummary');
    }
  }, []);
  
  // Function to reset chat context
  const resetChatContext = () => {
    // Force a reset of the chat context the next time user enters Chat mode
    localStorage.setItem('chatContextReset', 'true');
    console.log('Chat context marked for reset on next mode change');
  };

  // Function to completely reset chat state
  const resetChatStateCompletely = () => {
    console.log('COMPLETE RESET: Resetting all chat state');
    
    // Always start in Plan mode
    setMode('Plan');
    
    // Reset chat messages to initial state - COMPLETE RESET
    setChatMessages([
      { 
        role: 'system', 
        content: '• Chat with your AI Goal Coach\n\nThe Chat mode is exclusively for discussing your plan and getting advice.\n\nOnce you\'ve created your plan in Plan mode, you can chat here to get help with:\n• Overcoming obstacles\n• Finding motivation\n• Getting advice about your goal\n• Answering questions\n\nTo modify your plan structure, switch back to the Plan tab.'
      }
    ]);
    
    // Also reset plan messages to just the welcome message
    setPlanMessages([
      { 
        role: 'system', 
        content: 'Welcome to your 90-Day Goal Planner!\n\nThe Plan mode is specifically for creating and modifying your structured plan.\n\nEnter your specific 90-day goal below to get started. Be clear about what you want to achieve in the next 90 days.\n\nFor example:\n• "I want to lose 15 pounds in 90 days"\n• "I want to learn Python and build a web application"\n• "I want to write and publish my first book"\n\nYour plan will appear in the main content area where you can track your progress.'
      }
    ]);
    
    // Clear any chat history that might be stored
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('chatMessages');
      localStorage.removeItem('chatHistory');
      localStorage.removeItem('planMessages');
      // Force a reset of chat context next time user enters Chat mode
      localStorage.setItem('chatContextReset', 'true');
    }
  };

  // Reset chat state when the window is loaded or refreshed
  useEffect(() => {
    const handlePageLoad = () => {
      console.log('RESET: Page loaded/refreshed, checking session');
      
      // Check if we need to reset based on session ID
      const storedSessionId = localStorage.getItem('chatSessionId');
      if (storedSessionId !== sessionId) {
        console.log('Session mismatch on page load, resetting');
        resetChatStateCompletely();
        localStorage.setItem('chatSessionId', sessionId);
      }
    };
    
    // Call handler on component mount
    if (sessionId) {
      handlePageLoad();
    }
    
    // Add event listener for page refresh/reload
    window.addEventListener('load', handlePageLoad);
    window.addEventListener('pageshow', (event) => {
      // Also handle cases when page is shown from bfcache (back-forward cache)
      if (event.persisted) {
        console.log('Page restored from bfcache, checking session');
        handlePageLoad();
      }
    });
    
    return () => {
      window.removeEventListener('load', handlePageLoad);
      window.removeEventListener('pageshow', () => {});
    };
  }, [sessionId]);

  // Additional initialization effect to check the plan in localStorage
  useEffect(() => {
    console.log('INIT: Checking API and plan status on component mount');
    
    // Skip API validation on page load completely to avoid rate limiting
    // Instead, assume the connection is working and only validate when needed
    
    // Check if we have a stored connection status
    const storedConnectionStatus = localStorage.getItem('apiConnectionStatus');
    
    if (storedConnectionStatus) {
      console.log('Using stored API connection status:', storedConnectionStatus);
      setIsConnected(storedConnectionStatus === 'connected');
    } else {
      // Assume connected initially to avoid unnecessary API calls
      setIsConnected(true);
      localStorage.setItem('apiConnectionStatus', 'connected');
    }
    
    // Check if we already have a plan stored in localStorage
    const storedPlan = localStorage.getItem('currentPlan');
    if (storedPlan) {
      try {
        const planData = JSON.parse(storedPlan);
        if (planData && planData.months && planData.months.length > 0) {
          console.log('INIT: Found existing plan in localStorage, setting hasPlan=true');
          setHasPlan(true);
        }
      } catch (error) {
        console.error('Error parsing stored plan:', error);
      }
    }
    
    // Mark as tested so we don't test again in this session
    hasTestedApiInSession = true;
  }, []);

  // Helper function to format text responses
  const formatResponse = (text: string): string => {
    // Replace markdown-style headers with spacing and bold formatting
    let formatted = text.replace(/^# (.*?)$/gm, '\n**$1**\n');
    formatted = formatted.replace(/^## (.*?)$/gm, '\n**$1**\n');
    formatted = formatted.replace(/^### (.*?)$/gm, '\n**$1**\n');
    
    // Ensure list items have proper spacing
    formatted = formatted.replace(/^(\d+\. .*?)$/gm, '\n$1');
    
    // IMPORTANT: Always convert asterisk (*) bullet points to proper bullet symbols (•)
    // This ensures no raw asterisks appear in the UI as bullets
    formatted = formatted.replace(/^\* (.*?)$/gm, '\n• $1');
    formatted = formatted.replace(/^- (.*?)$/gm, '\n• $1');
    
    // Preserve bold formatting in bullet points
    formatted = formatted.replace(/^• \*\*(.*?)\*\*(.*)$/gm, '• **$1**$2');
    
    // Add spacing after paragraphs
    formatted = formatted.replace(/\n\n/g, '\n');
    
    return formatted;
  };

  // Determine which message list to use based on the current mode
  const messages = mode === 'Plan' ? planMessages : chatMessages;
  const setMessages = mode === 'Plan' ? setPlanMessages : setChatMessages;

  // Verify API key on component mount
  useEffect(() => {
    console.log('INIT: Checking API and plan status on component mount');
    
    // Skip API validation on page load completely to avoid rate limiting
    // Instead, assume the connection is working and only validate when needed
    
    // Check if we have a stored connection status
    const storedConnectionStatus = localStorage.getItem('apiConnectionStatus');
    
    if (storedConnectionStatus) {
      console.log('Using stored API connection status:', storedConnectionStatus);
      setIsConnected(storedConnectionStatus === 'connected');
    } else {
      // Assume connected initially to avoid unnecessary API calls
      setIsConnected(true);
      localStorage.setItem('apiConnectionStatus', 'connected');
    }
    
    // Check if we already have a plan stored in localStorage
    const storedPlan = localStorage.getItem('currentPlan');
    if (storedPlan) {
      try {
        const planData = JSON.parse(storedPlan);
        if (planData && planData.months && planData.months.length > 0) {
          console.log('INIT: Found existing plan in localStorage, setting hasPlan=true');
          setHasPlan(true);
          
          // Make sure we're in Plan mode when a plan is detected
          setMode('Plan');
          
          // Reset chat messages to initial state
          setChatMessages([
            { 
              role: 'system', 
              content: '• Chat with your AI Goal Coach\n\nThe Chat mode is exclusively for discussing your plan and getting advice.\n\nOnce you\'ve created your plan in Plan mode, you can chat here to get help with:\n• Overcoming obstacles\n• Finding motivation\n• Getting advice about your goal\n• Answering questions\n\nTo modify your plan structure, switch back to the Plan tab.'
            }
          ]);
        }
      } catch (error) {
        console.error('Error parsing stored plan:', error);
      }
    }
    
    // Mark as tested so we don't test again in this session
    hasTestedApiInSession = true;
  }, []);

  // Function to check API connection
  const checkApiConnection = async (key: string, skipActualApiTest = false): Promise<{ isValid: boolean, error: string }> => {
    if (!key || key.trim().length <= 10) {
      setIsConnected(false);
      localStorage.setItem('apiConnectionStatus', 'disconnected');
      return {
        isValid: false,
        error: 'API key is too short'
      };
    }
    
    // If we're just doing a basic format check, return true without making API call
    if (skipActualApiTest || hasTestedApiInSession) {
      setIsConnected(true);
      localStorage.setItem('apiConnectionStatus', 'connected');
      return {
        isValid: true,
        error: ''
      };
    }
    
    try {
      console.log('Testing Requesty.ai API key...');
      // Test the API key with a minimal request to see if it's valid
      const testResponse = await fetch('/api/requesty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {role: "system", content: "You are a helpful assistant."},
            {role: "user", content: "API test"}
          ],
          apiKey: key
        }),
      });
      
      const testData = await testResponse.json();
      console.log('API test response:', testData);
      
      // Check if the response was successful
      const isValid = testData.success === true;
      
      console.log('API key test result:', isValid ? 'valid' : 'invalid');
      if (!isValid) {
        console.error('API key validation error:', testData.error || 'Invalid response format');
      }
      
      // Mark that we've tested the API in this session
      hasTestedApiInSession = true;
      localStorage.setItem('apiConnectionStatus', isValid ? 'connected' : 'disconnected');
      
      setIsConnected(isValid);
      return {
        isValid: !!isValid,
        error: testData.error || (!isValid ? 'Invalid response from Requesty.ai' : '')
      };
    } catch (error) {
      console.error("Error checking API connection:", error);
      setIsConnected(false);
      localStorage.setItem('apiConnectionStatus', 'disconnected');
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Failed to validate API key'
      };
    }
  };
  
  // Save settings and check connection
  const handleSaveSettings = async () => {
    // When user explicitly saves settings, we need to perform a real test
    
    // First check if key format is valid 
    if (!apiKey || apiKey.trim().length <= 10) {
      setIsConnected(false);
      localStorage.setItem('apiConnectionStatus', 'disconnected');
      setMessages([
        ...messages,
        { 
          role: 'system', 
          content: `Your API key appears to be invalid. The key is too short.`
        }
      ]);
      return;
    }
    
    // Reset the hasTestedApiInSession flag when manually checking a new key
    hasTestedApiInSession = false;
    
    // Display message indicating we're testing
    setMessages([
      ...messages,
      { 
        role: 'system', 
        content: 'Testing API connection...'
      }
    ]);
    
    const result = await checkApiConnection(apiKey);
    
    // If the key is valid, close the settings panel
    if (result.isValid) {
      setShowSettings(false);
      // Update the verification flag in localStorage
      localStorage.setItem('apiConnectionStatus', 'connected');
    } else {
      // If the key is invalid, add a message to help the user
      // And update the connection status in localStorage
      localStorage.setItem('apiConnectionStatus', 'disconnected');
      setMessages([
        ...messages,
        { 
          role: 'system', 
          content: `Your API key appears to be invalid. Error: ${result.error}. Please make sure you've entered a valid Requesty.ai API key.`
        }
      ]);
    }
  };

  // Handle changing the mode between Plan and Chat
  const handleModeChange = (newMode: Mode) => {
    console.log(`MODE CHANGE: ${mode} -> ${newMode}`);
    
    // Reset any editing state when changing modes
    setEditingMessageId(null);
    
    // Only allow switching to Chat mode if a plan exists
    if (newMode === 'Chat' && !hasPlan) {
      // If trying to switch to Chat mode but no plan exists yet, 
      // show a message indicating the user needs to create a plan first
      setPlanMessages([
        ...planMessages,
        { 
          role: 'system', 
          content: "Please create a plan first before switching to Chat mode. The Plan mode is responsible for creating your 90-day plan in the main content area."
        }
      ]);
      return;
    }

    // Check if we need to reset chat mode (if flag is set in localStorage)
    const chatResetNeeded = localStorage.getItem('chatContextReset') === 'true';
    const currentSessionId = localStorage.getItem('chatSessionId');
    const sessionMismatch = currentSessionId !== sessionId;
    
    console.log('Mode change to Chat - Reset needed:', chatResetNeeded, 'Session mismatch:', sessionMismatch);
    
    // Always create a fresh summary with context when:
    // 1. First time switching to Chat
    // 2. Reset flag is set
    // 3. Session ID mismatch
    if (newMode === 'Chat' && (chatMessages.length === 1 || chatResetNeeded || sessionMismatch)) {
      console.log('Generating fresh plan summary for Chat mode');
      
      // Clear the reset flag
      localStorage.removeItem('chatContextReset');
      // Update session ID
      if (sessionMismatch) {
        localStorage.setItem('chatSessionId', sessionId);
      }
      
      // Always generate a fresh plan summary
      const planSummary = generatePlanSummary();
      
      // Update chat messages with ONLY the plan context and greeting - completely fresh
      setChatMessages([
        { 
          role: 'system', 
          content: `I'm Miles! Your AI Goal Coach. I'll help you discuss your 90-day plan, but I cannot modify it in this Chat mode. How can I help you with your goal today? I can provide advice, motivation, or answer questions about your plan.` 
        } 
      ]);
    }
    
    setMode(newMode);
  };

  // Helper function to generate a text summary of the plan for context
  const generatePlanSummary = (): string => {
    try {
      // Clear any previously cached summary
      localStorage.removeItem('planSummary');
      
      // Access the plan data from localStorage
      const months: PlanMonth[] = JSON.parse(localStorage.getItem('currentPlan') || '{"months":[]}').months;
      
      if (!months || months.length === 0) {
        return "No plan data is available.";
      }
      
      let summary = "== 90-DAY PLAN SUMMARY (READ-ONLY) ==\n";
      summary += "NOTE: This plan can only be modified in the Plan tab, not Chat.\n\n";
      
      // Add goal if available
      const planData = JSON.parse(localStorage.getItem('currentPlan') || '{}');
      if (planData.goal) {
        summary += `GOAL: ${planData.goal}\n\n`;
      }
      
      // Summarize each month, week, and key tasks
      months.forEach((month) => {
        summary += `${month.title}:\n`;
        
        if (month.weeks && month.weeks.length > 0) {
          month.weeks.forEach((week) => {
            summary += `- ${week.title}\n`;
            
            // Collect tasks from all days in the week
            const allTasks: PlanTask[] = [];
            if (week.days && week.days.length > 0) {
              week.days.forEach((day) => {
                if (day.tasks && day.tasks.length > 0) {
                  allTasks.push(...day.tasks);
                }
              });
            }
            
            // Show a few key tasks (up to 3 per week)
            const taskSample = allTasks.slice(0, 3);
            if (taskSample.length > 0) {
              taskSample.forEach((task) => {
                summary += `  * ${task.title} [${task.completed ? 'Completed' : 'Pending'}]\n`;
              });
              
              if (allTasks.length > 3) {
                summary += `  * Plus ${allTasks.length - 3} more tasks\n`;
              }
            }
          });
        }
        
        summary += '\n';
      });
      
      return summary;
    } catch (error) {
      console.error("Error generating plan summary:", error);
      return "Unable to generate plan summary.";
    }
  };

  // Helper function to handle API error responses
  const handleApiError = (data: any, newMessages: any[], currentInput: string = '') => {
    // Check if response contains a rate limit error
    if (data.error && typeof data.error === 'string' && 
        (data.error.includes('429') || data.error.includes('Too Many Requests'))) {
      console.error('Rate limit error detected:', data.error);
      setIsConnected(false);
      localStorage.setItem('apiConnectionStatus', 'disconnected');
      setMessages([
        ...newMessages.filter(msg => msg.role !== 'system' || msg.content !== "Thinking..."),
        { 
          role: 'system', 
          content: 'The API is currently rate limited. Please try again in a few minutes.',
          isRateLimited: true, // Add a flag to identify rate limit errors
          originalInput: currentInput // Store the original user input for retrying
        }
      ]);
      
      // Even when rate limited, create a fallback plan rather than showing no plan
      if (mode === 'Plan') {
        const fallbackPlan = createFallbackPlan(currentInput);
        onPlanGenerated(fallbackPlan);
        
        // Store the fallback plan in localStorage
        localStorage.setItem('currentPlan', JSON.stringify({
          ...fallbackPlan,
          goal: currentInput
        }));
        
        setHasPlan(true);
      }
      
      return true;
    }
    
    // Handle general API errors
    if (data.error) {
      console.error('API error:', data.error);
      setMessages([
        ...newMessages.filter(msg => msg.role !== 'system' || msg.content !== "Thinking..."),
        { 
          role: 'system', 
          content: data.error || "Sorry, I couldn't generate a response. Please check your API key and try again."
        }
      ]);
      setIsConnected(false);
      localStorage.setItem('apiConnectionStatus', 'disconnected');
      
      // Even when there's an API error, create a fallback plan rather than showing no plan
      if (mode === 'Plan') {
        const fallbackPlan = createFallbackPlan(currentInput);
        onPlanGenerated(fallbackPlan);
        
        // Store the fallback plan in localStorage
        localStorage.setItem('currentPlan', JSON.stringify({
          ...fallbackPlan,
          goal: currentInput
        }));
        
        setHasPlan(true);
      }
      
      return true;
    }
    
    return false;
  };

  // New function to handle retry after rate limit
  const handleRetry = (originalInput: string) => {
    // Set the input back to the original message
    setUserInput(originalInput);
    
    // Add a small delay before sending to give the API a chance to reset
    setTimeout(() => {
      handleSendMessage();
    }, 1000);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isGenerating) return;
    
    // Check if we're editing a message
    if (editingMessageId) {
      // Replace the edited message and all messages after it
      const messageIndex = messages.findIndex(msg => msg.id === editingMessageId);
      if (messageIndex !== -1) {
        const newMessages = [
          ...messages.slice(0, messageIndex),
          { role: 'user', content: userInput, id: Math.random().toString(36).substring(2, 11) }
        ];
        
        setMessages(newMessages);
        setUserInput('');
        setEditingMessageId(null);
        setIsGenerating(true);
        
        // Call the same API processing as we do for normal messages,
        // but using our edited messages array instead
        processMessageWithAPI(newMessages, userInput);
        return;
      }
    }

    // Normal message handling (non-editing case)
    const newMessages = [
      ...messages,
      { role: 'user', content: userInput, id: Math.random().toString(36).substring(2, 11) }
    ];
    
    setMessages(newMessages);
    setUserInput('');
    setIsGenerating(true);
    
    processMessageWithAPI(newMessages, userInput);
  };

  // Extract the API processing into a separate function to avoid code duplication
  const processMessageWithAPI = async (messageList: ChatMessage[], inputText: string) => {
    // Only test API connection if we've previously detected it's not connected
    if (!isConnected) {
      const apiCheck = await checkApiConnection(apiKey);
      if (!apiCheck.isValid) {
        setMessages([
          ...messageList,
          { 
            role: 'system', 
            content: `Please enter a valid Requesty.ai API key in the settings before proceeding. Error: ${apiCheck.error}. Click the gear icon to access settings.`,
            id: Math.random().toString(36).substring(2, 11)
          }
        ]);
        setIsGenerating(false);
        return;
      }
    }
    
    // Check if user is trying to modify plan in Chat mode
    if (mode === 'Chat' && (
      inputText.toLowerCase().includes("update my plan") ||
      inputText.toLowerCase().includes("modify the plan") ||
      inputText.toLowerCase().includes("change my plan") ||
      inputText.toLowerCase().includes("create a new plan") ||
      inputText.toLowerCase().includes("edit the plan") ||
      inputText.toLowerCase().includes("new goal") ||
      inputText.toLowerCase().includes("generate a plan")
    )) {
      setMessages([
        ...messageList,
        { 
          role: 'system', 
          content: "I notice you're trying to modify your plan. The Chat mode is only for discussing your plan, not changing it. Please switch to the Plan tab to create or modify your plan structure.",
          id: Math.random().toString(36).substring(2, 11)
        }
      ]);
      setIsGenerating(false);
      return;
    }
    
    // Handle first message in Plan mode differently (use generate-plan endpoint)
    if (mode === 'Plan' && messageList.length > 1 && planMessages.length <= 2) {
      // Handle plan generation
      try {
        // Simulating AI response and generating a plan based on the goal
        setMessages([
          ...messageList,
          { 
            role: 'system', 
            content: "Thanks for sharing your goal. I'm generating a comprehensive 90-day plan for you. This might take a moment..."
          }
        ]);
        
        // Call Requesty.ai API to generate the plan via our proxy
        const response = await fetch('/api/requesty', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              {role: "system", content: "You are a helpful AI assistant that creates detailed 90-day plans. Your MUST return your response as a valid JSON object with this EXACT structure: {\"months\": [{\"title\": \"Month 1: [DESCRIPTIVE TITLE]\", \"weeks\": [{\"title\": \"Week 1: [SPECIFIC FOCUS]\", \"days\": [{\"title\": \"Day 1\", \"tasks\": [{\"title\": \"Task description\", \"completed\": false}]}]}]}]}. The month titles MUST include descriptive names after the 'Month X:' format, like 'Month 1: Foundation Building'. The week titles MUST include specific focus areas after the 'Week X:' format, like 'Week 1: Getting Started'. DO NOT include any explanatory text before or after the JSON. ONLY return the JSON object. Make the plan detailed, with at least 3 months, 4 weeks per month, and 5-7 days per week with multiple tasks each day. YOUR ENTIRE RESPONSE MUST BE VALID JSON."},
              {role: "user", content: inputText}
            ],
            apiKey: apiKey
          }),
        });
        
        const data = await response.json();
        
        console.log("Plan generation response:", data);
        
        // Handle API errors - pass the inputText to createFallbackPlan
        if (handleApiError(data, messageList, inputText)) {
          setIsGenerating(false);
          return;
        }
        
        if (data.success && data.data && data.data.choices && data.data.choices[0] && data.data.choices[0].message) {
          const aiResponse = data.data.choices[0].message.content;
          
          // Try to extract plan JSON from the response
          try {
            // See if response has JSON format
            let jsonStr = aiResponse;
            console.log("Raw AI response:", jsonStr);
            
            // Try different approaches to find the JSON
            
            // First, check for code blocks
            if (jsonStr.includes('```json')) {
              jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
              console.log("Extracted JSON from ```json code block:", jsonStr);
            } else if (jsonStr.includes('```')) {
              jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
              console.log("Extracted JSON from ``` code block:", jsonStr);
            }
            
            // Find any JSON-like structure using regex - improved to handle complex nested structures
            const jsonRegex = /\{(?:[^{}]|\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})*\}/g;
            const jsonMatches = jsonStr.match(jsonRegex);
            
            console.log("Found JSON matches:", jsonMatches?.length);
            
            if (jsonMatches && jsonMatches.length > 0) {
              // Start with the longest match as it's likely the most complete
              let planJson = jsonMatches.reduce((a: string, b: string) => a.length > b.length ? a : b);
              
              // Try to parse it
              let parsedPlan;
              try {
                console.log("Attempting to parse JSON match:", planJson);
                parsedPlan = JSON.parse(planJson);
                console.log("Successfully parsed JSON plan structure");
              } catch (parseError) {
                console.error("Error parsing initial JSON match:", parseError);
                
                // Try fixing common JSON errors
                let cleanedJson = planJson
                  .replace(/\s*\:\s*/g, ':') // Normalize spacing around colons
                  .replace(/,\s*\}/g, '}') // Remove trailing commas before closing braces
                  .replace(/,\s*\]/g, ']'); // Remove trailing commas before closing brackets
                  
                try {
                  console.log("Attempting to parse cleaned JSON:", cleanedJson);
                  parsedPlan = JSON.parse(cleanedJson);
                  console.log("Successfully parsed cleaned JSON");
                } catch (secondError) {
                  console.error("Error parsing cleaned JSON:", secondError);
                  throw new Error("Could not parse JSON plan structure after cleanup");
                }
              }
              
              // Validate that we have a proper plan structure
              if (!parsedPlan.months || !Array.isArray(parsedPlan.months)) {
                console.error("Plan structure missing months array");
                // Try to fix the structure instead of throwing an error
                parsedPlan = fixPlanStructure(parsedPlan, inputText);
                if (!parsedPlan.months || !Array.isArray(parsedPlan.months) || parsedPlan.months.length === 0) {
                  throw new Error("Invalid plan structure: missing months array");
                }
              }
              
              // Ensure every month has a title and properly structured weeks
              parsedPlan.months.forEach((month: any, mIndex: number) => {
                if (!month.title) month.title = `Month ${mIndex + 1}`;
                if (!month.id) month.id = `month-${Math.random().toString(36).substring(2, 6)}`;
                if (!month.weeks || !Array.isArray(month.weeks)) month.weeks = [];
                
                month.weeks.forEach((week: any, wIndex: number) => {
                  if (!week.title) week.title = `Week ${wIndex + 1}`;
                  if (!week.id) week.id = `week-${Math.random().toString(36).substring(2, 6)}`;
                  if (!week.days || !Array.isArray(week.days)) week.days = [];
                  
                  week.days.forEach((day: any, dIndex: number) => {
                    if (!day.title) day.title = `Day ${dIndex + 1}`;
                    if (!day.id) day.id = `day-${Math.random().toString(36).substring(2, 6)}`;
                    if (!day.tasks || !Array.isArray(day.tasks)) day.tasks = [];
                    
                    day.tasks.forEach((task: any, tIndex: number) => {
                      if (!task.title) task.title = `Task ${tIndex + 1}`;
                      if (!task.id) task.id = `task-${Math.random().toString(36).substring(2, 6)}`;
                      task.completed = !!task.completed;
                    });
                  });
                });
              });
              
              // At this point we have a valid plan structure
              console.log("Final validated plan structure:", parsedPlan);
              
              // Add goal text to the plan metadata
              parsedPlan.goal = inputText;
              
              // Pass plan to parent component
              onPlanGenerated(parsedPlan);
              
              // Success processing the plan
              setMessages([
                ...messageList,
                { 
                  role: 'system', 
                  content: formatResponse("I've created a 90-day plan to help you achieve your goal. You can view the plan in the main area and track your progress over time. You can now switch to Chat mode to discuss your plan further or ask questions.")
                }
              ]);
            } else {
              console.log("Invalid JSON structure in response");
              
              // Try to parse the response directly before falling back
              try {
                const directParse = JSON.parse(aiResponse);
                if (directParse) {
                  const fixedPlan = fixPlanStructure(directParse, inputText);
                  if (fixedPlan.months && fixedPlan.months.length > 0) {
                    console.log("Successfully fixed plan structure from direct parsing");
                    onPlanGenerated(fixedPlan);
                    
                    // Store the fixed plan in localStorage
                    localStorage.setItem('currentPlan', JSON.stringify({
                      ...fixedPlan,
                      goal: inputText
                    }));
                    
                    setHasPlan(true);
                    setIsGenerating(false);
                    return;
                  }
                }
              } catch (parseError) {
                console.error("Failed to parse response directly in error handler:", parseError);
              }
              
              // Create a fallback plan on error if we couldn't fix the structure
              const fallbackPlan = createFallbackPlan(inputText);
              onPlanGenerated(fallbackPlan);
              
              // Store the fallback plan in localStorage
              localStorage.setItem('currentPlan', JSON.stringify({
                ...fallbackPlan,
                goal: inputText
              }));
              
              setHasPlan(true);
              setIsGenerating(false);
            }
          } catch (error) {
            console.error("Error checking for plan in response:", error);
            
            // Try to parse the response directly before falling back
            try {
              const directParse = JSON.parse(aiResponse);
              if (directParse) {
                const fixedPlan = fixPlanStructure(directParse, inputText);
                if (fixedPlan.months && fixedPlan.months.length > 0) {
                  console.log("Successfully fixed plan structure from direct parsing");
                  onPlanGenerated(fixedPlan);
                  
                  // Store the fixed plan in localStorage
                  localStorage.setItem('currentPlan', JSON.stringify({
                    ...fixedPlan,
                    goal: inputText
                  }));
                  
                  setHasPlan(true);
                  setIsGenerating(false);
                  return;
                }
              }
            } catch (parseError) {
              console.error("Failed to parse response directly in error handler:", parseError);
            }
            
            // Create a fallback plan on error if we couldn't fix the structure
            const fallbackPlan = createFallbackPlan(inputText);
            onPlanGenerated(fallbackPlan);
            
            // Store the fallback plan in localStorage
            localStorage.setItem('currentPlan', JSON.stringify({
              ...fallbackPlan,
              goal: inputText
            }));
            
            setHasPlan(true);
            setIsGenerating(false);
          }
        } else {
          // This error is now handled by handleApiError
          setIsGenerating(false);
          
          // Create a fallback plan as a last resort
          const fallbackPlan = createFallbackPlan(inputText);
          onPlanGenerated(fallbackPlan);
          
          // Store the fallback plan in localStorage
          localStorage.setItem('currentPlan', JSON.stringify({
            ...fallbackPlan,
            goal: inputText
          }));
          
          setHasPlan(true);
        }
      } catch (error) {
        console.error("Error generating plan:", error);
        setMessages([
          ...messageList,
          { 
            role: 'system', 
            content: "Sorry, I encountered an error while generating your plan. I've created a basic plan template for you to get started."
          }
        ]);
        
        // Create a fallback plan on error
        const fallbackPlan = createFallbackPlan(inputText);
        onPlanGenerated(fallbackPlan);
        
        // Store the fallback plan in localStorage
        localStorage.setItem('currentPlan', JSON.stringify({
          ...fallbackPlan,
          goal: inputText
        }));
        
        setHasPlan(true);
        setIsGenerating(false);
      }
    } else {
      // For general chat or plan discussion
      const chatEndpoint = '/api/requesty';
      
      try {
        // Temporarily show "Thinking..." message
        setMessages([
          ...messageList,
          { role: 'system', content: "Thinking...", id: Math.random().toString(36).substring(2, 11) }
        ]);
        
        // Modify the messages to include the system prompt - different prompts for Plan vs Chat mode
        const requestMessages = [
          {role: "system", content: mode === 'Plan' 
            ? "You are a helpful AI assistant that helps users create and refine 90-day plans to achieve their goals. Your primary purpose is plan creation and refinement. Try to provide specific, actionable advice. IMPORTANT: If the user asks you to create a plan, you MUST return it in JSON format with this exact structure: {\"months\": [{\"title\": \"Month 1\", \"weeks\": [{\"title\": \"Week 1\", \"days\": [{\"title\": \"Day 1\", \"tasks\": [{\"title\": \"Task description\", \"completed\": false}]}]}]}]}. Do not return any other format. Do not include explanatory text around the JSON."
            : "You are a helpful AI coach that provides support and advice to help users achieve their goals. You are in CHAT MODE which is READ-ONLY for the plan. Your role in Chat mode is strictly conversation and advice - you CANNOT modify the plan structure here. You have access to the user's 90-day plan (provided earlier) for reference only. IMPORTANT INSTRUCTIONS: If the user asks to modify their plan in any way, remind them that plan modifications must be done in the Plan tab, as Chat mode is only for discussion. Do not generate plan JSON in this mode and do not attempt to update the plan structure."
          },
          ...messageList.map(msg => ({
            role: msg.role === 'system' ? 'assistant' : msg.role,
            content: msg.content
          }))
        ];
        
        const response = await fetch(chatEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: requestMessages,
            apiKey: apiKey
          }),
        });
        
        const data = await response.json();
        
        // Handle API errors
        if (handleApiError(data, messageList, inputText)) {
          setIsGenerating(false);
          return;
        }
        
        if (data.success && data.data && data.data.choices && data.data.choices[0] && data.data.choices[0].message) {
          // Extract the AI response
          const aiResponse = data.data.choices[0].message.content;
          
          // Update the messages first to show the AI response
          const updatedMessages = [
            ...messageList.filter(msg => msg.role !== 'system' || msg.content !== "Thinking..."),
            { role: 'system', content: formatResponse(aiResponse), id: Math.random().toString(36).substring(2, 11) }
          ];
          setMessages(updatedMessages);
          
          // Process further if needed (check for plan JSON, etc.)
          // ... rest of existing code for processing responses ...
          
          setIsConnected(true);
          setIsGenerating(false);
        } else {
          // This error should be handled by handleApiError
          setIsGenerating(false);
        }
      } catch (error) {
        console.error("Error in chat request:", error);
        setMessages([
          ...messageList.filter(msg => msg.role !== 'system' || msg.content !== "Thinking..."),
          { 
            role: 'system', 
            content: "Sorry, I encountered an error while processing your request. Please try again later.",
            id: Math.random().toString(36).substring(2, 11)
          }
        ]);
        setIsGenerating(false);
      }
    }
  };

  // Add a global error handler to reset isGenerating state in case of any unhandled errors
  useEffect(() => {
    const handleUnexpectedError = () => {
      if (isGenerating) {
        console.log("Resetting isGenerating state due to possible unhandled error");
        setIsGenerating(false);
      }
    };

    // Check every 10 seconds if isGenerating has been stuck
    const intervalId = setInterval(handleUnexpectedError, 10000);
    
    return () => clearInterval(intervalId);
  }, [isGenerating]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Add a function to handle editing a message
  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditedContent(content);
    setUserInput(content);
  };

  // Create a basic fallback plan when API response fails
  const createFallbackPlan = (goalText: string): Plan => {
    console.log("Creating fallback plan for goal:", goalText);
    
    // Create a structured 90-day plan with 3 months, 4 weeks each, 7 days each
    const months: PlanMonth[] = [];
    
    for (let m = 0; m < 3; m++) {
      const month: PlanMonth = {
        id: `month-${m}`,
        title: `Month ${m + 1}`,
        weeks: []
      };
      
      for (let w = 0; w < 4; w++) {
        const week: PlanWeek = {
          id: `week-${m}-${w}`,
          title: `Week ${w + 1}`,
          days: []
        };
        
        for (let d = 0; d < 7; d++) {
          const day: PlanDay = {
            id: `day-${m}-${w}-${d}`,
            title: `Day ${d + 1}`,
            tasks: []
          };
          
          // Add some generic tasks based on which part of the plan we're in
          if (m === 0) {
            // First month - planning and initial steps
            day.tasks.push({
              id: `task-${m}-${w}-${d}-0`,
              title: `Planning task for ${goalText}`,
              completed: false
            });
            day.tasks.push({
              id: `task-${m}-${w}-${d}-1`,
              title: "Research resources and tools needed",
              completed: false
            });
          } else if (m === 1) {
            // Second month - implementation
            day.tasks.push({
              id: `task-${m}-${w}-${d}-0`,
              title: "Continue working toward goal",
              completed: false
            });
            day.tasks.push({
              id: `task-${m}-${w}-${d}-1`,
              title: "Review progress and adjust approach if needed",
              completed: false
            });
          } else {
            // Third month - refinement and completion
            day.tasks.push({
              id: `task-${m}-${w}-${d}-0`,
              title: "Final steps toward completing goal",
              completed: false
            });
            day.tasks.push({
              id: `task-${m}-${w}-${d}-1`,
              title: "Document lessons learned and achievements",
              completed: false
            });
          }
          
          week.days.push(day);
        }
        
        month.weeks.push(week);
      }
      
      months.push(month);
    }
    
    return { months, goal: goalText };
  };

  // Function to fix incorrectly structured plan JSON
  const fixPlanStructure = (planData: any, goalText: string): Plan => {
    console.log("Fixing plan structure...", planData);
    
    // Check if this is already a valid plan structure
    if (planData.months && Array.isArray(planData.months)) {
      return planData as Plan;
    }
    
    // Check if this looks like a single month (has weeks property)
    if (planData.weeks && Array.isArray(planData.weeks)) {
      // This is likely a single month structure, which we need to properly distribute
      
      // Create all three months with appropriate titles
      const firstMonth: PlanMonth = {
        id: `month-${Math.random().toString(36).substring(2, 6)}`,
        title: "Month 1: Academic Foundations and Skill Enhancement",
        weeks: []
      };
      
      const secondMonth: PlanMonth = {
        id: `month-${Math.random().toString(36).substring(2, 6)}`,
        title: "Month 2: Implementation and Progress",
        weeks: []
      };
      
      const thirdMonth: PlanMonth = {
        id: `month-${Math.random().toString(36).substring(2, 6)}`,
        title: "Month 3: Refinement and Completion",
        weeks: []
      };
      
      // Check if the data actually has enough weeks (usually it doesn't)
      const existingWeeks = planData.weeks || [];
      
      // If we have at least one week, use it as a template
      const templateWeek = existingWeeks.length > 0 ? existingWeeks[0] : null;
      
      // Helper function to generate a week with days
      const generateWeek = (monthNum: number, weekNum: number, title?: string): PlanWeek => {
        const week: PlanWeek = {
          id: `week-${Math.random().toString(36).substring(2, 6)}`,
          title: title || `Week ${weekNum}: ${monthNum === 1 ? 'Foundation' : monthNum === 2 ? 'Implementation' : 'Completion'} Phase ${weekNum % 4 || 4}`,
          days: []
        };
        
        // Generate 7 days per week
        for (let d = 0; d < 7; d++) {
          const day: PlanDay = {
            id: `day-${Math.random().toString(36).substring(2, 6)}`,
            title: `Day ${d + 1}`,
            tasks: []
          };
          
          // Add appropriate tasks based on month and day
          if (monthNum === 1) {
            // First month - planning and initial steps
            day.tasks.push({
              id: `task-${Math.random().toString(36).substring(2, 6)}`,
              title: d === 5 ? "Weekend review: Reflect on initial progress" : 
                     d === 6 ? "Plan for the upcoming week's learning objectives" :
                     `Academic foundation building for ${goalText}`,
              completed: false
            });
            day.tasks.push({
              id: `task-${Math.random().toString(36).substring(2, 6)}`,
              title: d === 5 ? "Take time for self-care and balance" : 
                     d === 6 ? "Prepare materials for next week" :
                     "Review new concepts and strengthen understanding",
              completed: false
            });
          } else if (monthNum === 2) {
            // Second month - implementation
            day.tasks.push({
              id: `task-${Math.random().toString(36).substring(2, 6)}`,
              title: d === 5 ? "Weekend review: Reflect on progress made during the week" : 
                     d === 6 ? "Plan for the upcoming week and organize resources" :
                     `Continue implementation of goal for ${goalText}`,
              completed: false
            });
            day.tasks.push({
              id: `task-${Math.random().toString(36).substring(2, 6)}`,
              title: d === 5 ? "Take time for self-care and maintain work-life balance" :
                     d === 6 ? "Prepare mentally for the next week's challenges" :
                     "Review progress and adjust approach if needed",
              completed: false
            });
          } else {
            // Third month - refinement and completion
            day.tasks.push({
              id: `task-${Math.random().toString(36).substring(2, 6)}`,
              title: d === 5 ? "Final weekend review: Assess overall progress toward goal" :
                     d === 6 ? "Prepare presentation or documentation of achievements" :
                     "Finalize remaining steps for goal completion",
              completed: false
            });
            day.tasks.push({
              id: `task-${Math.random().toString(36).substring(2, 6)}`,
              title: d === 5 ? "Reflect on lessons learned throughout the 90-day journey" :
                     d === 6 ? "Set future goals based on this 90-day experience" :
                     "Document progress and achievements",
              completed: false
            });
          }
          
          week.days.push(day);
        }
        
        return week;
      };
      
      // Assign existing weeks to months properly
      // First, collect all weeks from the provided data
      let allWeeks: PlanWeek[] = [];
      
      // Add existing weeks from input data
      for (let i = 0; i < existingWeeks.length; i++) {
        const week = existingWeeks[i];
        // Create a deep copy and ensure it has an ID
        const weekCopy: PlanWeek = {
          id: week.id || `week-${Math.random().toString(36).substring(2, 6)}`,
          title: week.title || `Week ${i + 1}`,
          days: week.days || []
        };
        
        // Ensure the days have proper structure
        if (weekCopy.days.length === 0) {
          // If no days, generate them
          for (let d = 0; d < 7; d++) {
            weekCopy.days.push({
              id: `day-${Math.random().toString(36).substring(2, 6)}`,
              title: `Day ${d + 1}`,
              tasks: [
                {
                  id: `task-${Math.random().toString(36).substring(2, 6)}`,
                  title: `Task for ${goalText}`,
                  completed: false
                }
              ]
            });
          }
        }
        
        allWeeks.push(weekCopy);
      }
      
      // Generate additional weeks if needed to have a total of 12 weeks
      while (allWeeks.length < 12) {
        const weekNum = allWeeks.length + 1;
        let monthNum = 1;
        if (weekNum > 4) monthNum = 2;
        if (weekNum > 8) monthNum = 3;
        
        allWeeks.push(generateWeek(monthNum, weekNum));
      }
      
      // Now distribute weeks properly across months
      // Month 1: Weeks 1-4
      firstMonth.weeks = allWeeks.slice(0, 4);
      
      // Month 2: Weeks 5-8
      secondMonth.weeks = allWeeks.slice(4, 8);
      
      // Month 3: Weeks 9-12
      thirdMonth.weeks = allWeeks.slice(8, 12);
      
      // Create the final plan with correctly distributed weeks
      const fixedPlan: Plan = {
        months: [firstMonth, secondMonth, thirdMonth],
        goal: goalText
      };
      
      console.log("Fixed plan with properly distributed weeks:", JSON.stringify(fixedPlan, null, 2).substring(0, 200) + "...");
      return fixedPlan;
    }
    
    // If we can't determine structure, return empty plan
    return { months: [], goal: goalText };
  };

  // Check if API connection still works after a period of inactivity
  useEffect(() => {
    const checkConnectionOnActivity = async () => {
      // If API connection is shown as OK but hasn't been checked in a while, verify it
      if (isConnected && !isGenerating) {
        console.log('Checking API connection after inactivity...');
        const result = await checkApiConnection(apiKey, true); // Skip actual API test, just check format
        setIsConnected(result.isValid);
      }
    };
    
    // Set up a listener to check connection when user comes back to the tab
    window.addEventListener('focus', checkConnectionOnActivity);
    
    return () => {
      window.removeEventListener('focus', checkConnectionOnActivity);
    };
  }, [isConnected, isGenerating, apiKey]);

  // Add event listeners for page visibility and refreshes
  useEffect(() => {
    // Function to handle when the page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, checking if chat context needs reset');
        
        // Mark chat context for reset when switching to Chat mode
        localStorage.setItem('chatContextReset', 'true');
      }
    };
    
    // Function to handle before page unload (refresh/close)
    const handleBeforeUnload = () => {
      // Mark chat context for reset on next visit
      localStorage.setItem('chatContextReset', 'true');
    };
    
    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Remove listeners on component cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Reset chat context when the plan is updated in MainContent
  useEffect(() => {
    if (planLastUpdated) {
      console.log('Plan was updated in MainContent, marking chat context for reset');
      
      // Mark chat context for reset on next Chat mode entry
      localStorage.setItem('chatContextReset', 'true');
      
      // If we're already in Chat mode, force a refresh of the context
      if (mode === 'Chat' && hasPlan) {
        console.log('Currently in Chat mode, refreshing chat context immediately');
        
        // Generate a fresh plan summary
        const planSummary = generatePlanSummary();
        
        // Add a system message indicating the plan was updated
        setChatMessages([
          ...chatMessages,
          { 
            role: 'system', 
            content: 'The plan has been updated. Here is the latest version for reference:\n\n' + planSummary,
            id: Math.random().toString(36).substring(2, 11)
          }
        ]);
      }
    }
  }, [planLastUpdated, mode, hasPlan]);

  return (
    <div className={`relative flex flex-col h-screen border-r border-accent2 bg-white transition-all duration-300 shadow-md ${isMinimized ? 'w-14' : 'w-96'}`}>
      {isMinimized ? (
        <button 
          onClick={() => setIsMinimized(false)}
          className="absolute top-4 left-0 p-3 text-black hover:text-accent3 focus:outline-none focus:ring-2 focus:ring-accent2 rounded-full"
        >
          <ChevronRight size={20} />
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between p-5 border-b border-accent2">
            <div className="flex items-center">
              <Logo className="mr-3" />
            </div>
            <div className="flex items-center">
              {isConnected ? (
                <Wifi size={18} className="text-green-500 mr-3" aria-label="Connected to Requesty.ai" />
              ) : (
                <WifiOff size={18} className="text-red-500 mr-3" aria-label="Not connected to Requesty.ai" />
              )}
              {/* User Authentication - Modified to remove profile picture */}
              {isLoading ? (
                <div className="h-9 w-9 rounded-full bg-gray-200 animate-pulse mr-3"></div>
              ) : session?.user ? (
                <div className="flex items-center gap-3 mr-3">
                  {/* User plans functionality without profile picture */}
                  {onLoadPlan && session.user && <UserPlans onLoadPlan={onLoadPlan} />}
                  <button
                    onClick={() => signOut()}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent2 rounded-full p-1"
                    title="Sign Out"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signIn('google')}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent2 rounded-full p-1 mr-3"
                  title="Sign In"
                >
                  <LogIn size={18} />
                </button>
              )}
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="text-black hover:text-accent3 focus:outline-none focus:ring-2 focus:ring-accent2 rounded-full p-1 mr-3"
              >
                <Settings size={20} />
              </button>
              <button 
                onClick={() => setIsMinimized(true)}
                className="text-black hover:text-accent3 focus:outline-none focus:ring-2 focus:ring-accent2 rounded-full p-1"
              >
                <ChevronLeft size={20} />
              </button>
            </div>
          </div>
          
          {showSettings ? (
            <div className="p-4">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-black">Requesty.ai API Key</label>
                  <span className={`text-xs ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                    {isConnected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full p-2 border border-accent2 rounded text-black"
                  placeholder="Enter your API key"
                />
              </div>
              <button 
                onClick={handleSaveSettings}
                className="w-full bg-accent1 p-2 rounded text-black hover:bg-accent2 transition"
              >
                Save Settings
              </button>
            </div>
          ) : (
            <>
              {/* Enhanced Mode Toggle */}
              <div className="flex border-b border-accent2">
                <button 
                  onClick={() => handleModeChange('Plan')}
                  className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-all ${
                    mode === 'Plan' 
                      ? 'bg-accent1 text-black font-semibold shadow-inner border-b-2 border-accent3' 
                      : 'bg-white text-gray-600 hover:bg-accent2/20'
                  }`}
                >
                  <List size={18} />
                  <span>Plan Creator</span>
                </button>
                <button 
                  onClick={() => handleModeChange('Chat')}
                  className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-all ${
                    mode === 'Chat' 
                      ? 'bg-accent1 text-black font-semibold shadow-inner border-b-2 border-accent3' 
                      : 'bg-white text-gray-600 hover:bg-accent2/20'
                  } ${!hasPlan ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!hasPlan}
                >
                  <MessageCircle size={18} />
                  <span>AI Coach</span>
                </button>
              </div>
              
              {/* Mode description banner */}
              <div className={`text-xs p-2 text-center font-semibold ${
                mode === 'Plan' ? 'bg-accent1/30' : 'bg-accent2/30'
              }`}>
                {mode === 'Plan' 
                  ? 'Plan Creator: Generates & modifies the 90-day plan in the main view'
                  : 'AI Coach: Discuss your plan (view-only, cannot modify plan structure)'}
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg text-black ${
                      msg.role === 'user' ? 'bg-accent1 ml-4' : 'bg-accent2 mr-4 chat-message-system'
                    }`}
                  >
                    {msg.role === 'system' ? (
                      <div className="prose prose-sm max-w-none">
                        {msg.content.split('\n').map((paragraph, i) => {
                          // Special case: First message - special handling for welcome messages
                          if (index === 0 && i === 0) {
                            if (paragraph.trim().startsWith('•') && 
                                (paragraph.includes("Welcome to your 90-Day Goal Planner") || 
                                 paragraph.includes("Chat with your AI Goal Coach"))) {
                              const content = paragraph.trim().substring(1).trim();
                              return (
                                <div key={i} className="ml-2 mb-2">
                                  <span className="inline-block w-2 mr-1">•</span>
                                  <span className="font-bold text-base">{content}</span>
                                </div>
                              );
                            }
                          }
                          
                          // Handle bullet points (both • and *)
                          if (paragraph.trim().startsWith('•') || paragraph.trim().startsWith('*')) {
                            const content = paragraph.trim().substring(1).trim();
                            return (
                              <div key={i} className="ml-2 mb-1">
                                <span className="inline-block w-2 mr-1">•</span>
                                <span>{content}</span>
                              </div>
                            );
                          }
                          
                          // Handle numbered lists
                          if (/^\d+\./.test(paragraph.trim())) {
                            const [num, ...rest] = paragraph.trim().split('.');
                            return (
                              <div key={i} className="ml-2 mb-1">
                                <span className="inline-block mr-1">{num}.</span>
                                <span>{rest.join('.').trim()}</span>
                              </div>
                            );
                          }
                          
                          // Handle bold text
                          if (paragraph.includes('**')) {
                            const parts = paragraph.split(/(\*\*.*?\*\*)/g);
                            return (
                              <p key={i} className="mb-1">
                                {parts.map((part, j) => {
                                  if (part.startsWith('**') && part.endsWith('**')) {
                                    return <strong key={j} className="font-bold">{part.slice(2, -2)}</strong>;
                                  }
                                  return <span key={j}>{part}</span>;
                                })}
                              </p>
                            );
                          }
                          
                          // Regular paragraph
                          return paragraph.trim() ? <p key={i} className="mb-1">{paragraph}</p> : <br key={i} />;
                        })}
                        
                        {/* Add a retry button for rate-limited messages */}
                        {msg.isRateLimited && msg.originalInput && (
                          <button
                            onClick={() => handleRetry(msg.originalInput!)}
                            className="mt-2 bg-accent1 px-4 py-1 rounded text-black hover:bg-accent2 transition"
                            disabled={isGenerating}
                          >
                            Try Again
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div className="flex-1">{msg.content}</div>
                        {msg.role === 'user' && (
                          <button 
                            onClick={() => handleEditMessage(msg.id || '', msg.content)}
                            className="ml-2 text-gray-600 hover:text-black focus:outline-none"
                            title="Edit message"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {isGenerating && messages.some(msg => msg.role === 'system' && msg.content === "Thinking...") && (
                  <div className="flex justify-center p-2">
                    <div className="animate-pulse text-black">
                      {mode === 'Plan' && planMessages.length === 1 ? 'Generating plan...' : 'Thinking...'}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-accent2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="relative"
                >
                  <textarea
                    value={userInput}
                    onChange={(e) => {
                      setUserInput(e.target.value);
                      if (editingMessageId) {
                        setEditedContent(e.target.value);
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    className={`w-full p-3 pr-20 border rounded-lg resize-none text-black focus:outline-none focus:ring-2 ${
                      editingMessageId 
                        ? 'border-yellow-500 focus:ring-yellow-300' 
                        : mode === 'Plan' 
                          ? 'border-accent3/50 focus:ring-accent3/30' 
                          : 'border-accent2/50 focus:ring-accent2/30'
                    }`}
                    placeholder={editingMessageId ? "Edit your message..." : 
                      mode === 'Plan' && !hasPlan ? "Enter your 90-day goal..." : 
                      mode === 'Plan' ? "Create or refine your plan structure..." : 
                      "Chat with your AI coach about your plan..."}
                    rows={3}
                    disabled={isGenerating}
                  ></textarea>
                  <div className="absolute right-2 bottom-2 flex space-x-2">
                    {editingMessageId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMessageId(null);
                          setUserInput('');
                        }}
                        className="px-2 py-1 bg-gray-300 hover:bg-gray-400 rounded text-black text-sm transition-colors"
                        title="Cancel editing"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!userInput.trim() || isGenerating}
                      className="px-3 py-1 bg-accent1 hover:bg-accent2 rounded text-black text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      {editingMessageId ? "Update" : "Send"}
                    </button>
                  </div>
                </form>
                {editingMessageId && (
                  <div className="mt-1 text-xs text-yellow-600">
                    Editing message - Update will replace this message and clear all responses after it
                  </div>
                )}
                {/* Mode-specific helper text */}
                <div className="mt-1 text-xs text-gray-500 flex items-center">
                  {mode === 'Plan' 
                    ? <List size={12} className="mr-1 text-accent3" />
                    : <MessageCircle size={12} className="mr-1 text-accent3" />
                  }
                  {mode === 'Plan' && !hasPlan ? 
                    "Enter your goal to generate a 90-day plan in the main area" : 
                    mode === 'Plan' ? 
                    "Changes made here will update your plan in the main content area" : 
                    "Chat mode doesn't modify your plan - switch to Plan mode for changes"}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
} 