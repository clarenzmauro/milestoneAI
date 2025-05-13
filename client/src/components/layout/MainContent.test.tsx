import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { IPlanContext, PlanContext } from '../../contexts/PlanContext';
import { FullPlan } from '../../types/planTypes';
import MainContent from './MainContent';

// Mock child components
jest.mock('../modals/AchievementsModal', () => {
  return function MockAchievementsModal({ isOpen }: { isOpen: boolean }) {
    return isOpen ? <div data-testid="achievements-modal">Modal Content</div> : null;
  };
});

// Mock react-icons
jest.mock('react-icons/fa', () => ({
  FaLightbulb: () => <div data-testid="lightbulb-icon" />,
  FaTrophy: () => <div data-testid="trophy-icon" />
}));

// Mock the spinner
jest.mock('react-spinners/BarLoader', () => {
  return function MockBarLoader({ loading }: { loading: boolean }) {
    return loading ? <div data-testid="loading-spinner" /> : null;
  };
});

const mockPlan: FullPlan = {
  goal: 'Launch a successful online fitness coaching business in 90 days',
  monthlyMilestones: [
    {
      month: 1,
      milestone: 'First Month',
      weeklyObjectives: [
        {
          week: 1,
          objective: 'Week 1 Objective',
          dailyTasks: [
            { day: 1, description: 'Task 1', completed: false },
            { day: 2, description: 'Task 2', completed: true }
          ]
        }
      ]
    }
  ],
  chatHistory: [],
  interactionMode: 'plan'
};

const mockFunctions = {
  toggleTaskCompletion: jest.fn(),
  generateNewPlan: jest.fn(),
  setPlanFromString: jest.fn(),
  setPlan: jest.fn(),
  saveCurrentPlan: jest.fn(),
  resetPlanState: jest.fn()
};

describe('MainContent', () => {
  const renderWithContext = (contextValue: Partial<IPlanContext> = {}) => {
    const defaultContext: IPlanContext = {
      plan: null,
      isLoading: false,
      error: null,
      currentChatHistory: [],
      currentInteractionMode: 'plan',
      generateNewPlan: mockFunctions.generateNewPlan,
      setPlanFromString: mockFunctions.setPlanFromString,
      setPlan: mockFunctions.setPlan,
      saveCurrentPlan: mockFunctions.saveCurrentPlan,
      toggleTaskCompletion: mockFunctions.toggleTaskCompletion,
      resetPlanState: mockFunctions.resetPlanState
    };

    return render(
      <PlanContext.Provider value={{ ...defaultContext, ...contextValue }}>
        <MainContent />
      </PlanContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles initial goal creation and plan generation', async () => {
    renderWithContext({ plan: null });
    
    expect(screen.getByText("Ready to Plan Your Success?")).toBeInTheDocument();
    expect(screen.getByTestId("lightbulb-icon")).toBeInTheDocument();
    expect(screen.getByText("Use the sidebar to create your first goal and let MilestoneAI build your roadmap.")).toBeInTheDocument();
  });

  it('handles task completion and progress tracking', () => {
    renderWithContext({ plan: mockPlan });

    // Verify progress section
    expect(screen.getByText("Overall Progress")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 tasks completed")).toBeInTheDocument();
    
    // Test task toggle
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);
    expect(mockFunctions.toggleTaskCompletion).toHaveBeenCalledWith(0, 0, 1);
  });

  it('handles monthly and weekly navigation', () => {
    renderWithContext({ plan: mockPlan });
    
    // Check month section
    expect(screen.getByText("Monthly Milestones")).toBeInTheDocument();
    const monthCard = screen.getByText("Month 1");
    fireEvent.click(monthCard);
    
    // Check week section
    expect(screen.getByText("Weekly Objectives")).toBeInTheDocument();
    const weekCard = screen.getByText("Week 1");
    fireEvent.click(weekCard);
    
    // Verify daily tasks after navigation
    expect(screen.getByText("Daily Tasks")).toBeInTheDocument();
    expect(screen.getByText("Task 1")).toBeInTheDocument();
  });

  it('handles loading and error states', () => {
    // Test loading state
    renderWithContext({ isLoading: true, plan: null });
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading your plan...')).toBeInTheDocument();

    // Test error state
    renderWithContext({ error: 'Failed to load plan', plan: null });
    expect(screen.getByText('Error loading plan: Failed to load plan')).toBeInTheDocument();
  });

  it('handles viewing achievements', () => {
    renderWithContext({ plan: mockPlan });
    
    // Find and click trophy icon
    const trophyButton = screen.getByTestId('trophy-icon');
    expect(trophyButton).toBeInTheDocument();
    fireEvent.click(trophyButton);
    
    // Verify modal opens
    expect(screen.getByTestId('achievements-modal')).toBeInTheDocument();
  });
});
