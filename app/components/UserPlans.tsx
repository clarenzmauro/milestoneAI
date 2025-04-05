'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ListPlus, Trash2 } from 'lucide-react';

interface UserPlansProps {
  onLoadPlan: (plan: any) => void;
}

export default function UserPlans({ onLoadPlan }: UserPlansProps) {
  const { data: session } = useSession();
  const [plans, setPlans] = useState<any[]>([]);
  const [showPlans, setShowPlans] = useState(false);

  // Load user's saved plans from localStorage
  useEffect(() => {
    if (session?.user?.id) {
      const userId = session.user.id;
      const userPlanKey = `goalTrackerPlan_${userId}`;
      const savedPlan = localStorage.getItem(userPlanKey);
      
      if (savedPlan) {
        try {
          const parsedPlan = JSON.parse(savedPlan);
          // Get the goal from currentPlan if available
          const currentPlan = localStorage.getItem('currentPlan');
          let goalTitle = 'My 90-Day Plan';
          
          if (currentPlan) {
            try {
              const parsedCurrentPlan = JSON.parse(currentPlan);
              if (parsedCurrentPlan.goal) {
                goalTitle = parsedCurrentPlan.goal;
              }
            } catch (error) {
              console.error("Error parsing current plan:", error);
            }
          }
          
          setPlans([{ 
            id: 1, 
            title: goalTitle, 
            plan: parsedPlan,
            updatedAt: new Date().toLocaleString() 
          }]);
        } catch (error) {
          console.error("Error parsing saved plan:", error);
        }
      }
    }
  }, [session]);

  // Toggle showing plans panel
  const togglePlans = () => {
    setShowPlans(!showPlans);
  };

  // Load a selected plan
  const handleLoadPlan = (plan: any) => {
    onLoadPlan(plan.plan);
    setShowPlans(false);
  };

  // Delete a plan
  const handleDeletePlan = (planId: number) => {
    setPlans(plans.filter(p => p.id !== planId));
    
    if (session?.user?.id) {
      const userId = session.user.id;
      const userPlanKey = `goalTrackerPlan_${userId}`;
      localStorage.removeItem(userPlanKey);
    }
  };

  if (!session?.user) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={togglePlans}
        className="flex items-center justify-center text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent2 rounded-full p-2 bg-accent1/20 hover:bg-accent1/50 transition-colors w-8 h-8"
        title="My Plans"
      >
        <ListPlus size={16} />
      </button>

      {showPlans && (
        <div className="fixed inset-0 bg-black/20 z-40 flex items-center justify-center backdrop-blur-sm">
          <div onClick={e => e.stopPropagation()} className="absolute w-80 bg-white rounded-xl shadow-2xl z-50 border border-accent2/50 mx-auto left-0 right-0 max-w-[90%] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-accent2/50 bg-gradient-to-r from-accent1/50 to-white">
              <h3 className="font-semibold text-black text-lg">My Saved Plans</h3>
              <button 
                onClick={togglePlans}
                className="text-gray-500 hover:text-gray-700 focus:outline-none hover:bg-accent2/20 p-1 rounded-full transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto">
              {plans.length === 0 ? (
                <div className="p-8 text-gray-500 text-center flex flex-col items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-accent2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <span>No saved plans found</span>
                </div>
              ) : (
                <ul>
                  {plans.map((plan) => (
                    <li key={plan.id} className="hover:bg-accent1/20 transition-colors">
                      <div className="p-4 flex justify-between items-center border-b border-accent2/20 last:border-b-0">
                        <div className="flex-1 mr-3">
                          <div className="font-medium text-black truncate max-w-[200px]">
                            {plan.title}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {plan.updatedAt}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleLoadPlan(plan)}
                            className="text-blue-600 hover:text-blue-800 text-sm bg-blue-50 px-3 py-1 rounded-md hover:bg-blue-100 transition-colors shadow-sm"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleDeletePlan(plan.id)}
                            className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {/* Add a backdrop click handler to close the modal */}
          <div onClick={togglePlans} className="absolute inset-0 z-40"></div>
        </div>
      )}
    </div>
  );
} 