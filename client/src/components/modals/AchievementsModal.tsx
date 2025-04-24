import React from 'react';
import { usePlan } from '../../contexts/PlanContext';
import { achievementDefinitions } from '../../config/achievements';
import styles from './AchievementsModal.module.css';
import { FaTrophy, FaLock, FaTimes } from 'react-icons/fa'; // Icons

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AchievementsModal: React.FC<AchievementsModalProps> = ({ isOpen, onClose }) => {
  const { plan } = usePlan();

  if (!isOpen || !plan) {
    return null; // Don't render if not open or no plan
  }

  const unlockedIds = plan.unlockedAchievements || {};

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close achievements modal">
          <FaTimes />
        </button>
        <h2 className={styles.modalHeader}>Plan Achievements</h2>
        <ul className={styles.achievementList}>
          {achievementDefinitions.map((achievement) => {
            const isUnlocked = unlockedIds[achievement.id] === true;
            return (
              <li key={achievement.id} className={`${styles.achievementItem} ${isUnlocked ? styles.unlocked : styles.locked}`}>
                <span className={styles.achievementIcon}>
                  {isUnlocked ? <FaTrophy aria-hidden="true" /> : <FaLock aria-hidden="true" />}
                </span>
                <div className={styles.achievementDetails}>
                  <span className={styles.achievementName}>{achievement.name}</span>
                  <p className={styles.achievementDescription}>{achievement.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default AchievementsModal;
