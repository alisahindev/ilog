import { LogEntry, LogMiddleware, MiddlewareContext } from '../types';

export class TimestampMiddleware implements LogMiddleware {
  public readonly name = 'TimestampMiddleware';

  constructor(private options: { format?: 'iso' | 'locale' | 'unix'; timezone?: string } = {}) {}

  async execute(
    entry: LogEntry,
    _context: MiddlewareContext,
    next: () => Promise<void> | void
  ): Promise<void> {
    // Add formatted timestamp to context
    const format = this.options.format ?? 'iso';
    
    switch (format) {
      case 'iso':
        entry.context = {
          ...entry.context,
          formattedTimestamp: entry.timestamp.toISOString(),
        };
        break;
      case 'locale':
        entry.context = {
          ...entry.context,
          formattedTimestamp: entry.timestamp.toLocaleString(undefined, {
            timeZone: this.options.timezone,
          }),
        };
        break;
      case 'unix':
        entry.context = {
          ...entry.context,
          formattedTimestamp: Math.floor(entry.timestamp.getTime() / 1000),
        };
        break;
    }

    await next();
  }
} 