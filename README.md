# iLog - TypeScript Logger

JavaScript/TypeScript projeleriniz için tam type destekli, gelişmiş bir logging kütüphanesi. API çağrılarını, performance metriklerini ve uygulama loglarını kolayca yönetmenizi sağlar.

## Özellikler

- 🎯 **Full TypeScript Support** - Tam tip güvenliği
- 🚀 **API Logging** - Otomatik HTTP request/response loglama
- 📊 **Performance Monitoring** - İşlem sürelerini ve memory kullanımını takip
- 🔒 **Sensitive Data Masking** - Hassas verileri otomatik maskeleme
- 📁 **Multiple Writers** - Console, dosya, HTTP endpoint desteği
- 🎨 **Flexible Formatting** - JSON, Pretty, API-specific formatters
- 🔄 **File Rotation** - Otomatik log dosyası döndürme
- 📦 **Modular Architecture** - Separation of concerns prensiplerine uygun
- 🪝 **HTTP Interceptors** - Fetch, Axios, XHR otomatik yakalama

## Kurulum

```bash
npm install ilog
# veya
yarn add ilog
```

## Hızlı Başlangıç

```typescript
import { createLogger, LogLevel } from 'ilog';

// Basit kullanım
const logger = createLogger({
  level: LogLevel.INFO,
  enableConsole: true,
  enableFile: true,
  filePath: './logs/app.log'
});

logger.info('Uygulama başlatıldı');
logger.error('Bir hata oluştu', new Error('Örnek hata'));
```

## API Logging

### Automatic Interceptors

```typescript
import { FetchInterceptor, AxiosInterceptor } from 'ilog';

// Fetch API için otomatik loglama
const fetchInterceptor = new FetchInterceptor(logger, {
  logRequests: true,
  logResponses: true,
  maskSensitiveData: true,
  sensitiveFields: ['authorization', 'x-api-key']
});

fetchInterceptor.install();

// Artık tüm fetch çağrıları otomatik loglanacak
fetch('/api/users').then(response => response.json());
```

### Manual API Logging

```typescript
// Manuel API loglama
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

## Hassas Veri Maskeleme

```typescript
import { maskSensitiveData } from 'ilog';

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

## Custom Writers

```typescript
import { HttpWriter, FileWriter, BufferedWriter } from 'ilog';

const logger = createLogger({
  customWriters: [
    // HTTP endpoint'e log gönderme
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
import { Logger, LogLevel, JsonFormatter, ApiFormatter } from 'ilog';

const logger = new Logger({
  level: LogLevel.DEBUG,
  enableConsole: true,
  enableFile: true,
  filePath: './logs/app.log',
  maxFileSize: 10, // MB
  maxFiles: 5,
  formatter: new JsonFormatter(), // veya ApiFormatter, PrettyFormatter
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
import { PrettyFormatter } from 'ilog';

const logger = createLogger({
  formatter: new PrettyFormatter()
});
// Colorful, human-readable output
```

### JSON Formatter (Production)
```typescript
import { JsonFormatter } from 'ilog';

const logger = createLogger({
  formatter: new JsonFormatter()
});
// Structured JSON output for log aggregation
```

### API Formatter
```typescript
import { ApiFormatter } from 'ilog';

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
- `FetchInterceptor` - Fetch API otomatik yakalama
- `AxiosInterceptor` - Axios otomatik yakalama  
- `XHRInterceptor` - XMLHttpRequest otomatik yakalama

### Utilities
- `maskSensitiveData(data, options)` - Hassas veri maskeleme
- `maskEmail(email)` - Email maskeleme
- `maskCreditCard(cardNumber)` - Kredi kartı maskeleme
- `maskUrlParameters(url, sensitiveParams)` - URL parametre maskeleme

## Lisans

MIT

## Katkıda Bulunma

Katkılarınızı bekliyoruz! Lütfen pull request göndermeden önce test ekleyin ve dokümantasyonu güncelleyin. # ilog
