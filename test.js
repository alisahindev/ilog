const { Logger, createLogger, defaultLogger } = require('@alisahindev/ilog');

console.log('=== iLog Paket Testi ===');

// Test 1: Create a new logger instance
const logger = new Logger();
console.log('✅ Logger instance başarıyla oluşturuldu');

// Test 2: Use factory function
const factoryLogger = createLogger();
console.log('✅ Factory logger başarıyla oluşturuldu');

// Test 3: Use default logger
defaultLogger.info('Hello from default logger!');
console.log('✅ Default logger başarıyla çalıştı');

// Test 4: Log different levels
logger.info('This is an info message');
logger.warn('This is a warning message');
logger.error('This is an error message');
console.log('✅ Farklı log seviyeleri başarıyla test edildi');

console.log('🎉 Tüm testler başarıyla tamamlandı! Paket düzgün çalışıyor.'); 