// Core exports
export { Logger } from './core/logger';

// Type exports
export * from './types';

// Formatter exports (simple versions - default)
export {
  SimpleApiFormatter as ApiFormatter,
  SimpleJsonFormatter as JsonFormatter,
  SimplePerformanceFormatter as PerformanceFormatter,
  SimpleTextFormatter as PrettyFormatter,
} from './formatters/simple';

// Colorful formatters (optional)
export {
  ApiFormatter as ColorfulApiFormatter,
  JsonFormatter as ColorfulJsonFormatter,
  PerformanceFormatter as ColorfulPerformanceFormatter,
  PrettyFormatter as ColorfulPrettyFormatter,
} from './formatters';

// Writer exports
export { BufferedWriter, ConsoleWriter, FileWriter, HttpWriter } from './writers';

// Utility exports
export {
  maskCreditCard,
  maskEmail,
  maskSensitiveData,
  maskUrlParameters,
  type SensitiveDataMaskingOptions,
} from './utils/sensitive-data';

// Interceptor exports
export {
  AxiosInterceptor,
  BaseApiInterceptor,
  FetchInterceptor,
  XHRInterceptor,
} from './interceptors/api-interceptor';

// Middleware exports
export {
  CorrelationIdMiddleware,
  FilterMiddleware,
  MetricsMiddleware,
  RateLimitMiddleware,
  TimestampMiddleware,
} from './middlewares';

// Import Logger for factory function
import { Logger } from './core/logger';

// Factory function for quick setup
export function createLogger(config?: Partial<import('./types').LoggerConfig>) {
  return new Logger(config);
}

// Default logger instance
export const defaultLogger = new Logger();
