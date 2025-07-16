import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock crypto.randomUUID for Node.js environment
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mocked-uuid-' + Math.random().toString(36).substr(2, 9)),
  },
});

// Mock console.error to prevent tests from failing due to error logging
vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock environment variables
Object.assign(process.env, {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  NEXTAUTH_SECRET: 'test-secret',
  NEXTAUTH_URL: 'http://localhost:3000',
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  GEMINI_API_KEY: 'test-gemini-api-key',
  GOOGLE_CLIENT_ID: 'test-google-client-id',
  GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
});

// Mock T3 env
vi.mock('~/env', () => ({
  env: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    NEXTAUTH_SECRET: 'test-secret',
    NEXTAUTH_URL: 'http://localhost:3000',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    GEMINI_API_KEY: 'test-gemini-api-key',
    GOOGLE_CLIENT_ID: 'test-google-client-id',
    GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  },
}));

// Mock Prisma client
vi.mock('~/server/db', () => ({
  db: {
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
  },
}));

// Mock Google Generative AI
vi.mock('@google/generative-ai', () => {
  const mockGenerateContent = vi.fn();
  const mockGenerateContentStream = vi.fn();
  const mockSendMessage = vi.fn();
  const mockSendMessageStream = vi.fn();
  const mockStartChat = vi.fn();

  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
        generateContentStream: mockGenerateContentStream,
        startChat: mockStartChat,
      }),
    })),
    mockGenerateContent,
    mockGenerateContentStream,
    mockSendMessage,
    mockSendMessageStream,
    mockStartChat,
  };
});

// Mock AI Service
vi.mock('~/server/services/ai.service', () => ({
  aiService: {
    generatePlan: vi.fn(),
    chat: vi.fn(),
    generateSuggestions: vi.fn(),
    generatePlanStream: vi.fn(),
    chatStream: vi.fn(),
  },
  AIService: vi.fn().mockImplementation(() => ({
    generatePlan: vi.fn(),
    chat: vi.fn(),
    generateSuggestions: vi.fn(),
    generatePlanStream: vi.fn(),
    chatStream: vi.fn(),
  })),
}));
