import { createLogger, FetchInterceptor, LogLevel } from '../src';

// Temel logger kullanımı
const logger = createLogger({
  level: LogLevel.DEBUG,
  enableConsole: true,
  enableFile: true,
  filePath: './logs/app.log',
  enableApiLogging: true,
  sensitiveFields: ['password', 'token', 'email']
});

// Temel log örnekleri
logger.info('Uygulama başlatıldı');
logger.debug('Debug bilgisi', { userId: 123, action: 'login' });
logger.warn('Uyarı mesajı');
logger.error('Hata oluştu', new Error('Örnek hata'));

// Context ile çalışma
logger.setContext('requestId', 'req-123');
logger.setUserId('user-456');
logger.info('Context ile log');

// Child logger
const childLogger = logger.child({ component: 'auth-service' });
childLogger.info('Auth service işlemi');

// Performance logging
const timer = logger.startTimer('database-query');
setTimeout(() => {
  timer(); // Performance logunu yazar
}, 100);

// API interceptor örneği
const fetchInterceptor = new FetchInterceptor(logger, {
  logRequests: true,
  logResponses: true,
  logBodies: true,
  maskSensitiveData: true
});

fetchInterceptor.install();

// Örnek API çağrısı (fetch otomatik loglanacak)
setTimeout(async () => {
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
    const data = await response.json();
    console.log('API Response:', data);
  } catch (error) {
    console.error('API Error:', error);
  }
}, 1000);

// Manuel API logging
logger.logApiRequest('POST', '/api/users', {
  requestBody: { name: 'John', email: 'john@example.com', password: 'secret123' },
  requestHeaders: { 'Authorization': 'Bearer token123' }
});

logger.logApiResponse('POST', '/api/users', 201, 250, {
  responseBody: { id: 1, name: 'John', email: 'j***@example.com' }
});

// Error logging
logger.logApiError('GET', '/api/users/999', new Error('User not found'));

console.log('Logger örnekleri çalıştırılıyor...'); 