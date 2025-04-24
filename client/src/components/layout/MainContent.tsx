import React, { useState, useMemo, useCallback } from 'react';
import { usePlan } from '../../contexts/PlanContext';
import styles from './MainContent.module.css';
import { FullPlan, MonthlyMilestone, WeeklyObjective, DailyTask } from '../../types/planTypes';

const MainContent: React.FC = () => {
  const { plan, isLoading, error, toggleTaskCompletion } = usePlan();
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(0);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(0);

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
    console.log(`[MainContent] Progress Calculation: Completed=${completed}, Total=${total}, Percentage=${percentage}`);
    return { totalTasks: total, completedTasks: completed, progressPercentage: percentage };
  }, [plan]);

  const handleTaskToggle = useCallback((taskDay: number) => {
    if (!plan) return;
    const taskToToggle = plan.monthlyMilestones?.[selectedMonthIndex]
      ?.weeklyObjectives?.[selectedWeekIndex]
      ?.dailyTasks?.find(t => t.day === taskDay);

    if (taskToToggle) {
      console.log(`[MainContent] Toggling task: Month ${selectedMonthIndex + 1}, Week ${selectedWeekIndex + 1}, Day ${taskDay}. Current status: ${taskToToggle.completed}`);
      toggleTaskCompletion(selectedMonthIndex, selectedWeekIndex, taskDay);
    } else {
      console.error(`[MainContent] Could not find task to toggle: M${selectedMonthIndex+1}, W${selectedWeekIndex+1}, D${taskDay}`);
    }
  }, [plan, selectedMonthIndex, selectedWeekIndex, toggleTaskCompletion]);

  if (isLoading && !plan) {
    return <div className={styles.mainContent}>Loading plan...</div>;
  }

  if (error) {
    return <div className={`${styles.mainContent} ${styles.emptyState}`}>Error loading plan: {error}</div>;
  }

  if (!plan) {
    return <div className={`${styles.mainContent} ${styles.emptyState}`}>No plan generated yet. Use the sidebar to create one!</div>;
  }

  const monthsData: MonthlyMilestone[] = plan.monthlyMilestones || [];

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
      <h1>Goal: {plan.goal}</h1>

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
