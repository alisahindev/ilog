import {
  BufferedWriter,
  FetchInterceptor,
  FileWriter,
  JsonFormatter,
  Logger,
  LogLevel,
  maskSensitiveData
} from '../src';

// Advanced logger configuration
const customLogger = new Logger({
  level: LogLevel.DEBUG,
  enableConsole: true,
  enableFile: true,
  filePath: './logs/advanced.log',
  maxFileSize: 5, // 5MB
  maxFiles: 10,
  formatter: new JsonFormatter(),
  enableApiLogging: true,
  enablePerformanceLogging: true,
  sensitiveFields: ['password', 'token', 'ssn', 'creditCard', 'apiKey'],
  customWriters: [
    // HTTP writer example (commented out for demo)
    // new HttpWriter('https://logs.example.com/api/logs', {
    //   'Authorization': 'Bearer your-api-token',
    //   'Content-Type': 'application/json'
    // }),
    
    // Buffered file writer
    new BufferedWriter(
      new FileWriter('./logs/buffered.log'),
      50, // buffer size
      3000 // flush interval in ms
    )
  ]
});


// Global context setting
customLogger.setContext('application', 'advanced-example');
customLogger.setContext('version', '1.0.0');
customLogger.setUserId('admin-user');
customLogger.setSessionId('session-12345');

// Different log level examples
customLogger.debug('Debug message for troubleshooting', { 
  debugInfo: 'This is only visible in debug mode' 
});

customLogger.info('Application startup completed', {
  startupTime: 1500,
  configuredModules: ['auth', 'database', 'api']
});

customLogger.warn('High memory usage detected', {
  memoryUsage: '85%',
  threshold: '80%',
  recommendation: 'Consider scaling up'
});

customLogger.error('Database connection failed', new Error('Connection timeout'), {
  database: 'postgresql',
  host: 'db.example.com',
  port: 5432,
  retryAttempt: 3
});

customLogger.fatal('Critical system failure', new Error('Out of memory'), {
  availableMemory: '10MB',
  requiredMemory: '500MB',
  action: 'System restart required'
});

// Performance monitoring examples
const dbTimer = customLogger.startTimer('database-operations');

// Simulate database operations
setTimeout(() => {
  dbTimer(); // Automatically logs duration and memory usage
}, 200);

// Manual performance logging
customLogger.logPerformance({
  timestamp: new Date(),
  level: LogLevel.INFO,
  message: 'Batch processing completed',
  operation: 'user-data-processing',
  duration: 2500,
  customMetrics: {
    recordsProcessed: 1000,
    successRate: 0.98,
    errorCount: 20,
    memoryPeak: 150 // MB
  }
});

// Sensitive data masking examples
const sensitiveUserData = {
  id: 12345,
  name: 'John Doe',
  email: 'john.doe@example.com',
  password: 'mySecretPassword123',
  ssn: '123-45-6789',
  creditCard: '4532-1234-5678-9012',
  phoneNumber: '+1-555-123-4567',
  address: {
    street: '123 Main St',
    city: 'Anytown',
    zipCode: '12345'
  },
  preferences: {
    newsletter: true,
    apiKey: 'sk_live_1234567890abcdef'
  }
};

const maskedData = maskSensitiveData(sensitiveUserData, {
  sensitiveFields: ['password', 'ssn', 'creditCard', 'apiKey'],
  showFirst: 2,
  showLast: 2
});

customLogger.info('User data processing', { userData: maskedData });

// Child logger with service-specific context
const authServiceLogger = customLogger.child({
  service: 'authentication',
  version: '2.1.0',
  endpoint: '/api/v2/auth'
});

authServiceLogger.info('User authentication attempt', {
  userId: 'user_456',
  method: 'oauth2',
  provider: 'google'
});

// API interceptor for automatic logging
const apiInterceptor = new FetchInterceptor(customLogger, {
  logRequests: true,
  logResponses: true,
  logHeaders: true,
  logBodies: true,
  maskSensitiveData: true,
  sensitiveFields: ['authorization', 'x-api-key', 'cookie'],
  maxBodyLength: 1000
});

apiInterceptor.install();

// Simulate database service
class DatabaseService {
  private logger = customLogger.child({ service: 'database' });
  
  async getUserById(userId: string) {
    const timer = this.logger.startTimer('get-user-by-id');
    
    try {
      this.logger.info('Fetching user from database', { userId });
      
      // Simulate database query
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const user = { id: userId, name: 'Sample User', email: 's***@example.com' };
      
      this.logger.info('User fetched successfully', { userId, found: true });
      return user;
      
    } catch (error) {
      this.logger.error('Failed to fetch user', error as Error, { userId });
      throw error;
    } finally {
      timer();
    }
  }
}

// Service usage
const dbService = new DatabaseService();

async function testDatabaseService() {
  try {
    const user = await dbService.getUserById('user_123');
    console.log('User fetched:', user);
  } catch (error) {
    console.error('Database error:', error);
  }
}

// Batch logging example
async function processBatchOperations() {
  const batchLogger = customLogger.child({ operation: 'batch-process' });
  const timer = batchLogger.startTimer('batch-processing');
  
  const items = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
  
  for (const item of items) {
    const itemTimer = batchLogger.startTimer(`process-item-${item.id}`);
    
    try {
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      batchLogger.debug('Item processed', { itemId: item.id });
    } catch (error) {
      batchLogger.error('Item processing error', error as Error, { itemId: item.id });
    } finally {
      itemTimer();
    }
  }
  
  timer();
  batchLogger.info('Batch operation completed', { totalItems: items.length });
}

// Run test functions will be handled by the main execution function

// Main execution function to handle all async operations
async function runAdvancedExample() {
  console.log('Advanced logger examples started...');
  
  // Wait for initial timer to complete
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Run database service test
  await testDatabaseService();
  
  // Wait a bit more before batch processing
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Run batch operations
  await processBatchOperations();
  
  console.log('Advanced logger examples completed!');
  
  // Give some time for any buffered logs to flush and pending operations to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
}

// Run the advanced example
runAdvancedExample().catch((error) => {
  console.error('Advanced example failed:', error);
  throw error;
}); 