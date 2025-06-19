import { createLogger, FetchInterceptor, LogLevel } from '../src';

// Basic logger usage
const logger = createLogger({
  level: LogLevel.DEBUG,
  enableConsole: true,
  enableFile: true,
  filePath: './logs/app.log',
  enableApiLogging: true,
  sensitiveFields: ['password', 'token', 'email']
});

// Basic log examples
logger.info('Application started');
logger.debug('Debug information', { userId: 123, action: 'login' });
logger.warn('Warning message');
logger.error('An error occurred', new Error('Sample error'));

// Working with context
logger.setContext('requestId', 'req-123');
logger.setUserId('user-456');
logger.info('Log with context');

// Child logger
const childLogger = logger.child({ component: 'auth-service' });
childLogger.info('Auth service operation');

// Performance logging
const timer = logger.startTimer('database-query');
setTimeout(() => {
  timer(); // Writes performance log
}, 100);

// API interceptor example
const fetchInterceptor = new FetchInterceptor(logger, {
  logRequests: true,
  logResponses: true,
  logBodies: true,
  maskSensitiveData: true
});

fetchInterceptor.install();

// Sample API call (fetch will be automatically logged)
setTimeout(async () => {
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
    const data = await response.json();
    console.log('API Response:', data);
  } catch (error) {
    console.error('API Error:', error);
  }
}, 1000);

// Manual API logging
logger.logApiRequest('POST', '/api/users', {
  requestBody: { name: 'John', email: 'john@example.com', password: 'secret123' },
  requestHeaders: { 'Authorization': 'Bearer token123' }
});

logger.logApiResponse('POST', '/api/users', 201, 250, {
  responseBody: { id: 1, name: 'John', email: 'j***@example.com' }
});

// Error logging
logger.logApiError('GET', '/api/users/999', new Error('User not found'));

console.log('Logger examples are running...'); 