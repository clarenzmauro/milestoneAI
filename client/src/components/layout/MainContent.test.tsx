import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MainContent from './MainContent';
import { PlanContext } from '../../contexts/PlanContext';
import { MonthlyMilestone, FullPlan } from '../../types/planTypes';
import { ChatMessage } from '../../types/chatTypes';
import { InteractionMode } from '../../types/generalTypes';

// Mock child components
jest.mock('../modals/AchievementsModal', () => {
  return function MockAchievementsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
  goal: 'Test Goal',
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
        },
        {
          week: 2,
          objective: 'Week 2 Objective',
          dailyTasks: [
            { day: 1, description: 'Task 3', completed: false },
            { day: 2, description: 'Task 4', completed: false }
          ]
        }
      ]
    },
    {
      month: 2,
      milestone: 'Second Month',
      weeklyObjectives: [
        {
          week: 1,
          objective: 'Month 2 Week 1',
          dailyTasks: [
            { day: 1, description: 'Task 5', completed: true }
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
  type PlanContextValue = {
    plan: FullPlan | null;
    isLoading: boolean;
    error: string | null;
    currentChatHistory: ChatMessage[];
    currentInteractionMode: InteractionMode;
    generateNewPlan: (goal: string, chatHistory: ChatMessage[], interactionMode: InteractionMode) => Promise<void>;
    setPlanFromString: (planString: string, originalGoal: string | undefined, chatHistory: ChatMessage[], interactionMode: InteractionMode) => Promise<boolean>;
    setPlan: (loadedPlan: FullPlan, chatHistory?: ChatMessage[], interactionMode?: InteractionMode) => void;
    saveCurrentPlan: () => Promise<void>;
    toggleTaskCompletion: (monthIndex: number, weekIndex: number, taskDay: number) => Promise<void>;
    resetPlanState: () => void;
  };

  const renderWithContext = (
    contextValue: Partial<PlanContextValue> = {}
  ) => {
    const defaultContext: PlanContextValue = {
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

  it('shows loading state', () => {
    renderWithContext({ isLoading: true });
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading your plan...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    renderWithContext({ error: 'Test error' });
    expect(screen.getByText('Error loading plan: Test error')).toBeInTheDocument();
  });

  it('shows empty state when no plan exists', () => {
    renderWithContext();
    expect(screen.getByTestId('lightbulb-icon')).toBeInTheDocument();
    expect(screen.getByText('Ready to Plan Your Success?')).toBeInTheDocument();
  });

  describe('with plan data', () => {
    beforeEach(() => {
      renderWithContext({ plan: mockPlan });
    });

    it('displays the goal', () => {
      expect(screen.getByText('Goal: Test Goal')).toBeInTheDocument();
    });

    it('shows progress information correctly', () => {
      expect(screen.getByText('2 of 5 tasks completed')).toBeInTheDocument();
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '40');
    });

    it('displays monthly milestones', () => {
      expect(screen.getByText('First Month')).toBeInTheDocument();
      expect(screen.getByText('Second Month')).toBeInTheDocument();
    });

    it('displays weekly objectives', () => {
      expect(screen.getByText('Week 1 Objective')).toBeInTheDocument();
      expect(screen.getByText('Week 2 Objective')).toBeInTheDocument();
    });

    it('displays daily tasks', () => {
      ['Task 1', 'Task 2'].forEach(task => {
        expect(screen.getByText(task)).toBeInTheDocument();
      });
    });

    it('handles task completion toggle', () => {
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      expect(mockFunctions.toggleTaskCompletion).toHaveBeenCalledWith(0, 0, 1);
    });

    it('opens achievements modal', () => {
      fireEvent.click(screen.getByTitle('View Achievements'));
      expect(screen.getByTestId('achievements-modal')).toBeInTheDocument();
    });

    it('handles month selection', () => {
      fireEvent.click(screen.getByText('Second Month'));
      expect(screen.getByText('Month 2 Week 1')).toBeInTheDocument();
    });

    it('renders placeholder cards for incomplete weeks', () => {
      const placeholders = screen.getAllByText(/Week [3-4]/);
      expect(placeholders).toHaveLength(2);
    });
  });
});