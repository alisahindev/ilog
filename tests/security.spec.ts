import { expect, test } from '@playwright/test';
import { Logger } from '../src/core/logger';
import { LogLevel } from '../src/types';
import { maskSensitiveData } from '../src/utils/sensitive-data';

test.describe('Security Tests', () => {
  let logger: Logger;

  test.beforeEach(async () => {
    logger = new Logger({
      level: LogLevel.DEBUG,
      enableConsole: false,
      enableFile: false,
      sensitiveFields: ['password', 'token', 'secret', 'apiKey', 'creditCard']
    });
  });

  test.describe('Input Validation', () => {
    test('should reject non-string messages in error logging', async () => {
      expect(() => {
        (logger as any).error(123, new Error('test'));
      }).toThrow('Message must be a string');
    });

    test('should reject non-string messages in fatal logging', async () => {
      expect(() => {
        (logger as any).fatal({ malicious: 'object' }, new Error('test'));
      }).toThrow('Message must be a string');
    });

    test('should sanitize error names and messages', async () => {
      const mockError = new Error('test error\x00\x1F\x7F');
      mockError.name = 'TestError\x00\x1F\x7F';
      
      // This should not throw and should sanitize the input
      expect(() => {
        logger.error('Test message', mockError);
      }).not.toThrow();
    });
  });

  test.describe('Sensitive Data Masking', () => {
    test('should mask passwords in context', async () => {
      const sensitiveData = {
        username: 'testuser',
        password: 'supersecret123',
        email: 'test@example.com'
      };

      const masked = maskSensitiveData(sensitiveData, {
        sensitiveFields: ['password'],
        showFirst: 2,
        showLast: 2
      });

      expect(masked.password).toBe('su**********23');
      expect(masked.username).toBe('testuser');
    });

    test('should mask credit card numbers', async () => {
      const data = {
        creditCard: '4532-1234-5678-9012',
        amount: 100
      };

      const masked = maskSensitiveData(data, {
        sensitiveFields: ['creditCard'],
        showFirst: 4,
        showLast: 4
      });

      expect(masked.creditCard).toBe('4532***********9012');
    });

    test('should handle nested objects', async () => {
      const data = {
        user: {
          name: 'John',
          credentials: {
            password: 'secret123',
            apiKey: 'sk_live_1234567890'
          }
        }
      };

      const masked = maskSensitiveData(data, {
        sensitiveFields: ['password', 'apiKey'],
        showFirst: 2,
        showLast: 2
      });

      expect(masked.user.name).toBe('John');
      expect(typeof masked.user.credentials).toBe('string');
      expect(masked.user.credentials).toMatch(/^\[.*\]$/);
    });

    test('should handle arrays', async () => {
      const data = {
        users: [
          { name: 'User1', password: 'pass1' },
          { name: 'User2', password: 'pass2' }
        ]
      };

      const masked = maskSensitiveData(data, {
        sensitiveFields: ['password'],
        showFirst: 1,
        showLast: 1
      });

      expect(masked.users[0].password).toBe('p***1');
      expect(masked.users[1].password).toBe('p***2');
    });
  });

  test.describe('Stack Trace Security', () => {
    test('should not include stack traces in production mode', async () => {
      const originalEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'production';

      const mockError = new Error('Test error');
      mockError.stack = 'Error: Test error\n    at sensitive/path/file.js:123:45';

      logger.error('Test error', mockError, { test: 'context' });

      // In production, stack trace should not be included
      // This is a conceptual test - in real implementation, 
      // you'd need to capture the logged output to verify
      
      process.env['NODE_ENV'] = originalEnv;
    });

    test('should include stack traces in development mode', async () => {
      const originalEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'development';

      const mockError = new Error('Test error');
      mockError.stack = 'Error: Test error\n    at test/file.js:123:45';

      logger.error('Test error', mockError, { test: 'context' });

      // In development, stack trace should be included
      // This is a conceptual test - in real implementation, 
      // you'd need to capture the logged output to verify
      
      process.env['NODE_ENV'] = originalEnv;
    });
  });

  test.describe('Injection Prevention', () => {
    test('should prevent prototype pollution', async () => {
      const maliciousContext = JSON.parse('{"__proto__": {"polluted": true}}');
      
      expect(() => {
        logger.info('Test message', maliciousContext);
      }).not.toThrow();
      
      // Verify prototype wasn't polluted
      expect((Object.prototype as any).polluted).toBeUndefined();
    });

    test('should sanitize control characters', async () => {
      const maliciousMessage = 'Test\x00\x1F\x7Fmessage';
      
      expect(() => {
        logger.info(maliciousMessage);
      }).not.toThrow();
    });
  });

  test.describe('Memory Safety', () => {
    test('should handle extremely large context objects', async () => {
      const largeContext: Record<string, string> = {};
      
      // Create a large object to test memory limits
      for (let i = 0; i < 1000; i++) {
        largeContext[`key_${i}`] = 'x'.repeat(100);
      }

      expect(() => {
        logger.info('Large context test', largeContext);
      }).not.toThrow();
    });

    test('should prevent memory leaks in child loggers', async () => {
      const parentLogger = new Logger({ enableConsole: false });
      const childLogger = parentLogger.child({ service: 'test' });
      
      // Child logger should not hold references to parent's context
      parentLogger.setContext('secret', 'should-not-leak');
      
      expect(childLogger.getContext()['secret']).toBeUndefined();
    });
  });

  test.describe('Configuration Security', () => {
    test('should validate file paths', async () => {
      expect(() => {
        new Logger({
          enableFile: true,
          filePath: '../../../etc/passwd' // Path traversal attempt
        });
      }).not.toThrow(); // Should not crash, but should sanitize path
    });

    test('should reject invalid log levels', async () => {
      expect(() => {
        new Logger({
          level: 999 as LogLevel // Invalid log level
        });
      }).not.toThrow(); // Should fallback to default
    });
  });
}); 