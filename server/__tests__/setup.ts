import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Global test setup
beforeAll(async () => {
  // Setup code that runs once before all tests
  console.log('Starting test suite...');
});

afterAll(async () => {
  // Cleanup code that runs once after all tests
  console.log('Test suite complete.');
});

beforeEach(() => {
  // Setup code that runs before each test
});

afterEach(() => {
  // Cleanup code that runs after each test
});

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
// Never call real AI providers from tests (tests that need one point it at a local mock).
delete process.env.INCEPTION_API_KEY;
delete process.env.GOOGLE_API_KEY;
delete process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
