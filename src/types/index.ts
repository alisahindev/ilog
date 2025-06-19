// Log seviyeleri
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

// HTTP metodları
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

// Temel log entry interface'i
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  tags?: string[];
  requestId?: string;
  userId?: string;
  sessionId?: string;
}

// API çağrısı için özel log entry
export interface ApiLogEntry extends LogEntry {
  method: HttpMethod;
  url: string;
  statusCode?: number;
  responseTime?: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
  errorDetails?: {
    code?: string;
    stack?: string;
    cause?: any;
  };
}

// Log formatlayıcısı interface'i
export interface LogFormatter {
  format(entry: LogEntry): string;
}

// Log yazıcısı interface'i
export interface LogWriter {
  write(formattedLog: string, level: LogLevel): Promise<void> | void;
}

// Logger konfigürasyonu
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;
  maxFileSize?: number; // MB cinsinden
  maxFiles?: number;
  customWriters?: LogWriter[];
  formatter?: LogFormatter;
  enableApiLogging: boolean;
  sensitiveFields?: string[]; // Maskelenecek hassas alanlar
  enablePerformanceLogging: boolean;
}

// API interceptor konfigürasyonu
export interface ApiInterceptorConfig {
  logRequests: boolean;
  logResponses: boolean;
  logHeaders: boolean;
  logBodies: boolean;
  maskSensitiveData: boolean;
  sensitiveFields: string[];
  maxBodyLength: number;
}

// Performance monitoring için
export interface PerformanceEntry extends LogEntry {
  operation: string;
  duration: number;
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  customMetrics?: Record<string, number>;
}

// Logger factory interface'i
export interface ILogger {
  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error, context?: Record<string, any>): void;
  fatal(message: string, error?: Error, context?: Record<string, any>): void;
  
  // API logging metodları
  logApiRequest(method: HttpMethod, url: string, options?: Partial<ApiLogEntry>): void;
  logApiResponse(method: HttpMethod, url: string, statusCode: number, responseTime: number, options?: Partial<ApiLogEntry>): void;
  logApiError(method: HttpMethod, url: string, error: Error, options?: Partial<ApiLogEntry>): void;
  
  // Performance logging
  startTimer(operation: string): () => void;
  logPerformance(entry: PerformanceEntry): void;
  
  // Context yönetimi
  setContext(key: string, value: any): void;
  getContext(): Record<string, any>;
  clearContext(): void;
  
  // Child logger oluşturma
  child(context: Record<string, any>): ILogger;
} 