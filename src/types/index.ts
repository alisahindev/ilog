// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

// HTTP methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

// Base log entry interface
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

// Special log entry for API calls
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

// Middleware context - additional data that can be passed through middleware chain
export interface MiddlewareContext {
  logger: ILogger;
  config: LoggerConfig;
  metadata: Record<string, any>;
}

// Middleware function type
export type MiddlewareFunction = (
  entry: LogEntry,
  context: MiddlewareContext,
  next: () => Promise<void> | void
) => Promise<void> | void;

// Middleware interface for class-based middleware
export interface LogMiddleware {
  name: string;
  execute(
    entry: LogEntry,
    context: MiddlewareContext,
    next: () => Promise<void> | void
  ): Promise<void> | void;
}

// Log formatter interface
export interface LogFormatter {
  format(entry: LogEntry): string;
}

// Log writer interface
export interface LogWriter {
  write(formattedLog: string, level: LogLevel): Promise<void> | void;
}

// Logger configuration
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;
  maxFileSize?: number; // in MB
  maxFiles?: number;
  customWriters?: LogWriter[];
  formatter?: LogFormatter;
  enableApiLogging: boolean;
  sensitiveFields?: string[]; // Sensitive fields to be masked
  enablePerformanceLogging: boolean;
  middlewares?: (MiddlewareFunction | LogMiddleware)[];
}

// API interceptor configuration
export interface ApiInterceptorConfig {
  logRequests: boolean;
  logResponses: boolean;
  logHeaders: boolean;
  logBodies: boolean;
  maskSensitiveData: boolean;
  sensitiveFields: string[];
  maxBodyLength: number;
}

// For performance monitoring
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

// Logger factory interface
export interface ILogger {
  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error, context?: Record<string, any>): void;
  fatal(message: string, error?: Error, context?: Record<string, any>): void;

  // API logging methods
  logApiRequest(method: HttpMethod, url: string, options?: Partial<ApiLogEntry>): void;
  logApiResponse(
    method: HttpMethod,
    url: string,
    statusCode: number,
    responseTime: number,
    options?: Partial<ApiLogEntry>
  ): void;
  logApiError(method: HttpMethod, url: string, error: Error, options?: Partial<ApiLogEntry>): void;

  // Performance logging
  startTimer(operation: string): () => void;
  logPerformance(entry: PerformanceEntry): void;

  // Context management
  setContext(key: string, value: any): void;
  getContext(): Record<string, any>;
  clearContext(): void;

  // Middleware management
  use(middleware: MiddlewareFunction | LogMiddleware): void;
  removeMiddleware(middlewareName: string): void;
  clearMiddlewares(): void;

  // Create child logger
  child(context: Record<string, any>): ILogger;
}
