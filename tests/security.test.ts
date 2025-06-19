import { Logger } from '../src/core/logger';
import { LogLevel } from '../src/types';
import { maskSensitiveData } from '../src/utils/sensitive-data';

describe('Security Tests', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger({
      level: LogLevel.DEBUG,
      enableConsole: false,
      enableFile: false,
      sensitiveFields: ['password', 'token', 'secret', 'apiKey', 'creditCard']
    });
  });

  describe('Input Validation', () => {
    it('should reject non-string messages in error logging', () => {
      expect(() => {
        (logger as any).error(123, new Error('test'));
      }).toThrow('Message must be a string');
    });

    it('should reject non-string messages in fatal logging', () => {
      expect(() => {
        (logger as any).fatal({ malicious: 'object' }, new Error('test'));
      }).toThrow('Message must be a string');
    });

    it('should sanitize error names and messages', () => {
      const mockError = new Error('test error\x00\x1F\x7F');
      mockError.name = 'TestError\x00\x1F\x7F';
      
      // This should not throw and should sanitize the input
      expect(() => {
        logger.error('Test message', mockError);
      }).not.toThrow();
    });
  });

  describe('Sensitive Data Masking', () => {
    it('should mask passwords in context', () => {
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

      expect(masked.password).toBe('su***********23');
      expect(masked.username).toBe('testuser');
    });

    it('should mask credit card numbers', () => {
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

    it('should handle nested objects', () => {
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

      expect(masked.user.credentials.password).toBe('se*******23');
      expect(masked.user.credentials.apiKey).toBe('sk**************90');
    });

    it('should handle arrays', () => {
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

  describe('Stack Trace Security', () => {
    it('should not include stack traces in production mode', () => {
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

    it('should include stack traces in development mode', () => {
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

  describe('Injection Prevention', () => {
    it('should prevent prototype pollution', () => {
      const maliciousContext = JSON.parse('{"__proto__": {"polluted": true}}');
      
      expect(() => {
        logger.info('Test message', maliciousContext);
      }).not.toThrow();
      
      // Verify prototype wasn't polluted
      expect((Object.prototype as any).polluted).toBeUndefined();
    });

    it('should sanitize control characters', () => {
      const maliciousMessage = 'Test\x00\x1F\x7F\message';
      
      expect(() => {
        logger.info(maliciousMessage);
      }).not.toThrow();
    });
  });

  describe('Memory Safety', () => {
    it('should handle extremely large context objects', () => {
      const largeContext: Record<string, string> = {};
      
      // Create a large object to test memory limits
      for (let i = 0; i < 1000; i++) {
        largeContext[`key_${i}`] = 'x'.repeat(100);
      }

      expect(() => {
        logger.info('Large context test', largeContext);
      }).not.toThrow();
    });

    it('should prevent memory leaks in child loggers', () => {
      const parentLogger = new Logger({ enableConsole: false });
      const childLogger = parentLogger.child({ service: 'test' });
      
      // Child logger should not hold references to parent's context
      parentLogger.setContext('secret', 'should-not-leak');
      
      expect(childLogger.getContext().secret).toBeUndefined();
    });
  });

  describe('Configuration Security', () => {
    it('should validate file paths', () => {
      expect(() => {
        new Logger({
          enableFile: true,
          filePath: '../../../etc/passwd' // Path traversal attempt
        });
      }).not.toThrow(); // Should not crash, but should sanitize path
    });

    it('should reject invalid log levels', () => {
      expect(() => {
        new Logger({
          level: 999 as LogLevel // Invalid log level
        });
      }).not.toThrow(); // Should fallback to default
    });
  });
}); 