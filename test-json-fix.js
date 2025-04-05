const planData = {
  "title": "Month 1: Academic Foundations and Skill Enhancement",
  "weeks": [
    {
      "title": "Week 1: Orientation and Time Management Mastery",
      "days": [
        {
          "title": "Day 1",
          "tasks": [
            {
              "title": "Attend all orientation events and workshops.",
              "completed": false
            },
            {
              "title": "Familiarize yourself with the campus map and key locations.",
              "completed": false
            },
            {
              "title": "Set up your online student portal and email account.",
              "completed": false
            }
          ]
        },
        // ... other days
      ]
    },
    {
      "title": "Week 5: Gemini API Setup and Basic Text Generation",
      "days": [
        {
          "title": "Day 1",
          "tasks": [
            {
              "title": "Set up Gemini API access and credentials.",
              "completed": false
            }
          ]
        }
      ]
    },
    // ... other weeks
  ]
};

const fixPlanStructure = (planData, goalText = "Sample Goal") => {
  console.log("Fixing plan structure...");
  
  // Check if this is already a valid plan structure
  if (planData.months && Array.isArray(planData.months)) {
    console.log("Already valid plan structure with months array");
    return planData;
  }
  
  // Check if this looks like a single month (has weeks property)
  if (planData.weeks && Array.isArray(planData.weeks)) {
    // This is likely a single month structure, which we need to properly distribute
    
    // Create all three months with appropriate titles
    const firstMonth = {
      id: `month-${Math.random().toString(36).substring(2, 6)}`,
      title: "Month 1: Academic Foundations and Skill Enhancement",
      weeks: []
    };
    
    const secondMonth = {
      id: `month-${Math.random().toString(36).substring(2, 6)}`,
      title: "Month 2: Implementation and Progress",
      weeks: []
    };
    
    const thirdMonth = {
      id: `month-${Math.random().toString(36).substring(2, 6)}`,
      title: "Month 3: Refinement and Completion",
      weeks: []
    };
    
    // Check if the data actually has enough weeks (usually it doesn't)
    const existingWeeks = planData.weeks || [];
    
    // Helper function to generate a week with days
    const generateWeek = (monthNum, weekNum, title) => {
      const week = {
        id: `week-${Math.random().toString(36).substring(2, 6)}`,
        title: title || `Week ${weekNum}: ${monthNum === 1 ? 'Foundation' : monthNum === 2 ? 'Implementation' : 'Completion'} Phase ${weekNum % 4 || 4}`,
        days: []
      };
      
      // Generate 7 days per week
      for (let d = 0; d < 7; d++) {
        const day = {
          id: `day-${Math.random().toString(36).substring(2, 6)}`,
          title: `Day ${d + 1}`,
          tasks: []
        };
        
        // Add appropriate tasks based on month and day
        if (monthNum === 1) {
          // First month - planning and initial steps
          day.tasks.push({
            id: `task-${Math.random().toString(36).substring(2, 6)}`,
            title: d === 5 ? "Weekend review: Reflect on initial progress" : 
                   d === 6 ? "Plan for the upcoming week's learning objectives" :
                   `Academic foundation building for ${goalText}`,
            completed: false
          });
          day.tasks.push({
            id: `task-${Math.random().toString(36).substring(2, 6)}`,
            title: d === 5 ? "Take time for self-care and balance" : 
                   d === 6 ? "Prepare materials for next week" :
                   "Review new concepts and strengthen understanding",
            completed: false
          });
        } else if (monthNum === 2) {
          // Second month - implementation
          day.tasks.push({
            id: `task-${Math.random().toString(36).substring(2, 6)}`,
            title: d === 5 ? "Weekend review: Reflect on progress made during the week" : 
                   d === 6 ? "Plan for the upcoming week and organize resources" :
                   `Continue implementation of goal for ${goalText}`,
            completed: false
          });
          day.tasks.push({
            id: `task-${Math.random().toString(36).substring(2, 6)}`,
            title: d === 5 ? "Take time for self-care and maintain work-life balance" :
                   d === 6 ? "Prepare mentally for the next week's challenges" :
                   "Review progress and adjust approach if needed",
            completed: false
          });
        } else {
          // Third month - refinement and completion
          day.tasks.push({
            id: `task-${Math.random().toString(36).substring(2, 6)}`,
            title: d === 5 ? "Final weekend review: Assess overall progress toward goal" :
                   d === 6 ? "Prepare presentation or documentation of achievements" :
                   "Finalize remaining steps for goal completion",
            completed: false
          });
          day.tasks.push({
            id: `task-${Math.random().toString(36).substring(2, 6)}`,
            title: d === 5 ? "Reflect on lessons learned throughout the 90-day journey" :
                   d === 6 ? "Set future goals based on this 90-day experience" :
                   "Document progress and achievements",
            completed: false
          });
        }
        
        week.days.push(day);
      }
      
      return week;
    };
    
    // Assign existing weeks to months properly
    // First, collect all weeks from the provided data
    let allWeeks = [];
    
    // Add existing weeks from input data
    for (let i = 0; i < existingWeeks.length; i++) {
      const week = existingWeeks[i];
      // Create a deep copy and ensure it has an ID
      const weekCopy = {
        id: week.id || `week-${Math.random().toString(36).substring(2, 6)}`,
        title: week.title || `Week ${i + 1}`,
        days: week.days || []
      };
      
      // Ensure the days have proper structure
      if (weekCopy.days.length === 0) {
        // If no days, generate them
        for (let d = 0; d < 7; d++) {
          weekCopy.days.push({
            id: `day-${Math.random().toString(36).substring(2, 6)}`,
            title: `Day ${d + 1}`,
            tasks: [
              {
                id: `task-${Math.random().toString(36).substring(2, 6)}`,
                title: `Task for ${goalText}`,
                completed: false
              }
            ]
          });
        }
      }
      
      allWeeks.push(weekCopy);
    }
    
    // Generate additional weeks if needed to have a total of 12 weeks
    while (allWeeks.length < 12) {
      const weekNum = allWeeks.length + 1;
      let monthNum = 1;
      if (weekNum > 4) monthNum = 2;
      if (weekNum > 8) monthNum = 3;
      
      allWeeks.push(generateWeek(monthNum, weekNum));
    }
    
    // Now distribute weeks properly across months
    // Month 1: Weeks 1-4
    firstMonth.weeks = allWeeks.slice(0, 4);
    
    // Month 2: Weeks 5-8
    secondMonth.weeks = allWeeks.slice(4, 8);
    
    // Month 3: Weeks 9-12
    thirdMonth.weeks = allWeeks.slice(8, 12);
    
    // Create the final plan with correctly distributed weeks
    const fixedPlan = {
      months: [firstMonth, secondMonth, thirdMonth],
      goal: goalText
    };
    
    console.log("Fixed plan with properly distributed weeks:", JSON.stringify(fixedPlan, null, 2).substring(0, 200) + "...");
    return fixedPlan;
  }
  
  // If we can't determine structure, return empty plan
  console.log("Could not determine plan structure, returning empty plan");
  return { months: [], goal: goalText };
};

// Test the function
const fixedPlan = fixPlanStructure(planData);

// Validate the structure
if (fixedPlan.months && Array.isArray(fixedPlan.months) && fixedPlan.months.length > 0) {
  console.log("Success! The plan structure is now valid");
  console.log(`Number of months: ${fixedPlan.months.length}`);
  
  // Check each month
  fixedPlan.months.forEach((month, index) => {
    console.log(`Month ${index + 1} title: ${month.title}`);
    console.log(`Number of weeks in month ${index + 1}: ${month.weeks.length}`);
    
    // Check the weeks in each month
    month.weeks.forEach((week, weekIndex) => {
      console.log(`  Week ${weekIndex + 1} in month ${index + 1}: ${week.title}`);
    });
  });
} else {
  console.error("Failed! The plan structure is still invalid");
}
