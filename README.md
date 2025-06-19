# iLog - TypeScript Logger

A comprehensive, fully type-supported logging library for JavaScript/TypeScript projects. Easily manage API calls, performance metrics, and application logs with advanced features.

## Features

- 🎯 **Full TypeScript Support** - Complete type safety
- 🚀 **API Logging** - Automatic HTTP request/response logging
- 📊 **Performance Monitoring** - Track operation times and memory usage
- 🔒 **Sensitive Data Masking** - Automatic masking of sensitive information
- 📁 **Multiple Writers** - Console, file, HTTP endpoint support
- 🎨 **Flexible Formatting** - JSON, Pretty, API-specific formatters
- 🔄 **File Rotation** - Automatic log file rotation
- 📦 **Modular Architecture** - Following separation of concerns principles
- 🪝 **HTTP Interceptors** - Automatic capture for Fetch, Axios, XHR
- ⚡ **Middleware System** - Extensible log processing pipeline

## Installation

```bash
npm install @sahin/ilog
# or
yarn add @sahin/ilog
```

## Quick Start

```typescript
import { createLogger, LogLevel } from '@sahin/ilog';

// Basic usage
const logger = createLogger({
  level: LogLevel.INFO,
  enableConsole: true,
  enableFile: true,
  filePath: './logs/app.log'
});

logger.info('Application started');
logger.error('An error occurred', new Error('Sample error'));
```

## API Logging

### Automatic Interceptors

```typescript
import { FetchInterceptor, AxiosInterceptor } from '@sahin/ilog';

// Automatic logging for Fetch API
const fetchInterceptor = new FetchInterceptor(logger, {
  logRequests: true,
  logResponses: true,
  maskSensitiveData: true,
  sensitiveFields: ['authorization', 'x-api-key']
});

fetchInterceptor.install();

// Now all fetch calls will be automatically logged
fetch('/api/users').then(response => response.json());
```

### Manual API Logging

```typescript
// Manual API logging
logger.logApiRequest('POST', '/api/users', {
  requestBody: { name: 'John', email: 'john@example.com' },
  requestHeaders: { 'Content-Type': 'application/json' }
});

logger.logApiResponse('POST', '/api/users', 201, 250, {
  responseBody: { id: 1, name: 'John' }
});

logger.logApiError('GET', '/api/users/999', new Error('User not found'));
```

## Performance Monitoring

```typescript
// Automatic timing
const timer = logger.startTimer('database-query');
await performDatabaseQuery();
timer(); // Automatically logs duration and memory usage

// Custom performance metrics
logger.logPerformance({
  timestamp: new Date(),
  level: LogLevel.INFO,
  message: 'Batch processing completed',
  operation: 'batch-process',
  duration: 1500,
  customMetrics: {
    itemsProcessed: 100,
    successRate: 0.95
  }
});
```

## Sensitive Data Masking

```typescript
import { maskSensitiveData } from '@sahin/ilog';

const userData = {
  name: 'John Doe',
  email: 'john@example.com',
  password: 'secret123',
  creditCard: '1234-5678-9012-3456'
};

const masked = maskSensitiveData(userData, {
  sensitiveFields: ['password', 'creditCard'],
  showFirst: 2,
  showLast: 2
});

logger.info('User data', { user: masked });
// Output: { name: 'John Doe', email: 'john@example.com', password: 'se*****23', creditCard: '12**-****-****-**56' }
```

## Context Management

```typescript
// Global context
logger.setContext('requestId', 'req-123');
logger.setUserId('user-456');
logger.setSessionId('sess-789');

// Child logger with additional context
const serviceLogger = logger.child({ 
  service: 'auth',
  version: '1.2.0'
});

serviceLogger.info('Authentication successful');
// Includes all parent context + service-specific context
```

## Middleware System

iLog provides a powerful middleware system that allows you to intercept and modify log entries before they are processed. This enables advanced logging features like filtering, enrichment, metrics collection, and rate limiting.

### Built-in Middleware

#### Timestamp Middleware
```typescript
import { TimestampMiddleware } from '@sahin/ilog';

const logger = createLogger();
logger.use(new TimestampMiddleware({
  format: 'iso', // 'iso', 'locale', or 'unix'
  timezone: 'Europe/Istanbul'
}));

logger.info('Message with formatted timestamp');
```

#### Filter Middleware
```typescript
import { FilterMiddleware, LogLevel } from '@sahin/ilog';

const filterMiddleware = new FilterMiddleware({
  minLevel: LogLevel.INFO,
  maxLevel: LogLevel.ERROR,
  excludeMessages: ['debug', 'trace'],
  includeMessages: ['important'],
  excludeContextKeys: ['sensitive'],
  includeContextKeys: ['userId']
});

logger.use(filterMiddleware);
```

