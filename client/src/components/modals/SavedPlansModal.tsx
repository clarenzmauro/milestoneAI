// src/components/modals/SavedPlansModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import styles from './SavedPlansModal.module.css';
import { useAuth } from '../../contexts/SupabaseAuthContext';
import { FullPlan } from '../../types/planTypes';
import { ChatMessage } from '../../types/chatTypes';
import { getUserPlans, deletePlan, PlanWithId, deletePlansByGoal } from '../../services/supabaseService';

interface SavedPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadPlan: (loadedData: { plan: FullPlan; chatHistory?: ChatMessage[] }) => void;
}

// Type definition moved to supabaseService.ts

// Helper to format ISO string timestamp
const formatTimestamp = (timestamp: string | null | undefined): string => {
  if (!timestamp) return 'Unknown date';
  try {
    return new Date(timestamp).toLocaleString(undefined, { 
      year: 'numeric', month: 'short', day: 'numeric', 
      hour: 'numeric', minute: '2-digit' 
    });
  } catch (e) {
    return 'Invalid date';
  }
};

const SavedPlansModal: React.FC<SavedPlansModalProps> = ({ isOpen, onClose, onLoadPlan }) => {
  const { user } = useAuth();
  const [rawPlans, setRawPlans] = useState<PlanWithId[]>([]); // Renamed for clarity
  const [groupedPlans, setGroupedPlans] = useState<Map<string, PlanWithId[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null); // Track which plan is being deleted
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});
  const [deletingGoal, setDeletingGoal] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const fetchedPlans = await getUserPlans(user.id);
      setRawPlans(fetchedPlans);
    } catch (err) {
      setError('Failed to load saved plans.');
      console.error(err);
    } finally {
      setIsLoading(false);
      setDeletingId(null); // Clear deletion indicator
    }
  }, [user]);

  // Fetch plans when the modal opens and the user is available
  useEffect(() => {
    if (isOpen && user) {
      fetchPlans();
    }
  }, [isOpen, user, fetchPlans]);

  // Group plans whenever rawPlans changes
  useEffect(() => {
    const newGroupedPlans = new Map<string, PlanWithId[]>();
    rawPlans.forEach((plan: PlanWithId) => { // Ensure type safety here
      const goalKey = plan.goal || 'Untitled Plan'; // Handle potentially missing goal
      const existing = newGroupedPlans.get(goalKey) || [];
      newGroupedPlans.set(goalKey, [...existing, plan]);
    });
    setGroupedPlans(newGroupedPlans);
    // Reset expansion state when plans are refetched/regrouped
    setExpandedGoals({});
  }, [rawPlans]);

  // Function to toggle expansion state for a goal
  const toggleGoalExpansion = (goal: string) => {
    setExpandedGoals(prev => ({
      ...prev,
      [goal]: !prev[goal] // Toggle the boolean value
    }));
  };

  const handleLoadPlan = (version: PlanWithId) => {
    // Pass the core plan data along with history
    onLoadPlan({
      plan: version as FullPlan, 
      chatHistory: version.chatHistory // Pass history if available
    });
    onClose(); // Close modal after loading
  };

  const handleDeletePlan = async (planId: string) => {
    if (!user) return;
    setDeletingId(planId); // Indicate deletion in progress
    try {
      await deletePlan(user.id, planId);
      // Refetch plans to update the list after deletion
      fetchPlans(); 
    } catch (err) {
      setError('Failed to delete plan.');
      console.error(err);
    } finally {
      setDeletingId(null); // Clear deletion indicator
    }
  };

  const handleDeleteGoalGroup = async (goalToDelete: string) => {
    if (!user || deletingGoal) return; // Prevent double clicks or actions while deleting

    const confirmation = window.confirm(
      `Are you sure you want to delete all saved versions for the goal "${goalToDelete}"? This action cannot be undone.`
    );

    if (confirmation) {
      setDeletingGoal(goalToDelete); // Set deleting state for UI feedback
      setError(null);
      try {
        await deletePlansByGoal(user.id, goalToDelete);
        // Refresh the list after successful deletion
        await fetchPlans(); 
      } catch (err) { 
        console.error("Error batch deleting plans:", err);
        setError(`Failed to delete plans for goal: ${goalToDelete}`);
      } finally {
        setDeletingGoal(null); // Clear deleting state regardless of outcome
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}> 
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}> {/* Prevent closing when clicking inside */}
        <div className={styles.modalHeader}>
          <h2>Saved Plans</h2>
          <button onClick={onClose} className={styles.closeButton}>&times;</button>
        </div>

        {isLoading && <div className={styles.loadingState}>Loading plans...</div>}
        {error && <div className={styles.errorState}>{error}</div>}
        
        {!isLoading && !error && groupedPlans.size === 0 && (
          <div className={styles.loadingState}>No saved plans found.</div>
        )}

        {!isLoading && !error && groupedPlans.size > 0 && (
          <div className={styles.plansListContainer}> {/* Added container for potential future scroll */} 
            {Array.from(groupedPlans.entries()).map(([goal, versions]) => {
              const isExpanded = expandedGoals[goal] ?? false; // Default to collapsed
              return (
                <div key={goal} className={styles.goalGroup}>
                  {/* Goal Header with Toggle Button */}
                  <div className={styles.goalGroupHeader} onClick={() => !deletingGoal && toggleGoalExpansion(goal)}> {/* Disable toggle click during goal delete */} 
                      <h3 className={styles.goalTitle}>{goal}</h3>
                      {/* Container for buttons */}
                      <div className={styles.goalHeaderButtons}> 
                        {/* Delete All Button */} 
                        <button 
                          aria-label={`Delete all versions for goal ${goal}`}
                          className={`${styles.deleteButton} ${styles.deleteAllButton}`} // Use delete style + specific class
                          onClick={(e) => { e.stopPropagation(); handleDeleteGoalGroup(goal); }} // Prevent header click trigger
                          disabled={deletingGoal === goal || !!deletingId} // Disable if goal delete in progress or any single delete
                          title="Delete all versions"
                        >
                          {deletingGoal === goal ? 'Deleting...' : '🗑️'}
                        </button>
                        {/* Collapse/Expand Button */} 
                        <button
                          aria-label={isExpanded ? 'Collapse versions' : 'Expand versions'} // Accessibility
                          className={styles.toggleButton}
                          aria-expanded={isExpanded}
                          onClick={(e) => { e.stopPropagation(); toggleGoalExpansion(goal); }} // Prevent header click trigger
                          disabled={deletingGoal === goal} // Disable collapse/expand during goal delete
                        >
                          {isExpanded ? '−' : '+'}
                        </button>
                      </div>
                  </div>

                  {/* Conditionally Render Version List */}
                  {isExpanded && (
                    <ul className={styles.versionList}>
                      {versions
                        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()) // Sort newest first
                        .map((version) => (
                        <li key={version.id} className={styles.planItem}>
                          <div className={styles.planDetails}>
                            {/* Display timestamp instead of goal within the version item */}
                            <span>Saved: {formatTimestamp(version.created_at)}</span>
                            {/* Optionally show first few words of goal if needed, but title is above */}
                            {/* <p>{version.goal.substring(0, 30)}...</p> */}
                          </div>
                          <div className={styles.planActions}>
                            <button 
                              onClick={() => handleLoadPlan(version)}
                              className={styles.loadButton}
                              disabled={deletingId === version.id || deletingGoal === goal} // Disable load while deleting this or the group
                            >
                              Load
                            </button>
                            <button 
                              onClick={() => handleDeletePlan(version.id)}
                              className={styles.deleteButton}
                              disabled={deletingId === version.id || deletingGoal === goal} // Disable delete while deleting this or the group
                            >
                              {deletingId === version.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedPlansModal;
