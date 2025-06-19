import {
    CorrelationIdMiddleware,
    FilterMiddleware,
    Logger,
    LogLevel,
    MetricsMiddleware,
    MiddlewareFunction,
    RateLimitMiddleware,
    TimestampMiddleware
} from '../src';

// 1. Temel middleware kullanımı
console.log('=== Temel Middleware Kullanımı ===');
const logger = new Logger({
  level: LogLevel.DEBUG,
  enableConsole: true,
});

// Timestamp middleware ekleme
logger.use(new TimestampMiddleware({ format: 'iso' }));

// Filter middleware ekleme
logger.use(new FilterMiddleware({
  minLevel: LogLevel.INFO,
  excludeMessages: ['debug', 'trace']
}));

// Correlation ID middleware ekleme
logger.use(new CorrelationIdMiddleware({
  fieldName: 'traceId',
  generateNew: false
}));

logger.info('Bu log middleware\'ler tarafından işlenir', { userId: 123 });
logger.debug('Bu log filtrelenir ve görünmez'); // Filtrelenecek
logger.error('Bu hata logu geçer', new Error('test error'));

// 2. Function-based middleware
console.log('\n=== Function-based Middleware ===');

const customMiddleware: MiddlewareFunction = async (entry, context, next) => {
  // Log entry'yi zenginleştir
  entry.context = {
    ...entry.context,
    environment: process.env['NODE_ENV'] ?? 'development',
    service: 'example-service',
    version: '1.0.0'
  };
  
  // Metadata'ya bilgi ekle
  context.metadata['processedAt'] = new Date().toISOString();
  
  console.log(`Middleware processed: ${entry.message}`);
  await next();
};

const logger2 = new Logger({ enableConsole: true });
logger2.use(customMiddleware);
logger2.info('Function middleware ile işlenen log');

// 3. Metrics middleware örneği
console.log('\n=== Metrics Middleware ===');

const metricsMiddleware = new MetricsMiddleware({
  trackFrequency: true,
  frequencyWindowMinutes: 1
});

const logger3 = new Logger({ enableConsole: true });
logger3.use(metricsMiddleware);

// Birkaç log mesajı gönder
logger3.info('İlk log mesajı');
logger3.warn('Uyarı mesajı');
logger3.error('Hata mesajı', new Error('Test hatası'));
logger3.debug('Debug mesajı');

// Metrikleri göster
setTimeout(() => {
  const metrics = metricsMiddleware.getMetrics();
  console.log('Log Metrikleri:', JSON.stringify(metrics, null, 2));
}, 100);

// 4. Rate limiting middleware
console.log('\n=== Rate Limiting Middleware ===');

const rateLimitMiddleware = new RateLimitMiddleware({
  maxLogsPerSecond: 2,
  maxLogsPerMinute: 10,
  skipLevels: [LogLevel.FATAL], // Fatal logları rate limit'e takma
  onRateLimitExceeded: (droppedCount) => {
    console.log(`Rate limit aşıldı! Düşürülen log sayısı: ${droppedCount}`);
  }
});

const logger4 = new Logger({ enableConsole: true });
logger4.use(rateLimitMiddleware);

// Hızlı log mesajları gönder (rate limit'i test et)
for (let i = 0; i < 10; i++) {
  logger4.info(`Hızlı log mesajı ${i + 1}`);
}

// 5. Middleware chaining (zincirleme)
console.log('\n=== Middleware Chaining ===');

const chainLogger = new Logger({ enableConsole: true });

// Middleware'leri sırayla ekle
chainLogger.use(new TimestampMiddleware({ format: 'locale' }));
chainLogger.use(new CorrelationIdMiddleware({ generateNew: true }));
chainLogger.use(new FilterMiddleware({ minLevel: LogLevel.INFO }));

const enrichmentMiddleware: MiddlewareFunction = async (entry, context, next) => {
  entry.context = {
    ...entry.context,
    requestId: context.metadata['correlationId'],
    pipeline: 'enrichment-stage'
  };
  await next();
};

chainLogger.use(enrichmentMiddleware);
chainLogger.use(metricsMiddleware);

chainLogger.info('Zincirlenmiş middleware\'ler ile işlenen log');

// 6. Middleware'leri yönetme
console.log('\n=== Middleware Yönetimi ===');

const managedLogger = new Logger({ enableConsole: true });
managedLogger.use(new TimestampMiddleware());
managedLogger.use(new CorrelationIdMiddleware());

console.log('Middleware eklendikten sonra log:');
managedLogger.info('İlk log mesajı');

// Middleware'leri temizle
managedLogger.clearMiddlewares();
console.log('Middleware\'ler temizlendikten sonra log:');
managedLogger.info('İkinci log mesajı');

// 7. Child logger ile middleware inheritance
console.log('\n=== Child Logger ile Middleware Inheritance ===');

const parentLogger = new Logger({ enableConsole: true });
parentLogger.use(new TimestampMiddleware());
parentLogger.use(new CorrelationIdMiddleware());

const childLogger = parentLogger.child({ component: 'child-component' });
childLogger.info('Child logger - parent middleware\'leri miras alır');

// 8. Asenkron middleware örneği
console.log('\n=== Asenkron Middleware ===');

const asyncMiddleware: MiddlewareFunction = async (entry, _context, next) => {
  // Asenkron işlem simülasyonu
  await new Promise(resolve => setTimeout(resolve, 10));
  
  entry.context = {
    ...entry.context,
    asyncProcessed: true,
    processedAt: new Date().toISOString()
  };
  
  await next();
};

const asyncLogger = new Logger({ enableConsole: true });
asyncLogger.use(asyncMiddleware);
asyncLogger.info('Asenkron middleware ile işlenen log');

console.log('\n=== Middleware Örnekleri Tamamlandı ==='); 