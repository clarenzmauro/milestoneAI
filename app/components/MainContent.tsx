import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import ProgressTracker from './ProgressTracker';
import Todo from './Todo';

interface PlanItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
}

interface Month {
  id: string;
  title: string;
  weeks: Week[];
}

interface Week {
  id: string;
  title: string;
  days: Day[];
}

interface Day {
  id: string;
  title: string;
  tasks: PlanItem[];
}

interface Plan {
  months: Month[];
}

interface MainContentProps {
  initialPlan: Plan;
  onPlanUpdated: (updatedPlan: Plan) => void;
}

export default function MainContent({ initialPlan, onPlanUpdated }: MainContentProps) {
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const prevInitialPlanRef = useRef<string>('');
  const lastUpdateSource = useRef<'internal' | 'external'>('external');
  const { data: session } = useSession();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Update state when initialPlan changes (e.g., when AI generates a new plan)
  useEffect(() => {
    console.log("MainContent received new initialPlan:", initialPlan);
    
    // Convert to JSON string for comparison
    const initialPlanString = JSON.stringify(initialPlan);
    
    // Only update the state if the initialPlan has changed
    if (initialPlanString !== prevInitialPlanRef.current) {
      console.log("Plan structure changed, updating state");
      lastUpdateSource.current = 'external';
      
      // Create a deep copy and normalize boolean values
      const normalizedPlan = JSON.parse(JSON.stringify(initialPlan));
      
      // Ensure all completed flags are proper booleans and months/weeks/days/tasks exist
      if (normalizedPlan.months && normalizedPlan.months.length > 0) {
        normalizedPlan.months.forEach((month: Month) => {
          if (!month.id) month.id = `month-${Math.random().toString(36).substring(2, 6)}`;
          if (!month.weeks) month.weeks = [];
          
          // Ensure month title is preserved
          if (!month.title || month.title.trim() === '') {
            month.title = `Month ${normalizedPlan.months.indexOf(month) + 1}`;
          }
          
          month.weeks.forEach((week: Week) => {
            if (!week.id) week.id = `week-${Math.random().toString(36).substring(2, 6)}`;
            if (!week.days) week.days = [];
            
            // Ensure week title is preserved
            if (!week.title || week.title.trim() === '') {
              week.title = `Week ${month.weeks.indexOf(week) + 1}`;
            }
            
            week.days.forEach((day: Day) => {
              if (!day.id) day.id = `day-${Math.random().toString(36).substring(2, 6)}`;
              if (!day.tasks) day.tasks = [];
              
              // Ensure day title is preserved
              if (!day.title || day.title.trim() === '') {
                day.title = `Day ${week.days.indexOf(day) + 1}`;
              }
              
              day.tasks.forEach((task: PlanItem) => {
                if (!task.id) task.id = `task-${Math.random().toString(36).substring(2, 6)}`;
                // Force completed to be a boolean using double negation
                task.completed = !!task.completed;
              });
            });
          });
        });
      } else {
        // Ensure we have a valid empty plan structure
        normalizedPlan.months = [];
      }
      
      console.log("Normalized plan:", normalizedPlan);
      setPlan(normalizedPlan);
      
      // Set default selections when plan updates
      if (normalizedPlan.months && normalizedPlan.months.length > 0) {
        console.log("Setting selected month:", normalizedPlan.months[0].id);
        setSelectedMonth(normalizedPlan.months[0].id);
        if (normalizedPlan.months[0].weeks && normalizedPlan.months[0].weeks.length > 0) {
          console.log("Setting selected week:", normalizedPlan.months[0].weeks[0].id);
          setSelectedWeek(normalizedPlan.months[0].weeks[0].id);
        }
      } else {
        console.log("No months in plan, clearing selections");
        setSelectedMonth(null);
        setSelectedWeek(null);
      }
      
      // Update the ref with the new value
      prevInitialPlanRef.current = initialPlanString;
      
      // Save to Google Drive if we have a valid plan and the user is signed in
      if (normalizedPlan.months && normalizedPlan.months.length > 0 && session?.accessToken) {
        savePlanToGoogleDrive(normalizedPlan);
      }
    }
  }, [initialPlan, session]);

  // Send updates to parent component only when plan is updated internally
  useEffect(() => {
    // Only notify parent if this was an internal update (like toggling a task)
    if (lastUpdateSource.current === 'internal') {
      console.log("=== DEBUG START: Notifying Parent ===");
      console.log("Notifying parent of plan update from internal change");
      console.log("Current updateSource:", lastUpdateSource.current);
      console.log("Plan being sent to parent:", JSON.stringify(plan, null, 2));
      onPlanUpdated(plan);
      console.log("=== DEBUG END: Notifying Parent ===");
      
      // Save to Google Drive if the user is signed in
      if (session?.accessToken) {
        savePlanToGoogleDrive(plan);
      }
    }
  }, [plan, onPlanUpdated, session]);

  // Function to save plan to Google Drive
  const savePlanToGoogleDrive = async (planToSave: Plan) => {
    // Only proceed if we have a valid plan and the user is signed in
    if (planToSave.months.length === 0 || !session?.accessToken) {
      return;
    }
    
    try {
      setSaveStatus('saving');
      console.log("Saving plan to Google Drive...");
      
      // Check if we have a token error in the session
      if ((session as any).error) {
        console.error('Token error detected:', (session as any).error);
        setSaveStatus('error');
        // User needs to re-authenticate - could show a modal or notification here
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
        return;
      }
      
      // Call our API endpoint to save the plan
      const response = await fetch('/api/save-to-google-drive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: planToSave }),
      });
      
      // Handle non-OK responses
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error (${response.status}):`, errorText);
        
        // If we get a 401 or 403, it might be a token issue - could trigger a sign-in refresh
        if (response.status === 401 || response.status === 403) {
          console.log("Authentication error, user may need to re-authenticate");
        }
        
        setSaveStatus('error');
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log("Plan saved to Google Drive successfully", data);
        setSaveStatus('success');
        
        // Reset the status after a few seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      } else {
        console.error("Failed to save plan to Google Drive:", data.error);
        setSaveStatus('error');
        
        // Reset the status after a few seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      }
    } catch (error) {
      console.error("Error saving plan to Google Drive:", error);
      setSaveStatus('error');
      
      // Reset the status after a few seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    }
  };

  // Find the selected month and week objects
  const currentMonth = plan.months.find(m => m.id === selectedMonth);
  const currentWeek = currentMonth?.weeks.find(w => w.id === selectedWeek);

  // Toggle completion status of a task
  const toggleTaskCompletion = (dayId: string, taskId: string) => {
    // Set update source to internal before updating plan
    lastUpdateSource.current = 'internal';
    console.log("=== DEBUG START: Task Toggle ===");
    console.log("dayId:", dayId, "taskId:", taskId);
    console.log("selectedMonth:", selectedMonth, "selectedWeek:", selectedWeek);
    
    setPlan(prevPlan => {
      try {
        // Create a deep copy of the plan to ensure we don't mutate the previous state
        const newPlan = JSON.parse(JSON.stringify(prevPlan)) as Plan;
        
        const month = newPlan.months.find((m: Month) => m.id === selectedMonth);
        if (!month) {
          console.log("Month not found:", selectedMonth);
          return prevPlan;
        }
        
        const week = month.weeks.find((w: Week) => w.id === selectedWeek);
        if (!week) {
          console.log("Week not found:", selectedWeek);
          return prevPlan;
        }
        
        const day = week.days.find((d: Day) => d.id === dayId);
        if (!day) {
          console.log("Day not found:", dayId);
          return prevPlan;
        }
        
        const taskIndex = day.tasks.findIndex((t: PlanItem) => t.id === taskId);
        if (taskIndex === -1) {
          console.log("Task not found:", taskId);
          return prevPlan;
        }
        
        // Toggle the task completion status using double negation to ensure boolean value
        const currentValue = !!day.tasks[taskIndex].completed;
        day.tasks[taskIndex].completed = !currentValue;
        
        // Log task completion status for debugging
        console.log(`Task "${day.tasks[taskIndex].title}" toggled to ${day.tasks[taskIndex].completed ? 'completed' : 'uncompleted'}`);
        console.log(`Task object after toggle:`, JSON.stringify(day.tasks[taskIndex], null, 2));
        
        // DIRECTLY call the parent update function with the new plan to ensure it gets passed up
        // This is a more direct approach that bypasses the useEffect dependency chain
        setTimeout(() => {
          console.log("Directly calling onPlanUpdated from toggleTaskCompletion");
          onPlanUpdated(newPlan);
        }, 0);
        
        console.log("=== DEBUG END: Task Toggle ===");
        return newPlan;
      } catch (error) {
        console.error("Error in toggleTaskCompletion:", error);
        return prevPlan;
      }
    });
  };

  // Display a message when no plan exists
  if (plan.months.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-white to-accent1/10">
        <div className="max-w-2xl text-center">
          <h1 className="text-4xl font-bold mb-6 text-black">Welcome to Milestone.AI</h1>
          <p className="text-xl text-gray-700 mb-10 leading-relaxed">
            Set and achieve your goals with a personalized 90-day plan generated just for you.
          </p>
          <div className="bg-white p-8 rounded-lg shadow-lg border border-accent2/30 max-w-lg mx-auto">
            <h2 className="text-2xl font-semibold text-black mb-4">Get Started</h2>
            <p className="text-gray-700 mb-6">
              Enter your 90-day goal in the AI Assistant to generate a personalized plan that will help you track your progress.
            </p>
            <div className="flex items-center justify-center space-x-4 text-gray-700 mt-6">
              <div className="flex items-center">
                <div className="bg-accent1 rounded-full w-10 h-10 flex items-center justify-center mr-3 shadow-sm">
                  <span className="font-bold">1</span>
                </div>
                <span>Describe your goal</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent3"><polyline points="9 18 15 12 9 6"></polyline></svg>
              <div className="flex items-center">
                <div className="bg-accent1 rounded-full w-10 h-10 flex items-center justify-center mr-3 shadow-sm">
                  <span className="font-bold">2</span>
                </div>
                <span>Track your progress</span>
              </div>
            </div>
          </div>
          <div className="mt-10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent3 bounce-horizontal"><path d="M19 12H5"></path><path d="M12 19l-7-7 7-7"></path></svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto">
      <div className="mb-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold mb-4 text-black">Achieve Your Goals in 90 Days</h1>
          {session && saveStatus !== 'idle' && (
            <div className="text-sm flex items-center">
              {saveStatus === 'saving' && <span className="text-accent3">Saving to Google Drive...</span>}
              {saveStatus === 'success' && <span className="text-green-600">Saved to Google Drive</span>}
              {saveStatus === 'error' && <span className="text-red-600">Error saving to Google Drive</span>}
            </div>
          )}
        </div>
        <ProgressTracker plan={plan} />
      </div>
      
      <div className="flex-1 flex flex-col space-y-6 max-w-7xl mx-auto w-full">
        {/* Monthly Goals Row */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-black">Monthly Milestones</h2>
          <div className="flex overflow-x-auto space-x-4 pb-2">
            {plan.months.map(month => (
              <div 
                key={month.id}
                onClick={() => {
                  setSelectedMonth(month.id);
                  setSelectedWeek(month.weeks[0]?.id || null);
                }}
                className={`cursor-pointer flex-shrink-0 p-4 rounded-lg w-64 transition-all duration-200 hover:shadow-md ${
                  selectedMonth === month.id ? 'bg-accent1 border-2 border-accent2' : 'bg-accent2/20 hover:bg-accent2/30'
                }`}
              >
                <h3 className="font-medium text-black">{month.title}</h3>
              </div>
            ))}
          </div>
        </div>
        
        {/* Weekly Goals Row */}
        {currentMonth && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-black">Weekly Objectives</h2>
            <div className="flex overflow-x-auto space-x-4 pb-2">
              {currentMonth.weeks.map(week => (
                <div 
                  key={week.id}
                  onClick={() => setSelectedWeek(week.id)}
                  className={`cursor-pointer flex-shrink-0 p-4 rounded-lg w-52 transition-all duration-200 hover:shadow-md ${
                    selectedWeek === week.id ? 'bg-accent1 border-2 border-accent2' : 'bg-accent2/20 hover:bg-accent2/30'
                  }`}
                >
                  <h3 className="font-medium text-black">{week.title}</h3>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Daily Tasks Row */}
        {currentWeek && (
          <div className="bg-white p-6 rounded-lg shadow-md flex-1">
            <h2 className="text-xl font-semibold mb-4 text-black">Daily Tasks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {currentWeek.days.map(day => {
                // Calculate completion percentage for this day
                const totalTasks = day.tasks.length;
                const completedTasks = day.tasks.filter(task => !!task.completed).length;
                const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                
                return (
                  <div 
                    key={day.id} 
                    className={`p-4 ${
                      completionPercentage === 100 
                        ? 'bg-green-50 border border-green-200' 
                        : completionPercentage > 0 
                          ? 'bg-accent1/20 border border-accent1/30' 
                          : 'bg-accent2/20 border border-accent2/30'
                    } rounded-lg hover:shadow-md transition-all duration-200`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-black">{day.title}</h3>
                      {totalTasks > 0 && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          completionPercentage === 100 
                            ? 'bg-green-500 text-white' 
                            : completionPercentage > 0 
                              ? 'bg-accent3 text-white' 
                              : 'bg-gray-200 text-gray-700'
                        }`}>
                          {completionPercentage}%
                        </span>
                      )}
                    </div>
                    {totalTasks > 0 && (
                      <div className="w-full h-1.5 bg-gray-200 rounded-full mb-3">
                        <div 
                          className={`h-1.5 rounded-full ${
                            completionPercentage === 100 
                              ? 'bg-green-500' 
                              : 'bg-accent3'
                          }`}
                          style={{ width: `${completionPercentage}%` }}
                        ></div>
                      </div>
                    )}
                    <ul className="space-y-3">
                      {day.tasks.map(task => (
                        <li key={task.id}>
                          <Todo 
                            id={task.id}
                            title={task.title || 'Untitled Task'}
                            completed={!!task.completed}
                            description={task.description || ''}
                            onToggle={() => toggleTaskCompletion(day.id, task.id)}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 