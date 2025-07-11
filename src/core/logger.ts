import * as crypto from 'crypto';
import { SimpleApiFormatter, SimpleTextFormatter } from '../formatters/simple';
import {
  ApiLogEntry,
  HttpMethod,
  ILogger,
  LogEntry,
  LogFormatter,
  LoggerConfig,
  LogLevel,
  LogMiddleware,
  LogWriter,
  MiddlewareContext,
  MiddlewareFunction,
  PerformanceEntry,
} from '../types';
import { maskSensitiveData, SensitiveDataMaskingOptions } from '../utils/sensitive-data';
import { BufferedWriter, ConsoleWriter, FileWriter } from '../writers';

export class Logger implements ILogger {
  private writers: LogWriter[] = [];
  private formatter!: LogFormatter;
  private context: Record<string, any> = {};
  private config: LoggerConfig;
  private requestId?: string;
  private sessionId?: string;
  private userId?: string;
  private middlewares: (MiddlewareFunction | LogMiddleware)[] = [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      enableApiLogging: true,
      enablePerformanceLogging: true,
      sensitiveFields: ['password', 'token', 'key', 'secret'],
      middlewares: [],
      ...config,
    };

    this.setupWriters();
    this.setupFormatter();
    this.generateRequestId();
    this.setupMiddlewares();
  }

  use(middleware: MiddlewareFunction | LogMiddleware): void {
    this.middlewares.push(middleware);
  }

  removeMiddleware(middlewareName: string): void {
    this.middlewares = this.middlewares.filter(middleware => {
      if (typeof middleware === 'function') {
        return middleware.name !== middlewareName;
      }
      return middleware.name !== middlewareName;
    });
  }

  clearMiddlewares(): void {
    this.middlewares = [];
  }

  private setupMiddlewares(): void {
    if (this.config.middlewares) {
      this.middlewares = [...this.config.middlewares];
    }
  }

  private setupWriters(): void {
    // Console writer
    if (this.config.enableConsole) {
      this.writers.push(new ConsoleWriter());
    }

    // File writer
    if (this.config.enableFile && this.config.filePath) {
      const fileWriter = new FileWriter(
        this.config.filePath,
        this.config.maxFileSize ?? 10,
        this.config.maxFiles ?? 5
      );
      this.writers.push(new BufferedWriter(fileWriter));
    }

    // Custom writers
    if (this.config.customWriters) {
      this.writers.push(...this.config.customWriters);
    }
  }

  private setupFormatter(): void {
    if (this.config.formatter) {
      this.formatter = this.config.formatter;
    } else if (this.config.enableApiLogging) {
      this.formatter = new SimpleApiFormatter();
    } else {
      this.formatter = new SimpleTextFormatter();
    }
  }

  private generateRequestId(): void {
    this.requestId = crypto.randomUUID();
  }

  private sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return String(input);
    }
    // Remove control characters and limit length to prevent injection
    return input.replace(/[\x00-\x1F\x7F]/g, '').substring(0, 1000); // eslint-disable-line no-control-regex
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    // Create middleware context
    const middlewareContext: MiddlewareContext = {
      logger: this,
      config: this.config,
      metadata: {},
    };

    // Execute middleware pipeline
    await this.executeMiddlewarePipeline(entry, middlewareContext);
  }

  private async executeMiddlewarePipeline(
    entry: LogEntry,
    context: MiddlewareContext
  ): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index >= this.middlewares.length) {
        // Final step: process the log entry
        await this.processLogEntry(entry);
        return;
      }

      const middleware = this.middlewares[index++];

      if (middleware) {
        if (typeof middleware === 'function') {
          await middleware(entry, context, next);
        } else {
          await middleware.execute(entry, context, next);
        }
      } else {
        await next();
      }
    };

    await next();
  }

  private async processLogEntry(entry: LogEntry): Promise<void> {
    // Mask sensitive data
    const maskedEntry = this.maskSensitiveDataInEntry(entry);

    // Format log
    const formattedLog = this.formatter.format(maskedEntry);

    // Write to all writers
    const writePromises = this.writers.map(writer => writer.write(formattedLog, entry.level));

    await Promise.allSettled(writePromises);
  }

  private maskSensitiveDataInEntry(entry: LogEntry): LogEntry {
    if (!this.config.sensitiveFields || this.config.sensitiveFields.length === 0) {
      return entry;
    }

    const maskingOptions: SensitiveDataMaskingOptions = {
      sensitiveFields: this.config.sensitiveFields,
      showFirst: 2,
      showLast: 2,
    };

    return {
      ...entry,
      context: entry.context ? maskSensitiveData(entry.context, maskingOptions) : entry.context,
      message: entry.message, // Don't mask message, only context
    };
  }

  // Basic log methods
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    // Validate input to prevent injection attacks
    if (typeof message !== 'string') {
      throw new Error('Message must be a string');
    }

    const errorContext = error
      ? {
          errorName: this.sanitizeString(error.name),
          errorMessage: this.sanitizeString(error.message),
          // Only include stack trace in development mode for security
          errorStack: process.env['NODE_ENV'] === 'development' ? error.stack : undefined,
          ...context,
        }
      : context;

    this.log(LogLevel.ERROR, message, errorContext);
  }

  fatal(message: string, error?: Error, context?: Record<string, unknown>): void {
    // Validate input to prevent injection attacks
    if (typeof message !== 'string') {
      throw new Error('Message must be a string');
    }

    const errorContext = error
      ? {
          errorName: this.sanitizeString(error.name),
          errorMessage: this.sanitizeString(error.message),
          // Only include stack trace in development mode for security
          errorStack: process.env['NODE_ENV'] === 'development' ? error.stack : undefined,
          ...context,
        }
      : context;

    this.log(LogLevel.FATAL, message, errorContext);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: { ...this.context, ...context },
      requestId: this.requestId,
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.writeLog(entry);
  }

  // API logging methods
  logApiRequest(method: HttpMethod, url: string, options: Partial<ApiLogEntry> = {}): void {
    if (!this.config.enableApiLogging) {
      return;
    }

    const entry: ApiLogEntry = {
      timestamp: new Date(),
      level: LogLevel.INFO,
      message: `API Request: ${method} ${url}`,
      method,
      url,
      context: { ...this.context, ...options.context },
      requestId: this.requestId,
      sessionId: this.sessionId,
      userId: this.userId,
      requestHeaders: options.requestHeaders,
      requestBody: options.requestBody,
    };

    this.writeLog(entry);
  }

  logApiResponse(
    method: HttpMethod,
    url: string,
    statusCode: number,
    responseTime: number,
    options: Partial<ApiLogEntry> = {}
  ): void {
    if (!this.config.enableApiLogging) {
      return;
    }

    const level = statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    const entry: ApiLogEntry = {
      timestamp: new Date(),
      level,
      message: `API Response: ${method} ${url} - ${statusCode} (${responseTime}ms)`,
      method,
      url,
      statusCode,
      responseTime,
      context: { ...this.context, ...options.context },
      requestId: this.requestId,
      sessionId: this.sessionId,
      userId: this.userId,
      responseHeaders: options.responseHeaders,
      responseBody: options.responseBody,
    };

    this.writeLog(entry);
  }

  logApiError(
    method: HttpMethod,
    url: string,
    error: Error,
    options: Partial<ApiLogEntry> = {}
  ): void {
    if (!this.config.enableApiLogging) {
      return;
    }

    const entry: ApiLogEntry = {
      timestamp: new Date(),
      level: LogLevel.ERROR,
      message: `API Error: ${method} ${url} - ${error.message}`,
      method,
      url,
      context: { ...this.context, ...options.context },
      requestId: this.requestId,
      sessionId: this.sessionId,
      userId: this.userId,
      errorDetails: {
        code: (error as any).code,
        stack: error.stack,
        cause: (error as any).cause,
      },
    };

    this.writeLog(entry);
  }

  // Performance monitoring
  startTimer(operation: string): () => void {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    return () => {
      const endTime = Date.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;

      const entry: PerformanceEntry = {
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: `Performance: ${operation} completed in ${duration}ms`,
        operation,
        duration,
        context: { ...this.context },
        requestId: this.requestId,
        sessionId: this.sessionId,
        userId: this.userId,
        memoryUsage: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal,
          external: endMemory.external,
        },
      };

      this.writeLog(entry);
    };
  }

  logPerformance(entry: PerformanceEntry): void {
    if (!this.config.enablePerformanceLogging) {
      return;
    }

    const performanceEntry: PerformanceEntry = {
      ...entry,
      context: { ...this.context, ...entry.context },
      requestId: this.requestId,
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.writeLog(performanceEntry);
  }

  // Context management
  setContext(key: string, value: unknown): void {
    this.context[key] = value;
  }

  getContext(): Record<string, unknown> {
    return { ...this.context };
  }

  clearContext(): void {
    this.context = {};
  }

  // Session and user ID setting
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  // Create child logger with additional context
  child(context: Record<string, unknown>): ILogger {
    const childLogger = new Logger(this.config);
    childLogger.context = { ...this.context, ...context };
    childLogger.requestId = this.requestId;
    childLogger.sessionId = this.sessionId;
    childLogger.userId = this.userId;
    childLogger.middlewares = [...this.middlewares]; // Copy middleware pipeline
    return childLogger;
  }
}
