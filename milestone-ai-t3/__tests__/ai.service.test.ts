import { describe, it, expect, vi } from 'vitest';
import { AIService } from '~/server/services/ai.service';

describe('AIService', () => {
  it('should create an instance successfully', () => {
    const aiService = new AIService();
    expect(aiService).toBeDefined();
    expect(typeof aiService.generatePlan).toBe('function');
    expect(typeof aiService.chat).toBe('function');
    expect(typeof aiService.generateSuggestions).toBe('function');
    expect(typeof aiService.generatePlanStream).toBe('function');
    expect(typeof aiService.chatStream).toBe('function');
  });

  it('should have proper method signatures', () => {
    const aiService = new AIService();
    
    // Check that methods exist and are functions
    expect(aiService.generatePlan).toBeInstanceOf(Function);
    expect(aiService.chat).toBeInstanceOf(Function);
    expect(aiService.generateSuggestions).toBeInstanceOf(Function);
    expect(aiService.generatePlanStream).toBeInstanceOf(Function);
    expect(aiService.chatStream).toBeInstanceOf(Function);
  });
});
