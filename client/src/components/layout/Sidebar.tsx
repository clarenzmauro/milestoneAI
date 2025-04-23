import React, { useState, useEffect, useRef } from 'react';
import styles from './Sidebar.module.css';
import ChatModeUI from '../sidebar/ChatModeUI';
import { generatePlan, chatWithAI } from '../../services/aiService';
import { usePlan } from '../../contexts/PlanContext';
import { useAuth } from '../../contexts/AuthContext';
import SavedPlansModal from '../modals/SavedPlansModal';
import { FullPlan } from '../../types/planTypes';
import { ChatMessage, ChatRole } from '../../types/chatTypes';
import { InteractionMode } from '../../types/generalTypes';

const Sidebar: React.FC = () => {
  const [mode, setMode] = useState<InteractionMode>('plan');
  const [inputValue, setInputValue] = useState('');
  // Separate message states for each mode
  const [planMessages, setPlanMessages] = useState<ChatMessage[]>([
    { id: Date.now(), role: 'ai', text: "Let's build your roadmap to success! What big goal are you aiming for in 90 days?" }
  ]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: Date.now() + 1, role: 'ai', text: "Plan loaded! Ready to tackle your goals? Ask me anything about refining tasks, brainstorming ideas, or adjusting your timeline." }
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);

  const {
    plan,
    isLoading: isPlanLoading,
    error: planError,
    generateNewPlan,
    setPlanFromString,
    setPlan,
    saveCurrentPlan
  } = usePlan();

  const { user, loading: authLoading, signInWithGoogle, signOutUser } = useAuth();

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Determine if AI Coach should be disabled
  const coachModeDisabled = !plan;

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    // Depend on the current mode's messages
  }, [mode, planMessages, chatMessages]);

  const handleSend = async () => {
    const trimmedMessage = inputValue.trim();
    if (!trimmedMessage || isLoading || isPlanLoading) return;

    setIsLoading(true);
    setError(null);

    // Determine current message list and setter based on mode
    const currentMessages = mode === 'plan' ? planMessages : chatMessages;
    const setCurrentMessages = mode === 'plan' ? setPlanMessages : setChatMessages;

    const newUserMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      text: trimmedMessage,
    };

    // Add user message to the correct list
    const updatedMessages = [...currentMessages, newUserMessage];
    setCurrentMessages(updatedMessages);
    setInputValue('');

    try {
      // --- Plan Generation / Initial Plan Refinement (Only in 'plan' mode) ---
      if (mode === 'plan' && planMessages.length <= 1) {
        console.log('[Sidebar] Calling generateNewPlan from context...');
        await generateNewPlan(trimmedMessage, updatedMessages, mode);
        const aiConfirmationMessage: ChatMessage = {
          id: Date.now() + 1, // Ensure unique ID
          role: 'ai',
          text: `OK. Generating plan for: "${trimmedMessage}". It will appear in the main area. You can refine it further here or switch to AI Coach.`,
        };
        if (!planError) { // Check context error, not local error state
          // Add confirmation only to plan messages
          setPlanMessages(prevMessages => [...prevMessages, aiConfirmationMessage]);
        }
      // --- Plan Refinement / Chatting (Both Modes) ---
      } else {
        console.log('[Sidebar] Calling chatWithAI service...');

        // Prepare history from the *current mode's* message list
        const history = updatedMessages.map(msg => ({
          role: msg.role === 'user' ? 'user' : ('model' as 'user' | 'model'),
          parts: msg.text
        })).slice(0, -1); // Exclude the latest user message

        const aiResponseText = await chatWithAI(trimmedMessage, history, plan, mode);

        let messageToAdd: ChatMessage | null = null;

        // --- Plan Update Logic (Only if in 'plan' mode and response looks like a plan) ---
        if (mode === 'plan') {
          console.log('[Sidebar] In plan mode, attempting to update plan with response...');
          const success = await setPlanFromString(aiResponseText, plan?.goal, updatedMessages, mode);
          if (success) {
            // Plan updated successfully via context
            messageToAdd = {
              id: Date.now() + 1, // Ensure unique ID
              role: 'ai',
              text: "OK, I've updated the plan based on your request. Check the main content area.",
            };
            // Add confirmation to plan messages
            setPlanMessages(prevMessages => [...prevMessages, messageToAdd!]);
          } else {
            // Parsing failed, treat as a regular chat message (context might show error)
            console.log('[Sidebar] Plan update failed (parsing error?). Displaying raw response in plan chat.');
            messageToAdd = {
              id: Date.now() + 1, // Ensure unique ID
              role: 'ai',
              text: aiResponseText, // Show the raw response
            };
             // Add raw response to plan messages
             setPlanMessages(prevMessages => [...prevMessages, messageToAdd!]);
          }
        // --- Regular Chat Response (Only in 'chat' mode) ---
        } else {
          // If in chat mode, just add the response directly to chat messages
          messageToAdd = {
            id: Date.now() + 1, // Ensure unique ID
            role: 'ai',
            text: aiResponseText,
          };
           // Add AI response to chat messages
           const updatedChatMessagesIncludingAI = [...updatedMessages, messageToAdd]; // Use updatedMessages which includes the user message
           setChatMessages(updatedChatMessagesIncludingAI);
           // --- Save the chat history and mode --- 
           if (plan) { // Only save if there's an associated plan
             await saveCurrentPlan(); // Update the call to saveCurrentPlan
           }
        }
      }
    } catch (err) {
      console.error("[Sidebar] Error during AI interaction:", err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      const aiErrorMessage: ChatMessage = {
        id: Date.now() + 1,
        role: 'ai',
        text: `Sorry, I encountered an error: ${errorMessage}`,
      };
      if (mode === 'plan') {
        setPlanMessages(prevMessages => [...prevMessages, aiErrorMessage]);
      } else {
        setChatMessages(prevMessages => [...prevMessages, aiErrorMessage]);
      }
      setError(`Failed to get response. See chat for details.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Updated function to handle loading plan, history, and mode
  const handleLoadPlan = (loadedData: { plan: FullPlan; chatHistory?: ChatMessage[]; interactionMode?: InteractionMode }) => {
    console.log('Loading plan:', loadedData.plan.goal); // Keep this log

    const loadedPlanObject = loadedData.plan;
    const loadedChatHistory = loadedData.chatHistory || [];
    const loadedMode: InteractionMode = loadedData.interactionMode || 'plan'; // Default to plan

    // 1. Update Plan Context directly using the new setPlan function
    setPlan(loadedPlanObject); // <-- Use the new direct setter

    // 2. Update Sidebar's local state for chat history and mode
    if (loadedMode === 'plan') {
       setPlanMessages(loadedChatHistory); // Load history into plan messages
       setChatMessages([{ id: Date.now() +1, role: 'ai', text: 'Switched to AI Coach mode. How can I help refine your loaded plan?'}]); // Reset coach messages
    } else { // loadedMode === 'chat'
       setChatMessages(loadedChatHistory); // Load history into coach messages
       setPlanMessages([{ id: Date.now(), role: 'ai', text: 'Switched to Plan mode. Define or refine your goal.'}]); // Reset plan messages
    }
    setMode(loadedMode); // Set the sidebar's mode

    console.log(`Loaded plan '${loadedData.plan.goal}', set mode to: ${loadedMode}, loaded history length: ${loadedChatHistory.length}`);

    setIsPlansModalOpen(false); // Close modal
  };

  return (
    <>
      <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.topBar}>
          {/* Left Side: Title */}
          <div className={styles.topBarTitle}>{!isCollapsed && 'Milestone.AI'}</div>

          {/* Right Side: Buttons */}
          <div className={styles.topBarButtons}>
            {!isCollapsed && (
              <>
                {/* Auth Buttons */}
                {authLoading ? (
                  <span>Loading...</span> // Show loading indicator
                ) : user ? (
                  <>
                    {/* <span className={styles.userName}>{user.displayName || 'User'}</span> */}
                    <button onClick={signOutUser} className={styles.authButton} title="Sign Out">
                      Sign Out
                    </button>
                    <button 
                      onClick={() => setIsPlansModalOpen(true)} // Open the modal
                      className={styles.plansButton} 
                      title="Saved Plans"
                    >
                      Plans
                    </button>
                  </>
                ) : (
                  <button onClick={signInWithGoogle} className={styles.authButton} title="Sign In with Google">
                    Sign In
                  </button>
                )}
              </>
            )}

            {/* Collapse/Expand Button */}
            <button
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={styles.collapseButton}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                {isCollapsed ? (
                  <path d="M13 17l5-5-5-5M6 17l5-5-5-5" /> // Double right arrow
                ) : (
                  <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" /> // Double left arrow
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mode Selector (only shown if not collapsed) */}
        {!isCollapsed && (
          <>
            <div className={styles.modeSelector}>
              <button 
                className={`${styles.modeButton} ${mode === 'plan' ? styles.active : ''}`}
                onClick={() => setMode('plan')}
              >
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="1.75" y="2.75" width="10.5" height="8.5" rx="1" />
                  <line x1="1.75" y1="5.75" x2="12.25" y2="5.75" />
                  <line x1="5.25" y1="2.75" x2="5.25" y2="11.25" />
                </svg>
                Plan Creator
              </button>
              <button 
                className={`${styles.modeButton} ${mode === 'chat' ? styles.active : ''} ${coachModeDisabled ? styles.disabled : ''}`}
                onClick={() => {
                  if (!coachModeDisabled) {
                    setMode('chat');
                  }
                }}
                disabled={coachModeDisabled} 
                title={coachModeDisabled ? "Generate a plan first to enable AI Coach" : "Switch to AI Coach"}
              >
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1.75 1.75h10.5c.414 0 .75.336.75.75v6c0 .414-.336.75-.75.75H5.379a.75.75 0 00-.53.22L2.5 11.828V9.25a.75.75 0 00-.75-.75H1.75a.75.75 0 01-.75-.75v-6c0-.414.336-.75.75-.75z" />
                  <circle cx="4" cy="5.5" r=".5" fill="currentColor" />
                  <circle cx="7" cy="5.5" r=".5" fill="currentColor" />
                  <circle cx="10" cy="5.5" r=".5" fill="currentColor" />
                </svg>
                AI Coach
              </button>
            </div>

            {/* Pass the correct message list based on mode */}
            <div className={styles.mainContent} ref={chatContainerRef}>
              <ChatModeUI messages={mode === 'plan' ? planMessages : chatMessages} />
              {(planError && mode === 'plan') && !isLoading && !isPlanLoading && (
                <div className={styles.errorMessage}>Plan Error: {planError}</div>
              )}
              {(error && mode === 'chat') && !isLoading && !isPlanLoading && (
                <div className={styles.errorMessage}>Chat Error: {error}</div>
              )}
            </div>

            <div className={styles.inputArea}>
              <textarea
                className={styles.input}
                placeholder={mode === 'plan' ? "Define your 90-day goal..." : "Ask the AI Coach..."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isLoading || isPlanLoading}
              />
              <div className={styles.controls}>
                <button
                  className={`${styles.button} ${styles.primaryButton}`}
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading || isPlanLoading}
                >
                  {isLoading ? 'Thinking...' : isPlanLoading ? 'Generating Plan...' : 'Send'}
                </button>
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Render the modal outside the aside if needed for stacking context, but here is fine for now */}
      <SavedPlansModal
        isOpen={isPlansModalOpen}
        onClose={() => setIsPlansModalOpen(false)}
        onLoadPlan={handleLoadPlan}
      />
    </>
  );
};

export default Sidebar;
