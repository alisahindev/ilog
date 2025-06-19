import { LogEntry, LogLevel, LogMiddleware, MiddlewareContext } from '../types';

export interface RateLimitOptions {
  maxLogsPerSecond?: number;
  maxLogsPerMinute?: number;
  maxLogsPerHour?: number;
  skipLevels?: LogLevel[]; // Levels that should not be rate limited
  onRateLimitExceeded?: (droppedCount: number) => void;
}

export class RateLimitMiddleware implements LogMiddleware {
  public readonly name = 'RateLimitMiddleware';
  private logTimestamps: Date[] = [];
  private droppedLogsCount = 0;

  constructor(private options: RateLimitOptions = {}) {
    // Default to 100 logs per second if no limits specified
    this.options = {
      maxLogsPerSecond: 100,
      ...this.options,
    };
  }

  async execute(
    entry: LogEntry,
    context: MiddlewareContext,
    next: () => Promise<void> | void
  ): Promise<void> {
    // Check if this log level should skip rate limiting
    if (this.options.skipLevels?.includes(entry.level)) {
      await next();
      return;
    }

    const now = entry.timestamp;

    // Clean old timestamps
    this.cleanOldTimestamps(now);

    // Check rate limits
    if (this.isRateLimitExceeded(now)) {
      this.droppedLogsCount++;

      // Call callback if provided
      if (this.options.onRateLimitExceeded) {
        this.options.onRateLimitExceeded(this.droppedLogsCount);
      }

      return; // Drop this log entry
    }

    // Add timestamp and proceed
    this.logTimestamps.push(now);

    // Add rate limit info to context
    context.metadata['rateLimitInfo'] = {
      logsInLastSecond: this.getLogsInWindow(now, 1000),
      logsInLastMinute: this.getLogsInWindow(now, 60000),
      logsInLastHour: this.getLogsInWindow(now, 3600000),
      droppedCount: this.droppedLogsCount,
    };

    await next();
  }

  private cleanOldTimestamps(now: Date): void {
    // Keep timestamps from the last hour (most restrictive window)
    const hourAgo = new Date(now.getTime() - 3600000);
    this.logTimestamps = this.logTimestamps.filter(timestamp => timestamp > hourAgo);
  }

  private isRateLimitExceeded(now: Date): boolean {
    // Check per-second limit
    if (this.options.maxLogsPerSecond) {
      const logsInLastSecond = this.getLogsInWindow(now, 1000);
      if (logsInLastSecond >= this.options.maxLogsPerSecond) {
        return true;
      }
    }

    // Check per-minute limit
    if (this.options.maxLogsPerMinute) {
      const logsInLastMinute = this.getLogsInWindow(now, 60000);
      if (logsInLastMinute >= this.options.maxLogsPerMinute) {
        return true;
      }
    }

    // Check per-hour limit
    if (this.options.maxLogsPerHour) {
      const logsInLastHour = this.getLogsInWindow(now, 3600000);
      if (logsInLastHour >= this.options.maxLogsPerHour) {
        return true;
      }
    }

    return false;
  }

  private getLogsInWindow(now: Date, windowMs: number): number {
    const windowStart = new Date(now.getTime() - windowMs);
    return this.logTimestamps.filter(timestamp => timestamp > windowStart).length;
  }

  getDroppedLogsCount(): number {
    return this.droppedLogsCount;
  }

  resetDroppedLogsCount(): void {
    this.droppedLogsCount = 0;
  }
}