#### Correlation ID Middleware
```typescript
import { CorrelationIdMiddleware } from '@sahin/ilog';

const correlationMiddleware = new CorrelationIdMiddleware({
  fieldName: 'traceId',
  generateNew: false, // true to generate new ID for each log
  idLength: 16
});

logger.use(correlationMiddleware);
logger.info('Message with correlation ID');
```

#### Metrics Middleware
```typescript
import { MetricsMiddleware } from '@sahin/ilog';

const metricsMiddleware = new MetricsMiddleware({
  trackFrequency: true,
  frequencyWindowMinutes: 5
});

logger.use(metricsMiddleware);

// Get metrics
const metrics = metricsMiddleware.getMetrics();
console.log(metrics.totalLogs, metrics.errorCount, metrics.logFrequency);
```

#### Rate Limiting Middleware
```typescript
import { RateLimitMiddleware, LogLevel } from '@sahin/ilog';

const rateLimitMiddleware = new RateLimitMiddleware({
  maxLogsPerSecond: 10,
  maxLogsPerMinute: 100,
  maxLogsPerHour: 1000,
  skipLevels: [LogLevel.FATAL], // Don't rate limit fatal errors
  onRateLimitExceeded: (droppedCount) => {
    console.warn(`Rate limit exceeded! Dropped ${droppedCount} logs`);
  }
});

logger.use(rateLimitMiddleware);
```

### Custom Middleware

#### Function-based Middleware
```typescript
import { Logger, MiddlewareFunction } from '@sahin/ilog';

const enrichmentMiddleware: MiddlewareFunction = async (entry, context, next) => {
  // Enrich log entry
  entry.context = {
    ...entry.context,
    environment: process.env.NODE_ENV,
    service: 'my-service',
    version: '1.0.0'
  };
  
  // Add metadata for other middleware
  context.metadata.processedAt = new Date().toISOString();
  
  // Continue to next middleware
  await next();
};

logger.use(enrichmentMiddleware);
```

#### Class-based Middleware
```typescript
import { LogMiddleware, LogEntry, MiddlewareContext } from '@sahin/ilog';

class CustomMiddleware implements LogMiddleware {
  name = 'CustomMiddleware';
  
  async execute(
    entry: LogEntry,
    context: MiddlewareContext,
    next: () => Promise<void> | void
  ): Promise<void> {
    // Custom processing logic
    if (entry.level >= LogLevel.ERROR) {
      entry.context = {
        ...entry.context,
        alerting: true
      };
    }
    
    await next();
  }
}

logger.use(new CustomMiddleware());
```

### Middleware Pipeline Management

```typescript
// Add middleware
logger.use(new TimestampMiddleware());
logger.use(new CorrelationIdMiddleware());

// Remove specific middleware
logger.removeMiddleware('TimestampMiddleware');

// Clear all middleware
logger.clearMiddlewares();

// Child loggers inherit parent middleware
const childLogger = logger.child({ component: 'auth' });
```

### Middleware Configuration at Logger Creation

```typescript
import { 
  Logger, 
  TimestampMiddleware, 
  FilterMiddleware,
  LogLevel 
} from '@sahin/ilog';

const logger = new Logger({
  level: LogLevel.INFO,
  enableConsole: true,
  middlewares: [
    new TimestampMiddleware({ format: 'iso' }),
    new FilterMiddleware({ minLevel: LogLevel.INFO })
  ]
});
```

### Async Middleware Support

```typescript
const asyncMiddleware: MiddlewareFunction = async (entry, context, next) => {
  // Async operations are fully supported
  await someAsyncOperation();
  
  entry.context = {
    ...entry.context,
    asyncProcessed: true
  };
  
  await next();
};

logger.use(asyncMiddleware);
```

## Custom Writers

```typescript
import { HttpWriter, FileWriter, BufferedWriter } from '@sahin/ilog';

const logger = createLogger({
  customWriters: [
    // Send logs to HTTP endpoint
    new HttpWriter('https://logs.yourservice.com/api/logs', {
      'Authorization': 'Bearer your-token'
    }),
    
    // Buffered file writing
    new BufferedWriter(
      new FileWriter('./logs/buffered.log'),
      100, // Buffer size
      5000 // Flush interval (ms)
    )
  ]
});
```

## Advanced Configuration

