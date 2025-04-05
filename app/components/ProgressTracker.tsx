import React, { useEffect } from 'react';
import { Trophy } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

interface Day {
  id: string;
  title: string;
  tasks: Task[];
}

interface Week {
  id: string;
  title: string;
  days: Day[];
}

interface Month {
  id: string;
  title: string;
  weeks: Week[];
}

interface Plan {
  months: Month[];
  title?: string;
  goal?: string;
}

interface ProgressTrackerProps {
  plan: Plan;
}

export default function ProgressTracker({ plan }: ProgressTrackerProps) {
  // Calculate progress percentages
  const calculateProgress = () => {
    console.log("=== DEBUG START: Calculating Progress ===");
    let totalTasks = 0;
    let completedTasks = 0;
    
    plan.months.forEach((month) => {
      month.weeks.forEach((week) => {
        week.days.forEach((day) => {
          totalTasks += day.tasks.length;
          const completedInDay = day.tasks.filter((task) => !!task.completed).length;
          completedTasks += completedInDay;
          
          if (completedInDay > 0) {
            console.log(`Found ${completedInDay} completed tasks in day: ${day.title}`);
            day.tasks.forEach(task => {
              if (!!task.completed) {
                console.log(`Completed task: ${task.title}`);
              }
            });
          }
        });
      });
    });
    
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    console.log(`Progress calculation: ${completedTasks}/${totalTasks} = ${progressPercent}%`);
    console.log("=== DEBUG END: Calculating Progress ===");
    
    return progressPercent;
  };
  
  const progress = calculateProgress();
  
  // Log progress whenever the plan changes
  useEffect(() => {
    console.log(`Progress updated: ${progress}% (${plan.months.reduce((acc, month) => 
      acc + month.weeks.reduce((wacc, week) => 
        wacc + week.days.reduce((dacc, day) => 
          dacc + day.tasks.filter(t => !!t.completed).length, 0), 0), 0)} completed tasks)`);
  }, [plan, progress]);
  
  // Award badges based on progress
  const renderBadges = () => {
    const badges = [];
    
    if (progress >= 25) {
      badges.push({ id: 'starter', title: 'Getting Started', color: 'bg-green-200' });
    }
    
    if (progress >= 50) {
      badges.push({ id: 'halfway', title: 'Halfway There', color: 'bg-blue-200' });
    }
    
    if (progress >= 75) {
      badges.push({ id: 'almostthere', title: 'Almost There', color: 'bg-purple-200' });
    }
    
    if (progress === 100) {
      badges.push({ id: 'complete', title: 'Goal Achieved!', color: 'bg-yellow-200' });
    }
    
    return badges;
  };
  
  const badges = renderBadges();
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-black">Overall Progress</h2>
        <span className="text-3xl font-bold text-black">{progress}%</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
        <div 
          className="bg-accent1 h-3 rounded-full transition-all duration-700 ease-in-out" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      {badges.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-3 text-black">Achievements</h3>
          <div className="flex flex-wrap gap-3">
            {badges.map(badge => (
              <div 
                key={badge.id}
                className={`flex items-center px-4 py-2 rounded-full ${badge.color} shadow-sm transition-transform hover:scale-105`}
              >
                <Trophy size={18} className="mr-2 text-black" />
                <span className="text-sm font-medium text-black">{badge.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 