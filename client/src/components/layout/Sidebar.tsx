import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './Sidebar.module.css';
import ChatModeUI from '../sidebar/ChatModeUI';
import { chatWithAI } from '../../services/aiService';
import { usePlan } from '../../contexts/PlanContext';
import { useAuth } from '../../contexts/SupabaseAuthContext';
import SavedPlansModal from '../modals/SavedPlansModal';
import { FullPlan } from '../../types/planTypes';
import { ChatMessage } from '../../types/chatTypes';
import { InteractionMode } from '../../types/generalTypes';

// Define initial message states outside the component for stability
const initialPlanMessage: ChatMessage = {
  id: 'initial-plan',
  role: 'ai',
  text: "Let's build your roadmap to success! What big goal are you aiming for in 90 days?"
};

const initialChatMessage: ChatMessage = {
  id: 'initial-chat',
  role: 'ai',
  text: "Plan loaded! Ready to tackle your goals? Ask me anything about refining tasks, brainstorming ideas, or adjusting your timeline."
};

const Sidebar: React.FC = () => {
  const [mode, setMode] = useState<InteractionMode>('plan');
  const [inputValue, setInputValue] = useState('');
  const [planMessages, setPlanMessages] = useState<ChatMessage[]>([initialPlanMessage]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([initialChatMessage]);
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
    saveCurrentPlan,
    resetPlanState
  } = usePlan();

  const { user, loading: authLoading, signInWithGoogle, signOutUser } = useAuth();

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Determine if AI Coach should be disabled
  const coachModeDisabled = !plan;

  // Select the active message list based on the current mode
  const activeMessages = mode === 'plan' ? planMessages : chatMessages;

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    // Depend on the active message list and the mode itself
  }, [activeMessages, mode]);

  // --- Effect to reset local state when context plan is cleared ---
  useEffect(() => {
    console.log('[Sidebar] Plan context changed:', plan);
    if (plan === null) {
      console.log('[Sidebar] Plan is null, resetting local state (mode, messages).');
      setMode('plan');
      setPlanMessages([initialPlanMessage]);
      // Optionally clear chat messages too, or leave them as is?
      // Let's reset chat messages as well for a cleaner start
      setChatMessages([initialChatMessage]);
      setInputValue(''); // Clear input field as well
      setError(null); // Clear local errors
    }
    // We only want this effect to run when the plan object itself changes reference or becomes null.
  }, [plan]);

  // --- Memoized Helper Functions --- 

  const createNewUserMessage = useCallback((text: string): ChatMessage => ({
    id: Date.now(),
    role: 'user',
    text,
  }), []); // No dependencies

  const handlePlanGeneration = useCallback(async (message: string, updatedMessages: ChatMessage[]) => {
    console.log('[Sidebar] Calling generateNewPlan from context...');
    // generateNewPlan, mode, planError, setPlanMessages are dependencies
    await generateNewPlan(message, updatedMessages, mode);

    const aiConfirmationMessage: ChatMessage = {
      id: Date.now() + 1,
      role: 'ai',
      text: `OK. Generating plan for: "${message}". It will appear in the main area. You can refine it further here or switch to AI Coach.`,
    };

    if (!planError) {
      setPlanMessages(prevMessages => [...prevMessages, aiConfirmationMessage]);
    }
  }, [generateNewPlan, mode, planError, setPlanMessages]);

  const prepareChatHistory = useCallback((updatedMessages: ChatMessage[]): { role: 'user' | 'model'; parts: string }[] =>
    updatedMessages.map(msg => ({
      role: msg.role === 'user' ? 'user' : ('model' as 'user' | 'model'),
      parts: msg.text,
    })).slice(0, -1)
  , []); // No dependencies

  const handlePlanUpdate = useCallback(async (aiResponseText: string, updatedMessages: ChatMessage[]) => {
    console.log('[Sidebar] In plan mode, attempting to update plan with response...');
    // setPlanFromString, plan, mode, setPlanMessages are dependencies
    const success = await setPlanFromString(aiResponseText, plan?.goal, updatedMessages, mode);

    const messageToAdd: ChatMessage = {
      id: Date.now() + 1,
      role: 'ai',
      text: success ? "OK, I've updated the plan based on your request. Check the main content area." : aiResponseText,
    };

    setPlanMessages(prevMessages => [...prevMessages, messageToAdd]);

    if (!success) {
      console.log('[Sidebar] Plan update failed (parsing error?). Displaying raw response in plan chat.');
    }
  }, [setPlanFromString, plan, mode, setPlanMessages]);

  const handleRegularChatResponse = useCallback((aiResponseText: string, updatedMessages: ChatMessage[]) => {
    // plan, saveCurrentPlan, setChatMessages are dependencies
    const messageToAdd: ChatMessage = {
      id: Date.now() + 1,
      role: 'ai',
      text: aiResponseText,
    };

    const updatedChatMessagesIncludingAI = [...updatedMessages, messageToAdd];
    setChatMessages(updatedChatMessagesIncludingAI);

    if (plan) {
      saveCurrentPlan(); // Assuming saveCurrentPlan is stable or add to deps if needed
    }
  }, [plan, saveCurrentPlan, setChatMessages]);

  const handleChatOrRefinement = useCallback(async (message: string, updatedMessages: ChatMessage[]) => {
    console.log('[Sidebar] Calling chatWithAI service...');
    // Dependencies: prepareChatHistory, plan, mode, handlePlanUpdate, handleRegularChatResponse
    const history = prepareChatHistory(updatedMessages);
    const aiResponseText = await chatWithAI(message, history, plan, mode);

    if (mode === 'plan') {
      await handlePlanUpdate(aiResponseText, updatedMessages);
    } else {
      handleRegularChatResponse(aiResponseText, updatedMessages);
    }
  }, [prepareChatHistory, plan, mode, handlePlanUpdate, handleRegularChatResponse]); // Added chatWithAI implicitly via aiService import

  const handleError = useCallback((err: unknown) => {
    console.error("[Sidebar] Error during AI interaction:", err);
    // Dependencies: mode, setPlanMessages, setChatMessages, setError
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
  }, [mode, setPlanMessages, setChatMessages, setError]);

  // --- Main Event Handler --- 

  const handleSend = useCallback(async () => {
    const trimmedMessage = inputValue.trim();
    if (!trimmedMessage || isLoading || isPlanLoading) return;

    setIsLoading(true);
    setError(null);

    // Dependencies: mode, planMessages, chatMessages, setPlanMessages, setChatMessages,
    // createNewUserMessage, handlePlanGeneration, handleChatOrRefinement, handleError,
    // inputValue, setInputValue, isLoading, isPlanLoading, setIsLoading, setError
    const currentMessages = mode === 'plan' ? planMessages : chatMessages;
    const setCurrentMessages = mode === 'plan' ? setPlanMessages : setChatMessages;

    const newUserMessage: ChatMessage = createNewUserMessage(trimmedMessage);
    const updatedMessages = [...currentMessages, newUserMessage];
    setCurrentMessages(updatedMessages);
    setInputValue('');

    try {
      if (mode === 'plan' && planMessages.length <= 1) {
        await handlePlanGeneration(trimmedMessage, updatedMessages);
      } else {
        await handleChatOrRefinement(trimmedMessage, updatedMessages);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [
      mode, planMessages, chatMessages, setPlanMessages, setChatMessages,
      createNewUserMessage, handlePlanGeneration, handleChatOrRefinement, handleError,
      inputValue, setInputValue, isLoading, isPlanLoading, setIsLoading, setError
  ]);

  // --- Load Plan Handler --- 
  const handleLoadPlan = useCallback((loadedData: { plan: FullPlan; chatHistory?: ChatMessage[]; interactionMode?: InteractionMode }) => {
    console.log('Loading plan:', loadedData.plan.goal);
    // Dependencies: setPlan, setPlanMessages, setChatMessages, setMode, setIsPlansModalOpen

    const loadedPlanObject = loadedData.plan;
    const loadedChatHistory = loadedData.chatHistory || [];
    const loadedMode: InteractionMode = loadedData.interactionMode || 'plan';

    setPlan(loadedPlanObject);

    if (loadedMode === 'plan') {
       setPlanMessages(loadedChatHistory.length > 0 ? loadedChatHistory : [{ id: Date.now(), role: 'ai', text: 'Plan loaded. Refine your goal or switch to AI Coach.'}]);
       setChatMessages([{ id: Date.now() + 1, role: 'ai', text: 'Switched to AI Coach mode. How can I help refine your loaded plan?'}]);
    } else {
       setChatMessages(loadedChatHistory.length > 0 ? loadedChatHistory : [{ id: Date.now() + 1, role: 'ai', text: 'Plan loaded! Ask me anything.' }]);
       setPlanMessages([{ id: Date.now(), role: 'ai', text: 'Switched to Plan mode. Define or refine your goal.'}]);
    }
    setMode(loadedMode);

    console.log(`Loaded plan '${loadedData.plan.goal}', set mode to: ${loadedMode}, loaded history length: ${loadedChatHistory.length}`);

    setIsPlansModalOpen(false);
  }, [setPlan, setPlanMessages, setChatMessages, setMode, setIsPlansModalOpen]);

  // --- Memoized Inline Handlers --- 

  const handleSignOut = useCallback(() => {
    signOutUser();
  }, [signOutUser]);

  const handleOpenPlansModal = useCallback(() => {
    setIsPlansModalOpen(true);
  }, [setIsPlansModalOpen]);

  const handleSignIn = useCallback(() => {
    signInWithGoogle();
  }, [signInWithGoogle]);

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, [setIsCollapsed]);

  const handleSetModePlan = useCallback(() => {
    setMode('plan');
  }, [setMode]);

  const handleSetModeChat = useCallback(() => {
    if (!coachModeDisabled) {
      setMode('chat');
    }
  }, [coachModeDisabled, setMode]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  }, [setInputValue]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]); // Depends on the memoized handleSend

  const handleCloseModal = useCallback(() => {
    setIsPlansModalOpen(false);
  }, [setIsPlansModalOpen]);


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
                    <button onClick={handleSignOut} className={styles.authButton} title="Sign Out">
                      Sign Out
                    </button>
                    <button
                      onClick={handleOpenPlansModal} // Use memoized handler
                      className={styles.plansButton}
                      title="Saved Plans"
                    >
                      Plans
                    </button>
                    <button
                      onClick={resetPlanState} // Call reset function
                      className={styles.newPlanButton}
                      title="New Plan"
                    >
                      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                        <line x1="7" y1="2.75" x2="7" y2="11.25"/>
                        <line x1="2.75" y1="7" x2="11.25" y2="7"/>
                      </svg>
                    </button>
                  </>
                ) : (
                  <button onClick={handleSignIn} className={styles.authButton} title="Sign In with Google">
                    Sign In
                  </button>
                )}
              </>
            )}

            {/* Collapse/Expand Button */}
            <button
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              onClick={handleToggleCollapse} // Use memoized handler
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
                onClick={handleSetModePlan} // Use memoized handler
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
                onClick={handleSetModeChat} // Use memoized handler
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
                onChange={handleInputChange} // Use memoized handler
                onKeyDown={handleInputKeyDown} // Use memoized handler
                disabled={isLoading || isPlanLoading}
              />
              <div className={styles.controls}>
                <button
                  className={`${styles.button} ${styles.primaryButton}`}
                  onClick={handleSend} // Use memoized handler
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
        onClose={handleCloseModal} // Use memoized handler
        onLoadPlan={handleLoadPlan} // Use memoized handler
      />
    </>
  );
};

export default Sidebar;
