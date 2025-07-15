import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './Sidebar.module.css';
import ConversationUI from '../sidebar/ConversationUI';
import { chatWithAI } from '../../services/aiService';
import { usePlan } from '../../contexts/PlanContext';
import { useAuth } from '../../contexts/SupabaseAuthContext';
import SavedPlansModal from '../modals/SavedPlansModal';
import { FullPlan } from '../../types/planTypes';
import { ChatMessage } from '../../types/chatTypes';

// Define initial message
const initialMessage: ChatMessage = {
  id: 'initial',
  role: 'ai',
  text: "Let's build your roadmap to success! What big goal are you aiming for in 90 days?"
};

const Sidebar: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
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

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset messages when plan is cleared
  useEffect(() => {
    if (plan === null) {
      console.log('[Sidebar] Plan is null, resetting conversation.');
      setMessages([initialMessage]);
      setInputValue('');
      setError(null);
    }
  }, [plan]);

  const createNewUserMessage = useCallback((text: string): ChatMessage => ({
    id: Date.now(),
    role: 'user',
    text,
  }), []);

  const handlePlanGeneration = useCallback(async (message: string, updatedMessages: ChatMessage[]) => {
    console.log('[Sidebar] Generating new plan...');
    await generateNewPlan(message);

    const aiConfirmationMessage: ChatMessage = {
      id: Date.now() + 1,
      role: 'ai',
      text: `Perfect! I'm generating your 90-day plan for: "${message}". It will appear in the main area shortly. Once it's ready, you can continue chatting with me to refine and discuss your plan.`,
    };

    if (!planError) {
      setMessages(prevMessages => [...prevMessages, aiConfirmationMessage]);
    }
  }, [generateNewPlan, planError]);

  const prepareChatHistory = useCallback((updatedMessages: ChatMessage[]): { role: 'user' | 'model'; parts: string }[] =>
    updatedMessages.map(msg => ({
      role: msg.role === 'user' ? 'user' : ('model' as 'user' | 'model'),
      parts: msg.text,
    })).slice(0, -1)
  , []);

  const handlePlanUpdate = useCallback(async (aiResponseText: string, updatedMessages: ChatMessage[]) => {
    console.log('[Sidebar] Attempting to update plan with AI response...');
    const success = await setPlanFromString(aiResponseText, plan?.goal);

    const messageToAdd: ChatMessage = {
      id: Date.now() + 1,
      role: 'ai',
      text: success ? "Great! I've updated your plan based on your request. Check the main content area to see the changes." : aiResponseText,
    };

    setMessages(prevMessages => [...prevMessages, messageToAdd]);

    if (!success) {
      console.log('[Sidebar] Plan update failed (parsing error?). Displaying raw response.');
    }
  }, [setPlanFromString, plan]);

  const handleRegularChatResponse = useCallback((aiResponseText: string, updatedMessages: ChatMessage[]) => {
    const messageToAdd: ChatMessage = {
      id: Date.now() + 1,
      role: 'ai',
      text: aiResponseText,
    };

    const updatedMessagesIncludingAI = [...updatedMessages, messageToAdd];
    setMessages(updatedMessagesIncludingAI);

    if (plan) {
      saveCurrentPlan();
    }
  }, [plan, saveCurrentPlan]);

  const handleChatOrRefinement = useCallback(async (message: string, updatedMessages: ChatMessage[]) => {
    console.log('[Sidebar] Calling chatWithAI service...');
    const history = prepareChatHistory(updatedMessages);
    const aiResponseText = await chatWithAI(message, history, plan);

    // Check if this looks like a plan update (contains "# Goal:")
    if (plan && aiResponseText.includes('# Goal:')) {
      await handlePlanUpdate(aiResponseText, updatedMessages);
    } else {
      handleRegularChatResponse(aiResponseText, updatedMessages);
    }
  }, [prepareChatHistory, plan, handlePlanUpdate, handleRegularChatResponse]);

  const handleError = useCallback((err: unknown) => {
    console.error("[Sidebar] Error during AI interaction:", err);
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
    const aiErrorMessage: ChatMessage = {
      id: Date.now() + 1,
      role: 'ai',
      text: `Sorry, I encountered an error: ${errorMessage}`,
    };

    setMessages(prevMessages => [...prevMessages, aiErrorMessage]);
    setError(`Failed to get response. See chat for details.`);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmedMessage = inputValue.trim();
    if (!trimmedMessage || isLoading || isPlanLoading) return;

    setIsLoading(true);
    setError(null);

    const newUserMessage: ChatMessage = createNewUserMessage(trimmedMessage);
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInputValue('');

    try {
      // If no plan exists and this is one of the first messages, generate a plan
      if (!plan && messages.length <= 2) {
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
    inputValue, isLoading, isPlanLoading, createNewUserMessage, messages,
    plan, handlePlanGeneration, handleChatOrRefinement, handleError
  ]);

  const handleLoadPlan = useCallback((loadedData: { plan: FullPlan; chatHistory?: ChatMessage[] }) => {
    console.log('Loading plan:', loadedData.plan.goal);
    
    const loadedPlan = loadedData.plan;
    const loadedChatHistory = loadedData.chatHistory || [];

    setPlan(loadedPlan);

    if (loadedChatHistory.length > 0) {
      setMessages(loadedChatHistory);
    } else {
      setMessages([{ 
        id: Date.now(), 
        role: 'ai', 
        text: `Perfect! I've loaded your plan: "${loadedPlan.goal}". How can I help you refine it or discuss your progress?`
      }]);
    }

    console.log(`Loaded plan '${loadedPlan.goal}', loaded history length: ${loadedChatHistory.length}`);
    setIsPlansModalOpen(false);
  }, [setPlan]);

  // Memoized handlers
  const handleSignOut = useCallback(() => {
    signOutUser();
  }, [signOutUser]);

  const handleOpenPlansModal = useCallback(() => {
    setIsPlansModalOpen(true);
  }, []);

  const handleSignIn = useCallback(() => {
    signInWithGoogle();
  }, [signInWithGoogle]);

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleCloseModal = useCallback(() => {
    setIsPlansModalOpen(false);
  }, []);

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
                  <span>Loading...</span>
                ) : user ? (
                  <>
                    <button onClick={handleSignOut} className={styles.authButton} title="Sign Out">
                      Sign Out
                    </button>
                    <button
                      onClick={handleOpenPlansModal}
                      className={styles.plansButton}
                      title="Saved Plans"
                    >
                      Plans
                    </button>
                    <button
                      onClick={resetPlanState}
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
              onClick={handleToggleCollapse}
              className={styles.collapseButton}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                {isCollapsed ? (
                  <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
                ) : (
                  <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content (only shown if not collapsed) */}
        {!isCollapsed && (
          <>
            <div className={styles.mainContent} ref={chatContainerRef}>
              <ConversationUI messages={messages} />
              {(planError || error) && !isLoading && !isPlanLoading && (
                <div className={styles.errorMessage}>
                  {planError && `Plan Error: ${planError}`}
                  {error && `Error: ${error}`}
                </div>
              )}
            </div>

            <div className={styles.inputArea}>
              <textarea
                className={styles.input}
                placeholder={plan ? "Ask me anything about your plan..." : "What's your 90-day goal?"}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
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

      <SavedPlansModal
        isOpen={isPlansModalOpen}
        onClose={handleCloseModal}
        onLoadPlan={handleLoadPlan}
      />
    </>
  );
};

export default Sidebar;