```typescript
import { Logger, LogLevel, JsonFormatter, ApiFormatter } from '@sahin/ilog';

const logger = new Logger({
  level: LogLevel.DEBUG,
  enableConsole: true,
  enableFile: true,
  filePath: './logs/app.log',
  maxFileSize: 10, // MB
  maxFiles: 5,
  formatter: new JsonFormatter(), // or ApiFormatter, PrettyFormatter
  enableApiLogging: true,
  enablePerformanceLogging: true,
  sensitiveFields: ['password', 'token', 'ssn', 'creditCard']
});
```

## Log Levels

```typescript
logger.debug('Debug message');    // LogLevel.DEBUG
logger.info('Info message');      // LogLevel.INFO  
logger.warn('Warning message');   // LogLevel.WARN
logger.error('Error message');    // LogLevel.ERROR
logger.fatal('Fatal message');    // LogLevel.FATAL
```

## Formatters

### Pretty Formatter (Development)
```typescript
import { PrettyFormatter } from '@sahin/ilog';

const logger = createLogger({
  formatter: new PrettyFormatter()
});
// Colorful, human-readable output
```

### JSON Formatter (Production)
```typescript
import { JsonFormatter } from '@sahin/ilog';

const logger = createLogger({
  formatter: new JsonFormatter()
});
// Structured JSON output for log aggregation
```

### API Formatter
```typescript
import { ApiFormatter } from '@sahin/ilog';

const logger = createLogger({
  formatter: new ApiFormatter()
});
// Specialized formatting for API calls
```

## Best Practices

### Structured Logging
```typescript
// ✅ Good - Structured data
logger.info('User login successful', {
  userId: '123',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
});

// ❌ Avoid - String interpolation
logger.info(`User ${userId} logged in from ${ip}`);
```

### Service-Specific Loggers
```typescript
class UserService {
  private logger = rootLogger.child({ service: 'user-service' });
  
  async createUser(userData: any) {
    const timer = this.logger.startTimer('create-user');
    try {
      this.logger.info('Creating new user', { email: userData.email });
      // ... user creation logic
      this.logger.info('User created successfully', { userId: result.id });
      return result;
    } catch (error) {
      this.logger.error('Failed to create user', error, { email: userData.email });
      throw error;
    } finally {
      timer();
    }
  }
}
```

### Error Handling
```typescript
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', error, {
    operation: 'riskyOperation',
    context: { /* relevant context */ }
  });
  
  // Re-throw if needed
  throw error;
}
```

## API Reference

### Logger Methods
- `debug(message, context?)` - Debug level logging
- `info(message, context?)` - Info level logging  
- `warn(message, context?)` - Warning level logging
- `error(message, error?, context?)` - Error level logging
- `fatal(message, error?, context?)` - Fatal level logging
- `logApiRequest(method, url, options?)` - API request logging
- `logApiResponse(method, url, status, responseTime, options?)` - API response logging
- `logApiError(method, url, error, options?)` - API error logging
- `startTimer(operation)` - Performance timing
- `setContext(key, value)` - Set global context
- `child(context)` - Create child logger

### Interceptors
- `FetchInterceptor` - Automatic Fetch API capture
- `AxiosInterceptor` - Automatic Axios capture  
- `XHRInterceptor` - Automatic XMLHttpRequest capture

### Utilities
- `maskSensitiveData(data, options)` - Sensitive data masking
- `maskEmail(email)` - Email masking
- `maskCreditCard(cardNumber)` - Credit card masking
- `maskUrlParameters(url, sensitiveParams)` - URL parameter masking

## TypeScript Support

This library is written in TypeScript and provides full type definitions. All methods are properly typed with generics and interfaces to ensure type safety in your applications.

```typescript
// Fully typed logger configuration
const config: LoggerConfig = {
  level: LogLevel.INFO,
  enableConsole: true,
  enableFile: true,
  filePath: './logs/app.log'
};

// Type-safe context
interface UserContext {
  userId: string;
  sessionId: string;
  ip: string;
}

const userLogger = logger.child<UserContext>({
  userId: '123',
  sessionId: 'sess-456',
  ip: '192.168.1.1'
});
```

## Examples

Check out the `examples/` directory for comprehensive usage examples:

- `basic-usage.ts` - Basic logging patterns
- `advanced-usage.ts` - Advanced features and configurations

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Add tests for your changes
4. Update documentation
5. Submit a pull request

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/yourusername/ilog/issues)
- Documentation: [Full API documentation](https://github.com/yourusername/ilog#readme)

## Changelog

### v1.0.0
- Initial release
- Full TypeScript support
- API logging with interceptors
- Performance monitoring
- Sensitive data masking
- Multiple output writers
- Flexible formatting options
