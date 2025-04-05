"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ChatSidebar from './components/ChatSidebar';
import MainContent from './components/MainContent';
import UserPlans from './components/UserPlans';
import Logo from './components/Logo';
import { clearLocalStorageOnReload } from './utils/localStorage';

// Define empty plan structure
const emptyPlan = {
  months: []
};

export default function Home() {
  const [plan, setPlan] = useState(emptyPlan);
  const { data: session } = useSession();
  const [lastPlanUpdate, setLastPlanUpdate] = useState<number>(0); // Track when plan was last updated
  
  // Load user's saved plan when they sign in
  useEffect(() => {
    if (session?.user?.id) {
      const userId = session.user.id;
      const userPlanKey = `goalTrackerPlan_${userId}`;
      const savedPlan = localStorage.getItem(userPlanKey);
      
      if (savedPlan) {
        try {
          const parsedPlan = JSON.parse(savedPlan);
          setPlan(parsedPlan);
          console.log("Loaded user's saved plan:", parsedPlan);
        } catch (error) {
          console.error("Error parsing saved plan:", error);
        }
      }
    }
  }, [session]);
  
  const handlePlanGenerated = (generatedPlan: any) => {
    console.log("Plan received in page component:", generatedPlan);
    
    // Validate plan structure before setting it
    const validPlan = {
      months: Array.isArray(generatedPlan.months) ? generatedPlan.months : []
    };
    
    // Ensure all tasks have proper boolean completed values
    if (validPlan.months.length > 0) {
      validPlan.months.forEach((month: any) => {
        // Ensure month title is preserved
        if (!month.title) month.title = `Month ${validPlan.months.indexOf(month) + 1}`;
        
        if (Array.isArray(month.weeks)) {
          month.weeks.forEach((week: any) => {
            // Ensure week title is preserved
            if (!week.title) week.title = `Week ${month.weeks.indexOf(week) + 1}`;
            
            if (Array.isArray(week.days)) {
              week.days.forEach((day: any) => {
                // Ensure day title is preserved
                if (!day.title) day.title = `Day ${week.days.indexOf(day) + 1}`;
                
                if (Array.isArray(day.tasks)) {
                  day.tasks.forEach((task: any) => {
                    // Ensure task title is preserved
                    if (!task.title) task.title = `Task ${day.tasks.indexOf(task) + 1}`;
                    // Force completed to be a boolean
                    task.completed = task.completed === true;
                  });
                }
              });
            }
          });
        }
      });
    }
    
    console.log("Setting plan:", validPlan);
    setPlan(validPlan);
    
    // Update the timestamp to indicate plan was updated
    setLastPlanUpdate(Date.now());
    
    // Save to localStorage with user ID if signed in
    if (session?.user?.id) {
      const userId = session.user.id;
      const userPlanKey = `goalTrackerPlan_${userId}`;
      localStorage.setItem(userPlanKey, JSON.stringify(validPlan));
    } else {
      // Fallback to general storage if not signed in
      localStorage.setItem('goalTrackerPlan', JSON.stringify(validPlan));
    }

    // Also save a copy as 'currentPlan' for chat context
    localStorage.setItem('currentPlan', JSON.stringify({
      ...validPlan,
      goal: generatedPlan.goal || ""
    }));
  };
  
  const handlePlanUpdated = (updatedPlan: any) => {
    console.log("=== DEBUG START: Parent Received Update ===");
    console.log("Plan updated in page component");
    
    // Create a deep copy to ensure we're not working with references
    const planCopy = JSON.parse(JSON.stringify(updatedPlan));
    
    // Check for completed tasks
    let completedTasksCount = 0;
    const completedTaskIds: string[] = [];
    
    // Normalize boolean values for all task completion statuses
    planCopy.months.forEach((month: any) => {
      month.weeks.forEach((week: any) => {
        week.days.forEach((day: any) => {
          day.tasks.forEach((task: any) => {
            // Force completed to be a boolean
            task.completed = task.completed === true;
            if (task.completed) {
              completedTasksCount++;
              completedTaskIds.push(task.id);
              console.log(`Task marked as completed: ${task.title} (ID: ${task.id})`);
            }
          });
        });
      });
    });
    
    console.log(`Total completed tasks: ${completedTasksCount}`);
    
    // Update state with the deep copy
    setPlan(planCopy);
    
    // Update the timestamp to indicate plan was updated
    setLastPlanUpdate(Date.now());
    
    // Save to localStorage with stringified JSON and user ID if signed in
    const planToSave = JSON.stringify(planCopy, null, 0);
    console.log("Saving to localStorage with completed task IDs:", completedTaskIds);
    
    if (session?.user?.id) {
      const userId = session.user.id;
      const userPlanKey = `goalTrackerPlan_${userId}`;
      localStorage.setItem(userPlanKey, planToSave);
    } else {
      localStorage.setItem('goalTrackerPlan', planToSave);
    }
    
    // Also update currentPlan for chat context
    const currentPlan = localStorage.getItem('currentPlan');
    if (currentPlan) {
      try {
        const parsedCurrentPlan = JSON.parse(currentPlan);
        const updatedCurrentPlan = {
          ...parsedCurrentPlan,
          months: planCopy.months
        };
        localStorage.setItem('currentPlan', JSON.stringify(updatedCurrentPlan));
      } catch (error) {
        console.error("Error updating currentPlan:", error);
        // If there's an error, just set it to match the goalTrackerPlan
        localStorage.setItem('currentPlan', planToSave);
      }
    }
    
    // Verify what was saved by reading it back
    const savedPlanKey = session?.user?.id ? `goalTrackerPlan_${session.user.id}` : 'goalTrackerPlan';
    const savedPlan = localStorage.getItem(savedPlanKey);
    if (savedPlan) {
      try {
        const verifiedPlan = JSON.parse(savedPlan);
        let verifiedCompletedCount = 0;
        
        verifiedPlan.months.forEach((m: any) => {
          m.weeks.forEach((w: any) => {
            w.days.forEach((d: any) => {
              d.tasks.forEach((t: any) => {
                if (t.completed) {
                  verifiedCompletedCount++;
                }
              });
            });
          });
        });
        
        console.log(`Verification: ${verifiedCompletedCount} tasks are completed in saved data`);
      } catch (error) {
        console.error("Error verifying saved plan:", error);
      }
    }
    
    console.log("=== DEBUG END: Parent Received Update ===");
  };
  
  return (
    <main className="flex min-h-screen flex-1 flex-col">
      <div className="flex flex-1 h-screen overflow-hidden">
        <ChatSidebar 
          onPlanGenerated={handlePlanGenerated}
          onLoadPlan={setPlan}
          planLastUpdated={lastPlanUpdate}
        />
        <div className="flex-1 flex flex-col">
          <MainContent initialPlan={plan} onPlanUpdated={handlePlanUpdated} />
        </div>
      </div>
    </main>
  )
} 