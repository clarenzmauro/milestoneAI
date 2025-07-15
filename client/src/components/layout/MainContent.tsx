import React, { useState, useMemo, useCallback } from 'react';
import { usePlan } from '../../contexts/PlanContext';
import styles from './MainContent.module.css';
import { MonthlyMilestone, WeeklyObjective, DailyTask } from '../../types/planTypes';
import { FaLightbulb, FaTrophy } from 'react-icons/fa';
import BarLoader from "react-spinners/BarLoader";
import AchievementsModal from '../modals/AchievementsModal';
import { teamMembers } from '../../config/team';
import { parsePlanString } from '../../utils/planParser';

const MainContent: React.FC = () => {
  const { plan, streamingPlanText, isLoading, error, toggleTaskCompletion } = usePlan();
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(0);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState<boolean>(false);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(0);

  // Parse streaming plan text in real-time
  const streamingPlan = useMemo(() => {
    if (!streamingPlanText) return null;
    
    // Try to extract goal from streaming text
    const goalMatch = streamingPlanText.match(/# Goal:\s*(.+)/);
    const goal = goalMatch ? goalMatch[1].trim() : 'Your Goal';
    
    // Try to parse what we have so far
    try {
      return parsePlanString(streamingPlanText, goal);
    } catch {
      // If parsing fails, return null and let the component show loading state
      return null;
    }
  }, [streamingPlanText]);

  // Use either the final plan or the streaming plan
  const currentPlan = plan || streamingPlan;

  const { totalTasks, completedTasks, progressPercentage } = useMemo(() => {
    if (!plan?.monthlyMilestones) {
      return { totalTasks: 0, completedTasks: 0, progressPercentage: 0 };
    }

    let total = 0;
    let completed = 0;

    plan.monthlyMilestones.forEach(month => {
      month.weeklyObjectives?.forEach(week => {
        week.dailyTasks?.forEach(task => {
          total++;
          if (task.completed) {
            completed++;
          }
        });
      });
    });

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { totalTasks: total, completedTasks: completed, progressPercentage: percentage };
  }, [plan]);

  const handleTaskToggle = useCallback((taskDay: number) => {
    if (!plan) return;
    const taskToToggle = plan.monthlyMilestones?.[selectedMonthIndex]
      ?.weeklyObjectives?.[selectedWeekIndex]
      ?.dailyTasks?.find(t => t.day === taskDay);

    if (taskToToggle) {
      toggleTaskCompletion(selectedMonthIndex, selectedWeekIndex, taskDay);
    }
  }, [plan, selectedMonthIndex, selectedWeekIndex, toggleTaskCompletion]);

  // Show streaming text if we have it but no parsed plan yet
  if (streamingPlanText && !currentPlan) {
    return (
      <div className={`${styles.mainContent} ${styles.loadingContainer}`}>
        <BarLoader
          color={"#4A90E2"} 
          loading={true}
          width={150} 
          height={4} 
          aria-label="Loading Spinner"
          data-testid="loader"
        />
        <p className={styles.loadingText}>Generating your plan...</p>
        <div className={styles.streamingContainer}>
          <pre className={styles.streamingText}>{streamingPlanText}</pre>
        </div>
      </div>
    );
  }

  if (isLoading && !currentPlan) {
    return (
      <div className={`${styles.mainContent} ${styles.loadingContainer}`}>
        <BarLoader
          color={"#4A90E2"} 
          loading={true}
          width={150} 
          height={4} 
          aria-label="Loading Spinner"
          data-testid="loader"
        />
        <p className={styles.loadingText}>Generating your plan...</p>
      </div>
    );
  }

  if (error) {
    return <div className={`${styles.mainContent} ${styles.emptyState}`}>Error loading plan: {error}</div>;
  }

  if (!currentPlan) {
    return (
      <div className={`${styles.mainContent} ${styles.emptyState}`}>
        <div className={styles.emptyStateContent}>
          {React.createElement(FaLightbulb as React.ElementType, { "aria-hidden": "true", className: styles.emptyStateIcon })}
          <h2 className={styles.emptyStateHeading}>Ready to Plan Your Success?</h2>
          <p className={styles.emptyStateText}>
            Use the sidebar to create your first goal and let MilestoneAI build your roadmap.
          </p>

          <h3 className={styles.teamHeading}>Meet the Team</h3>
          <div className={styles.teamContainer}>
            {teamMembers.map((member) => (
              <a
                key={member.username}
                href={member.link}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.teamMember}
              >
                <img
                  src={member.avatarUrl}
                  alt={`${member.name}'s avatar`}
                  className={styles.teamAvatar}
                  width={60} 
                  height={60}
                />
                <span className={styles.teamUsername}>{member.name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const monthsData: MonthlyMilestone[] = currentPlan.monthlyMilestones || [];

  const renderPlaceholders = (
    type: 'week' | 'day',
    totalSlots: number,
    filledSlots: number,
    monthIndex: number,
    weekIndex?: number
  ) => {
    const placeholderCount = Math.max(0, totalSlots - filledSlots);
    return Array.from({ length: placeholderCount }).map((_, i) => {
      const index = filledSlots + i + 1;
      const key = type === 'week'
        ? `placeholder-week-${monthIndex}-${index}`
        : `placeholder-day-${monthIndex}-${weekIndex}-${index}`;
      return <PlaceholderCard key={key} type={type} index={index} />;
    });
  };

  return (
    <main className={styles.mainContent}>
      <div className={styles.goalHeader}>
        <h1>Goal: {currentPlan.goal}</h1>
        {plan && (
           <button 
             onClick={() => setIsAchievementsModalOpen(true)} 
             className={styles.achievementsButton} 
             title="View Achievements"
           >
             <FaTrophy />
           </button>
        )}
      </div>

      <section className={styles.progressSection}>
        <h2>Overall Progress</h2>
        <div className={styles.progressBarContainer}>
          <div
            className={styles.progressBarFill}
            style={{ width: `${progressPercentage}%` }}
            role="progressbar"
            aria-valuenow={progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {`${progressPercentage}%`}
          </div>
        </div>
        <p>{completedTasks} of {totalTasks} tasks completed</p>
      </section>

      <section>
        <h2>Monthly Milestones</h2>
        <div className={styles.monthsContainer}>
          {monthsData.map((month: MonthlyMilestone, monthIndex) => (
            <div
              key={month.month}
              className={`${styles.monthCard} ${styles.clickable} ${selectedMonthIndex === monthIndex ? styles.selected : ''}`}
              onClick={() => {
                setSelectedMonthIndex(monthIndex);
                setSelectedWeekIndex(0);
              }}
            >
              <div className={styles.cardHeader}>Month {month.month}</div>
              <div className={styles.cardContent}>{month.milestone}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Weekly Objectives</h2>
        <div className={`${styles.gridContainer} ${styles.weeksContainer}`}>
          {(monthsData[selectedMonthIndex]?.weeklyObjectives || []).map((week: WeeklyObjective, weekIndex) => (
            <div
              key={week.week}
              className={`${styles.weekCard} ${styles.clickable} ${selectedWeekIndex === weekIndex ? styles.selected : ''}`}
              onClick={() => setSelectedWeekIndex(weekIndex)}
            >
              <div className={styles.cardHeader}>Week {week.week}</div>
              <div className={styles.cardContent}>{week.objective}</div>
            </div>
          ))}
          {renderPlaceholders('week', 4, monthsData[selectedMonthIndex]?.weeklyObjectives?.length ?? 0, selectedMonthIndex)}
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Daily Tasks</h2>
        <div className={`${styles.gridContainer} ${styles.daysContainer}`}>
          {(monthsData[selectedMonthIndex]?.weeklyObjectives?.[selectedWeekIndex]?.dailyTasks || []).map((task: DailyTask) => (
            <div key={`${selectedMonthIndex}-${selectedWeekIndex}-${task.day}`} className={styles.dayCard}>
              <div className={styles.cardHeader}>
                Day {task.day}
                <input
                  type="checkbox"
                  className={styles.taskCheckbox}
                  checked={!!task.completed}
                  onChange={() => handleTaskToggle(task.day)}
                  aria-label={`Mark task for day ${task.day} as complete`}
                />
              </div>
              <div className={styles.cardContent}>{task.description}</div>
            </div>
          ))}
          {renderPlaceholders('day', 7, monthsData[selectedMonthIndex]?.weeklyObjectives?.[selectedWeekIndex]?.dailyTasks?.length ?? 0, selectedMonthIndex, selectedWeekIndex)}
        </div>
      </section>

      <AchievementsModal 
        isOpen={isAchievementsModalOpen}
        onClose={() => setIsAchievementsModalOpen(false)}
      />

    </main>
  );
};

interface PlaceholderCardProps {
  type: 'week' | 'day';
  index: number;
}

const PlaceholderCard: React.FC<PlaceholderCardProps> = ({ type, index }) => {
  const cardStyle = type === 'week' ? styles.weekCard : styles.dayCard;
  const headerText = type === 'week' ? `Week ${index}` : `Day ${index}`;

  return (
    <div className={`${cardStyle} ${styles.placeholderCard}`}>
      <div className={styles.cardHeader}>{headerText}</div>
      <div className={styles.cardContent}>...</div>
    </div>
  );
};

export default MainContent;
