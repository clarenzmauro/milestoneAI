import React, { useState } from 'react';
import styles from './PlanModeUI.module.css';
import { usePlan } from '../../contexts/PlanContext';
import { useAuth } from '../../contexts/AuthContext';
import { savePlan } from '../../services/firestoreService';

const PlanModeUI: React.FC = () => {
  const { plan, isLoading: isPlanLoading, error: planError } = usePlan();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<boolean>(false);

  const handleSave = async () => {
    if (!user || !plan) return;

    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(false);
    try {
      const planId = await savePlan(user.uid, plan);
      setSaveMessage(`Plan saved successfully (ID: ${planId.substring(0, 6)}...)`);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error("Failed to save plan:", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save plan.';
      setSaveMessage(`Error: ${errorMessage}`);
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  };

  if (isPlanLoading) {
    return <div className={styles.loading}>Generating plan...</div>;
  }

  if (planError) {
    return <div className={styles.error}>Error loading plan: {planError}</div>;
  }

  if (!plan) {
    return <div className={styles.noPlan}>No plan active. Define your goal in the input below.</div>;
  }

  return (
    <div className={styles.planContainer}>
      <div className={styles.planActions}>
        <button 
          onClick={handleSave}
          disabled={!user || !plan || isSaving} 
          className={styles.saveButton}
        >
          {isSaving ? 'Saving...' : 'Save Plan'}
        </button>
        {saveMessage && 
          <span 
            className={styles.saveMessage} 
            data-error={saveError}
          >
            {saveMessage}
          </span>
        }
      </div>

      <h3>Current Goal:</h3>
      <p>{plan.goal}</p>
    </div>
  );
};

export default PlanModeUI;
