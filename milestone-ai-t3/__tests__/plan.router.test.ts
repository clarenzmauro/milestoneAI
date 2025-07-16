import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TRPCError } from '@trpc/server';

// Mock the database before importing the router
const mockPrismaClient = {
  plan: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  $on: vi.fn(),
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $use: vi.fn(),
  $transaction: vi.fn(),
  $executeRaw: vi.fn(),
  $executeRawUnsafe: vi.fn(),
  $queryRaw: vi.fn(),
  $queryRawUnsafe: vi.fn(),
} as any;

// Import the router
import { planRouter } from '~/server/api/routers/plan';

// Mock Supabase User type
const createMockUser = (userId: string = 'test-user-id') => ({
  id: userId,
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2023-01-01T00:00:00.000Z',
  email: 'test@example.com',
  email_confirmed_at: '2023-01-01T00:00:00.000Z',
  last_sign_in_at: '2023-01-01T00:00:00.000Z',
  role: 'authenticated',
  updated_at: '2023-01-01T00:00:00.000Z',
});

// Mock context
const createMockContext = (userId: string = 'test-user-id') => ({
  db: mockPrismaClient,
  user: createMockUser(userId),
  headers: new Headers(),
});

// Mock data with valid CUID format
const mockPlan = {
  id: 'clp1a2b3c4d5e6f7g8h9i0j1',
  userId: 'clp1a2b3c4d5e6f7g8h9i0j2',
  goal: 'Test goal',
  summary: 'Test summary',
  timeline: '1 month',
  monthlyMilestones: [
    {
      id: 'clp1a2b3c4d5e6f7g8h9i0j3',
      title: 'First milestone',
      description: 'Description',
      completed: false,
      priority: 'medium' as const,
    },
  ],
  weeklyObjectives: [
    {
      id: 'clp1a2b3c4d5e6f7g8h9i0j4',
      title: 'First objective',
      description: 'Description',
      completed: false,
      weekNumber: 1,
    },
  ],
  dailyTasks: [
    {
      id: 'clp1a2b3c4d5e6f7g8h9i0j5',
      title: 'First task',
      description: 'Description',
      completed: false,
      estimatedHours: 2,
    },
  ],
  achievements: [],
  chatHistory: [],
  interactionMode: 'plan' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCreatePlanInput = {
  goal: 'Test goal',
  summary: 'Test summary',
  timeline: '1 month',
  monthlyMilestones: [
    {
      title: 'First milestone',
      description: 'Description',
      completed: false,
      priority: 'medium' as const,
    },
  ],
  interactionMode: 'plan' as const,
};

describe('planRouter', () => {
  let caller: ReturnType<typeof planRouter.createCaller>;
  let mockContext: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockContext();
    caller = planRouter.createCaller(mockContext);
  });

  describe('create', () => {
    it('should create a new plan successfully', async () => {
      mockPrismaClient.plan.create.mockResolvedValue(mockPlan);

      const result = await caller.create(mockCreatePlanInput);

      expect(mockPrismaClient.plan.create).toHaveBeenCalledWith({
        data: {
          ...mockCreatePlanInput,
          userId: 'test-user-id',
        },
      });
      expect(result).toEqual(mockPlan);
    });

    it('should throw TRPCError when database operation fails', async () => {
      // Clear all mocks and set up fresh ones for this test
      vi.clearAllMocks();
      mockContext = createMockContext();
      caller = planRouter.createCaller(mockContext);
      
      // Use a simple string rejection instead of Error object
      mockPrismaClient.plan.create.mockRejectedValue('Database error');

      await expect(caller.create(mockCreatePlanInput)).rejects.toThrow(TRPCError);
      await expect(caller.create(mockCreatePlanInput)).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create plan',
      });
    });
  });

  describe('getAll', () => {
    const mockPlans = [mockPlan];

    it('should fetch all plans with default pagination', async () => {
      mockPrismaClient.plan.findMany.mockResolvedValue(mockPlans);
      mockPrismaClient.plan.count.mockResolvedValue(1);

      const result = await caller.getAll();

      expect(mockPrismaClient.plan.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
      expect(result).toEqual({
        plans: mockPlans,
        total: 1,
        hasMore: false,
      });
    });

    it('should fetch plans with custom pagination and filters', async () => {
      mockPrismaClient.plan.findMany.mockResolvedValue(mockPlans);
      mockPrismaClient.plan.count.mockResolvedValue(1);

      const input = {
        limit: 10,
        offset: 5,
        interactionMode: 'plan' as const,
        createdAfter: '2023-01-01T00:00:00.000Z',
      };

      const result = await caller.getAll(input);

      expect(mockPrismaClient.plan.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          interactionMode: 'plan',
          createdAt: { gte: new Date('2023-01-01T00:00:00.000Z') },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 5,
      });
      expect(result).toEqual({
        plans: mockPlans,
        total: 1,
        hasMore: false,
      });
    });

    it('should throw TRPCError when database operation fails', async () => {
      // Clear all mocks and set up fresh ones for this test
      vi.clearAllMocks();
      mockContext = createMockContext();
      caller = planRouter.createCaller(mockContext);
      
      // Use a simple string rejection instead of Error object
      mockPrismaClient.plan.findMany.mockRejectedValue('Database error');

      await expect(caller.getAll()).rejects.toThrow(TRPCError);
      await expect(caller.getAll()).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch plans',
      });
    });
  });

  describe('getById', () => {
    it('should fetch a plan by ID successfully', async () => {
      mockPrismaClient.plan.findFirst.mockResolvedValue(mockPlan);

      const result = await caller.getById({ id: 'clp1a2b3c4d5e6f7g8h9i0j1' });

      expect(mockPrismaClient.plan.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'clp1a2b3c4d5e6f7g8h9i0j1',
          userId: 'test-user-id',
        },
      });
      expect(result).toEqual(mockPlan);
    });

    it('should throw NOT_FOUND error when plan does not exist', async () => {
      mockPrismaClient.plan.findFirst.mockResolvedValue(null);

      await expect(caller.getById({ id: 'clp1a2b3c4d5e6f7g8h9i0j9' })).rejects.toThrow(TRPCError);
      await expect(caller.getById({ id: 'clp1a2b3c4d5e6f7g8h9i0j9' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Plan not found or you don\'t have permission to access it',
      });
    });

    it('should throw TRPCError when database operation fails', async () => {
      // Clear all mocks and set up fresh ones for this test
      vi.clearAllMocks();
      mockContext = createMockContext();
      caller = planRouter.createCaller(mockContext);
      
      // Use a simple string rejection instead of Error object
      mockPrismaClient.plan.findFirst.mockRejectedValue('Database error');

      await expect(caller.getById({ id: 'clp1a2b3c4d5e6f7g8h9i0j1' })).rejects.toThrow(TRPCError);
      await expect(caller.getById({ id: 'clp1a2b3c4d5e6f7g8h9i0j1' })).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch plan',
      });
    });
  });

  describe('update', () => {
    const updateInput = {
      id: 'clp1a2b3c4d5e6f7g8h9i0j1',
      goal: 'Updated goal',
      summary: 'Updated summary',
    };

    it('should update a plan successfully', async () => {
      mockPrismaClient.plan.findFirst.mockResolvedValue(mockPlan);
      const updatedPlan = { ...mockPlan, ...updateInput };
      mockPrismaClient.plan.update.mockResolvedValue(updatedPlan);

      const result = await caller.update(updateInput);

      expect(mockPrismaClient.plan.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'clp1a2b3c4d5e6f7g8h9i0j1',
          userId: 'test-user-id',
        },
      });
      expect(mockPrismaClient.plan.update).toHaveBeenCalledWith({
        where: { id: 'clp1a2b3c4d5e6f7g8h9i0j1' },
        data: {
          goal: 'Updated goal',
          summary: 'Updated summary',
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(updatedPlan);
    });

    it('should throw NOT_FOUND error when plan does not exist', async () => {
      mockPrismaClient.plan.findFirst.mockResolvedValue(null);

      await expect(caller.update(updateInput)).rejects.toThrow(TRPCError);
      await expect(caller.update(updateInput)).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Plan not found or you don\'t have permission to update it',
      });
    });
  });

  describe('delete', () => {
    it('should delete a plan successfully', async () => {
      mockPrismaClient.plan.findFirst.mockResolvedValue(mockPlan);
      mockPrismaClient.plan.delete.mockResolvedValue(mockPlan);

      const result = await caller.delete({ id: 'clp1a2b3c4d5e6f7g8h9i0j1' });

      expect(mockPrismaClient.plan.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'clp1a2b3c4d5e6f7g8h9i0j1',
          userId: 'test-user-id',
        },
      });
      expect(mockPrismaClient.plan.delete).toHaveBeenCalledWith({
        where: { id: 'clp1a2b3c4d5e6f7g8h9i0j1' },
      });
      expect(result).toEqual({ success: true });
    });

    it('should throw NOT_FOUND error when plan does not exist', async () => {
      mockPrismaClient.plan.findFirst.mockResolvedValue(null);

      await expect(caller.delete({ id: 'clp1a2b3c4d5e6f7g8h9i0j9' })).rejects.toThrow(TRPCError);
      await expect(caller.delete({ id: 'clp1a2b3c4d5e6f7g8h9i0j9' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Plan not found or you don\'t have permission to delete it',
      });
    });
  });

  describe('getByMode', () => {
    it('should fetch plans by interaction mode', async () => {
      const chatPlans = [{ ...mockPlan, interactionMode: 'chat' }];
      mockPrismaClient.plan.findMany.mockResolvedValue(chatPlans);

      const result = await caller.getByMode({ mode: 'chat' });

      expect(mockPrismaClient.plan.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          interactionMode: 'chat',
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
      expect(result).toEqual(chatPlans);
    });
  });

  describe('bulkUpdate', () => {
    const bulkUpdateInput = {
      planId: 'clp1a2b3c4d5e6f7g8h9i0j1',
      milestones: [
        {
          id: 'clp1a2b3c4d5e6f7g8h9i0j6',
          title: 'Updated milestone',
          completed: true,
          priority: 'high' as const,
        },
      ],
    };

    it('should bulk update plan items successfully', async () => {
      mockPrismaClient.plan.findFirst.mockResolvedValue(mockPlan);
      const updatedPlan = { ...mockPlan, monthlyMilestones: bulkUpdateInput.milestones };
      mockPrismaClient.plan.update.mockResolvedValue(updatedPlan);

      const result = await caller.bulkUpdate(bulkUpdateInput);

      expect(mockPrismaClient.plan.update).toHaveBeenCalledWith({
        where: { id: 'clp1a2b3c4d5e6f7g8h9i0j1' },
        data: {
          monthlyMilestones: bulkUpdateInput.milestones,
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(updatedPlan);
    });

    it('should throw NOT_FOUND error when plan does not exist', async () => {
      mockPrismaClient.plan.findFirst.mockResolvedValue(null);

      await expect(caller.bulkUpdate(bulkUpdateInput)).rejects.toThrow(TRPCError);
      await expect(caller.bulkUpdate(bulkUpdateInput)).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Plan not found or you don\'t have permission to update it',
      });
    });
  });

  describe('updateProgress', () => {
    const progressInput = {
      planId: 'clp1a2b3c4d5e6f7g8h9i0j1',
      type: 'milestone' as const,
      itemId: 'clp1a2b3c4d5e6f7g8h9i0j3',
      completed: true,
    };

    it('should update milestone progress successfully', async () => {
      mockPrismaClient.plan.findFirst.mockResolvedValue(mockPlan);
      const updatedPlan = {
        ...mockPlan,
        monthlyMilestones: [
          { ...mockPlan.monthlyMilestones[0], completed: true },
        ],
      };
      mockPrismaClient.plan.update.mockResolvedValue(updatedPlan);

      const result = await caller.updateProgress(progressInput);

      expect(mockPrismaClient.plan.update).toHaveBeenCalledWith({
        where: { id: 'clp1a2b3c4d5e6f7g8h9i0j1' },
        data: {
          monthlyMilestones: [
            { ...mockPlan.monthlyMilestones[0], completed: true },
          ],
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(updatedPlan);
    });

    it('should update objective progress successfully', async () => {
      const objectiveProgressInput = {
        planId: 'clp1a2b3c4d5e6f7g8h9i0j1',
        type: 'objective' as const,
        itemId: 'clp1a2b3c4d5e6f7g8h9i0j4',
        completed: true,
      };

      mockPrismaClient.plan.findFirst.mockResolvedValue(mockPlan);
      const updatedPlan = {
        ...mockPlan,
        weeklyObjectives: [
          { ...mockPlan.weeklyObjectives[0], completed: true },
        ],
      };
      mockPrismaClient.plan.update.mockResolvedValue(updatedPlan);

      const result = await caller.updateProgress(objectiveProgressInput);

      expect(mockPrismaClient.plan.update).toHaveBeenCalledWith({
        where: { id: 'clp1a2b3c4d5e6f7g8h9i0j1' },
        data: {
          weeklyObjectives: [
            { ...mockPlan.weeklyObjectives[0], completed: true },
          ],
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(updatedPlan);
    });

    it('should update task progress successfully', async () => {
      const taskProgressInput = {
        planId: 'clp1a2b3c4d5e6f7g8h9i0j1',
        type: 'task' as const,
        itemId: 'clp1a2b3c4d5e6f7g8h9i0j5',
        completed: true,
      };

      mockPrismaClient.plan.findFirst.mockResolvedValue(mockPlan);
      const updatedPlan = {
        ...mockPlan,
        dailyTasks: [
          { ...mockPlan.dailyTasks[0], completed: true },
        ],
      };
      mockPrismaClient.plan.update.mockResolvedValue(updatedPlan);

      const result = await caller.updateProgress(taskProgressInput);

      expect(mockPrismaClient.plan.update).toHaveBeenCalledWith({
        where: { id: 'clp1a2b3c4d5e6f7g8h9i0j1' },
        data: {
          dailyTasks: [
            { ...mockPlan.dailyTasks[0], completed: true },
          ],
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(updatedPlan);
    });
  });

  describe('addAchievement', () => {
    const achievementInput = {
      planId: 'clp1a2b3c4d5e6f7g8h9i0j1',
      achievement: {
        title: 'New achievement',
        description: 'Achievement description',
        date: '2023-12-25T00:00:00.000Z',
        category: 'milestone' as const,
      },
    };

    it('should add achievement to plan successfully', async () => {
      mockPrismaClient.plan.findFirst.mockResolvedValue(mockPlan);
      const updatedPlan = {
        ...mockPlan,
        achievements: [
          {
            ...achievementInput.achievement,
            id: expect.any(String),
          },
        ],
      };
      mockPrismaClient.plan.update.mockResolvedValue(updatedPlan);

      const result = await caller.addAchievement(achievementInput);

      expect(mockPrismaClient.plan.update).toHaveBeenCalledWith({
        where: { id: 'clp1a2b3c4d5e6f7g8h9i0j1' },
        data: {
          achievements: [
            {
              ...achievementInput.achievement,
              id: expect.any(String),
            },
          ],
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(updatedPlan);
    });
  });

  describe('getStats', () => {
    it('should fetch plan statistics successfully', async () => {
      mockPrismaClient.plan.count
        .mockResolvedValueOnce(10) // totalPlans
        .mockResolvedValueOnce(6)  // chatPlans
        .mockResolvedValueOnce(4)  // planPlans
        .mockResolvedValueOnce(3); // recentPlans

      const result = await caller.getStats();

      expect(mockPrismaClient.plan.count).toHaveBeenCalledTimes(4);
      expect(result).toEqual({
        totalPlans: 10,
        chatPlans: 6,
        planPlans: 4,
        recentPlans: 3,
      });
    });

    it('should throw TRPCError when database operation fails', async () => {
      // Clear all mocks and set up fresh ones for this test
      vi.clearAllMocks();
      mockContext = createMockContext();
      caller = planRouter.createCaller(mockContext);
      
      // Use a simple string rejection instead of Error object
      mockPrismaClient.plan.count.mockRejectedValue('Database error');

      await expect(caller.getStats()).rejects.toThrow(TRPCError);
      await expect(caller.getStats()).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch plan statistics',
      });
    });
  });
});
