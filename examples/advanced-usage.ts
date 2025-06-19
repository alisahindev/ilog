import {
    HttpWriter,
    JsonFormatter,
    Logger,
    LogLevel,
    maskSensitiveData
} from '../src';

// Özel konfigürasyon ile logger
const customLogger = new Logger({
  level: LogLevel.INFO,
  enableConsole: false,
  enableFile: true,
  filePath: './logs/custom.log',
  maxFileSize: 5, // 5MB
  maxFiles: 3,
  formatter: new JsonFormatter(),
  customWriters: [
    new HttpWriter('https://your-logging-service.com/logs', {
      'Authorization': 'Bearer your-token',
      'X-Service': 'your-app'
    })
  ],
  sensitiveFields: ['password', 'creditCard', 'ssn', 'token']
});

// Hassas veri maskeleme örneği
const sensitiveData = {
  user: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'secret123',
    creditCard: '1234-5678-9012-3456',
    token: 'abc123def456'
  },
  transaction: {
    amount: 100,
    cardNumber: '1111222233334444'
  }
};

const maskedData = maskSensitiveData(sensitiveData, {
  sensitiveFields: ['password', 'creditCard', 'token', 'cardNumber'],
  showFirst: 2,
  showLast: 2
});

customLogger.info('Kullanıcı işlemi', { data: maskedData });

// Structured logging örneği
interface PaymentEvent {
  eventType: 'payment_started' | 'payment_completed' | 'payment_failed';
  paymentId: string;
  amount: number;
  currency: string;
  userId: string;
  merchantId: string;
}

function logPaymentEvent(event: PaymentEvent) {
  const logger = customLogger.child({ 
    domain: 'payment',
    paymentId: event.paymentId 
  });
  
  switch (event.eventType) {
    case 'payment_started':
      logger.info('Ödeme işlemi başlatıldı', {
        amount: event.amount,
        currency: event.currency,
        userId: event.userId,
        merchantId: event.merchantId
      });
      break;
      
    case 'payment_completed':
      logger.info('Ödeme işlemi tamamlandı', {
        amount: event.amount,
        currency: event.currency,
        userId: event.userId,
        merchantId: event.merchantId
      });
      break;
      
    case 'payment_failed':
      logger.error('Ödeme işlemi başarısız', undefined, {
        amount: event.amount,
        currency: event.currency,
        userId: event.userId,
        merchantId: event.merchantId
      });
      break;
  }
}

// Örnek payment event'leri
const paymentEvents: PaymentEvent[] = [
  {
    eventType: 'payment_started',
    paymentId: 'pay_123',
    amount: 99.99,
    currency: 'USD',
    userId: 'user_456',
    merchantId: 'merchant_789'
  },
  {
    eventType: 'payment_completed',
    paymentId: 'pay_123',
    amount: 99.99,
    currency: 'USD',
    userId: 'user_456',
    merchantId: 'merchant_789'
  }
];

paymentEvents.forEach(logPaymentEvent);

// Axios interceptor örneği (eğer axios kullanılıyorsa)
// import axios from 'axios';
// const axiosInstance = axios.create();
// const axiosInterceptor = new AxiosInterceptor(customLogger);
// axiosInterceptor.install(axiosInstance);

// Performance monitoring örneği
class DatabaseService {
  private logger = customLogger.child({ service: 'database' });
  
  async getUserById(id: string) {
    const timer = this.logger.startTimer('get-user-by-id');
    
    try {
      // Simulated database call
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      
      const user = { id, name: 'John Doe', email: 'john@example.com' };
      this.logger.info('Kullanıcı sorgulandı', { userId: id });
      
      return user;
    } catch (error) {
      this.logger.error('Kullanıcı sorgusu başarısız', error as Error, { userId: id });
      throw error;
    } finally {
      timer(); // Performance logunu yaz
    }
  }
}

// Service kullanımı
const dbService = new DatabaseService();

async function testDatabaseService() {
  try {
    const user = await dbService.getUserById('user_123');
    console.log('User fetched:', user);
  } catch (error) {
    console.error('Database error:', error);
  }
}

// Batch logging örneği
async function processBatchOperations() {
  const batchLogger = customLogger.child({ operation: 'batch-process' });
  const timer = batchLogger.startTimer('batch-processing');
  
  const items = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
  
  for (const item of items) {
    const itemTimer = batchLogger.startTimer(`process-item-${item.id}`);
    
    try {
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      batchLogger.debug('Item işlendi', { itemId: item.id });
    } catch (error) {
      batchLogger.error('Item işleme hatası', error as Error, { itemId: item.id });
    } finally {
      itemTimer();
    }
  }
  
  timer();
  batchLogger.info('Batch işlemi tamamlandı', { totalItems: items.length });
}

// Test fonksiyonlarını çalıştır
setTimeout(testDatabaseService, 500);
setTimeout(processBatchOperations, 1000);

console.log('Gelişmiş logger örnekleri başlatıldı...'); 