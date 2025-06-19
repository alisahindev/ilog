// Jest test setup file
import { jest } from '@jest/globals';

// Security: Ensure we're in test environment
if (process.env['NODE_ENV'] !== 'test') {
  process.env['NODE_ENV'] = 'test';
}

// Security: Mock sensitive modules in tests
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-123'),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mocked-hash')
  }))
}));

// Security: Prevent network calls in tests
jest.mock('http');
jest.mock('https');
jest.mock('fs');

// Increase timeout for security-related tests
jest.setTimeout(30000);

// Global test configuration for security
global.console = {
  ...console,
  // Suppress console.log in tests for security (avoid credential leaks)
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}; 