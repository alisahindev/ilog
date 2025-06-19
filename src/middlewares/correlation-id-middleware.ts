import * as crypto from 'crypto';
import { LogEntry, LogMiddleware, MiddlewareContext } from '../types';

export class CorrelationIdMiddleware implements LogMiddleware {
  public readonly name = 'CorrelationIdMiddleware';
  private correlationId: string;

  constructor(private options: { 
    idLength?: number;
    fieldName?: string;
    generateNew?: boolean;
  } = {}) {
    this.correlationId = this.generateCorrelationId();
  }

  private generateCorrelationId(): string {
    const length = this.options.idLength ?? 16;
    return crypto.randomBytes(length).toString('hex').substring(0, length);
  }

  async execute(
    entry: LogEntry,
    context: MiddlewareContext,
    next: () => Promise<void> | void
  ): Promise<void> {
    const fieldName = this.options.fieldName ?? 'correlationId';
    
    // Generate new ID for each log entry if requested
    if (this.options.generateNew) {
      this.correlationId = this.generateCorrelationId();
    }

    // Add correlation ID to log entry context
    entry.context = {
      ...entry.context,
      [fieldName]: this.correlationId,
    };

    // Also add to middleware context metadata for other middleware to use
    context.metadata[fieldName] = this.correlationId;

    await next();
  }

  // Method to manually set correlation ID
  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  getCorrelationId(): string {
    return this.correlationId;
  }
} 