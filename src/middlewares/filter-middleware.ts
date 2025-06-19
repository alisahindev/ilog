import { LogEntry, LogLevel, LogMiddleware, MiddlewareContext } from '../types';

export interface FilterOptions {
  minLevel?: LogLevel;
  maxLevel?: LogLevel;
  includeMessages?: string[];
  excludeMessages?: string[];
  includeContextKeys?: string[];
  excludeContextKeys?: string[];
}

export class FilterMiddleware implements LogMiddleware {
  public readonly name = 'FilterMiddleware';

  constructor(private options: FilterOptions = {}) {}

  async execute(
    entry: LogEntry,
    _context: MiddlewareContext,
    next: () => Promise<void> | void
  ): Promise<void> {
    // Level filtering
    if (this.options.minLevel !== undefined && entry.level < this.options.minLevel) {
      return; // Skip this log entry
    }

    if (this.options.maxLevel !== undefined && entry.level > this.options.maxLevel) {
      return; // Skip this log entry
    }

    // Message filtering
    if (this.options.excludeMessages) {
      const shouldExclude = this.options.excludeMessages.some(pattern =>
        entry.message.toLowerCase().includes(pattern.toLowerCase())
      );
      if (shouldExclude) {
        return;
      }
    }

    if (this.options.includeMessages) {
      const shouldInclude = this.options.includeMessages.some(pattern =>
        entry.message.toLowerCase().includes(pattern.toLowerCase())
      );
      if (!shouldInclude) {
        return;
      }
    }

    // Context filtering
    if (this.options.excludeContextKeys && entry.context) {
      const hasExcludedKey = this.options.excludeContextKeys.some(key =>
        Object.keys(entry.context ?? {}).includes(key)
      );
      if (hasExcludedKey) {
        return;
      }
    }

    if (this.options.includeContextKeys && entry.context) {
      const hasIncludedKey = this.options.includeContextKeys.some(key =>
        Object.keys(entry.context ?? {}).includes(key)
      );
      if (!hasIncludedKey) {
        return;
      }
    }

    await next();
  }
}
