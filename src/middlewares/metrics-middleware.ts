import { LogEntry, LogLevel, LogMiddleware, MiddlewareContext } from '../types';

export interface LogMetrics {
  totalLogs: number;
  logsByLevel: Record<LogLevel, number>;
  errorCount: number;
  averageLogSize: number;
  lastLogTime: Date | null;
  logFrequency: number; // logs per minute
}

export class MetricsMiddleware implements LogMiddleware {
  public readonly name = 'MetricsMiddleware';
  private metrics: LogMetrics;
  private logHistory: Date[] = [];
  private totalLogSize = 0;

  constructor(private options: { 
    trackFrequency?: boolean;
    frequencyWindowMinutes?: number;
  } = {}) {
    this.metrics = {
      totalLogs: 0,
      logsByLevel: {
        [LogLevel.DEBUG]: 0,
        [LogLevel.INFO]: 0,
        [LogLevel.WARN]: 0,
        [LogLevel.ERROR]: 0,
        [LogLevel.FATAL]: 0,
      },
      errorCount: 0,
      averageLogSize: 0,
      lastLogTime: null,
      logFrequency: 0,
    };
  }

  async execute(
    entry: LogEntry,
    context: MiddlewareContext,
    next: () => Promise<void> | void
  ): Promise<void> {
    // Update metrics
    this.metrics.totalLogs++;
    this.metrics.logsByLevel[entry.level]++;
    this.metrics.lastLogTime = entry.timestamp;

    // Count errors (ERROR and FATAL levels)
    if (entry.level >= LogLevel.ERROR) {
      this.metrics.errorCount++;
    }

    // Track log size
    const logSize = JSON.stringify(entry).length;
    this.totalLogSize += logSize;
    this.metrics.averageLogSize = this.totalLogSize / this.metrics.totalLogs;

    // Track frequency if enabled
    if (this.options.trackFrequency) {
      this.updateLogFrequency(entry.timestamp);
    }

    // Add metrics to middleware context for other middleware
    context.metadata['metrics'] = this.getMetrics();

    await next();
  }

  private updateLogFrequency(timestamp: Date): void {
    const windowMinutes = this.options.frequencyWindowMinutes ?? 5;
    const windowMs = windowMinutes * 60 * 1000;
    const cutoffTime = new Date(timestamp.getTime() - windowMs);

    // Add current log time
    this.logHistory.push(timestamp);

    // Remove old entries outside the window
    this.logHistory = this.logHistory.filter(time => time > cutoffTime);

    // Calculate frequency (logs per minute)
    this.metrics.logFrequency = this.logHistory.length / windowMinutes;
  }

  getMetrics(): LogMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalLogs: 0,
      logsByLevel: {
        [LogLevel.DEBUG]: 0,
        [LogLevel.INFO]: 0,
        [LogLevel.WARN]: 0,
        [LogLevel.ERROR]: 0,
        [LogLevel.FATAL]: 0,
      },
      errorCount: 0,
      averageLogSize: 0,
      lastLogTime: null,
      logFrequency: 0,
    };
    this.logHistory = [];
    this.totalLogSize = 0;
  }
} 