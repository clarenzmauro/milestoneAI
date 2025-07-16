import { describe, it, expect, vi } from 'vitest';
import { aiRouter } from '~/server/api/routers/ai';

// Simple mock context
const createMockContext = (userId: string) => ({
  db: {
    plan: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
  user: { id: userId, email: 'test@example.com' },
  headers: new Headers(),
}) as any;

describe('AI Router', () => {
  it('should exist and have the expected procedures', () => {
    expect(aiRouter).toBeDefined();
    expect(typeof aiRouter.generatePlan).toBe('function');
    expect(typeof aiRouter.chat).toBe('function');
    expect(typeof aiRouter.streamChat).toBe('function');
    expect(typeof aiRouter.getSuggestions).toBe('function');
  });

  it('should create a caller successfully', () => {
    const ctx = createMockContext('test-user');
    const caller = aiRouter.createCaller(ctx);
    
    expect(caller).toBeDefined();
    expect(typeof caller.generatePlan).toBe('function');
    expect(typeof caller.chat).toBe('function');
    expect(typeof caller.streamChat).toBe('function');
    expect(typeof caller.getSuggestions).toBe('function');
  });
});
