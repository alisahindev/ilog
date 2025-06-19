import { ApiLogEntry, LogEntry, LogFormatter, LogLevel, PerformanceEntry } from '../types';

// Get level name helper
const getLevelName = (level: LogLevel): string => {
  return LogLevel[level];
};

// Check if entry is API log entry
function isApiLogEntry(entry: LogEntry): entry is ApiLogEntry {
  return 'method' in entry && 'url' in entry;
}

// Check if entry is performance entry
function isPerformanceEntry(entry: LogEntry): entry is PerformanceEntry {
  return 'operation' in entry && 'duration' in entry;
}

// Simple text formatter
export class SimpleTextFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const level = getLevelName(entry.level);
    const timestamp = entry.timestamp.toISOString();

    let output = `${timestamp} [${level}] ${entry.message}`;

    // Add context information
    if (entry.context && Object.keys(entry.context).length > 0) {
      output += `\nContext: ${JSON.stringify(entry.context, null, 2)}`;
    }

    // Add request ID
    if (entry.requestId) {
      output += `\nRequest ID: ${entry.requestId}`;
    }

    return output;
  }
}

// API-specific formatter
export class SimpleApiFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    if (!this.isApiLogEntry(entry)) {
      return new SimpleTextFormatter().format(entry);
    }

    const apiEntry = entry as ApiLogEntry;
    const level = getLevelName(entry.level);
    const timestamp = entry.timestamp.toISOString();

    let output = `${timestamp} [${level}] ${apiEntry.method} ${apiEntry.url}`;

    if (apiEntry.statusCode) {
      output += ` - ${apiEntry.statusCode}`;
    }

    if (apiEntry.responseTime) {
      output += ` (${apiEntry.responseTime}ms)`;
    }

    output += `\n${entry.message}`;

    // Error details
    if (apiEntry.errorDetails) {
      output += `\nError Details:`;
      if (apiEntry.errorDetails.code) {
        output += `\n  Code: ${apiEntry.errorDetails.code}`;
      }
      if (apiEntry.errorDetails.stack) {
        output += `\n  Stack: ${apiEntry.errorDetails.stack}`;
      }
    }

    // Request/Response bodies (if not too large)
    if (apiEntry.requestBody && JSON.stringify(apiEntry.requestBody).length < 1000) {
      output += `\nRequest Body: ${JSON.stringify(apiEntry.requestBody, null, 2)}`;
    }

    if (apiEntry.responseBody && JSON.stringify(apiEntry.responseBody).length < 1000) {
      output += `\nResponse Body: ${JSON.stringify(apiEntry.responseBody, null, 2)}`;
    }

    return output;
  }

  private isApiLogEntry(entry: LogEntry): entry is ApiLogEntry {
    return 'method' in entry && 'url' in entry;
  }
}

// JSON formatter
export class SimpleJsonFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const logObject = {
      timestamp: entry.timestamp.toISOString(),
      level: getLevelName(entry.level),
      message: entry.message,
      ...(entry.context && { context: entry.context }),
      ...(entry.requestId && { requestId: entry.requestId }),
      ...(entry.userId && { userId: entry.userId }),
      ...(entry.sessionId && { sessionId: entry.sessionId }),

      // API-specific fields
      ...(isApiLogEntry(entry) && {
        method: entry.method,
        url: entry.url,
        ...(entry.statusCode && { statusCode: entry.statusCode }),
        ...(entry.responseTime && { responseTime: entry.responseTime }),
        ...(entry.requestBody && { requestBody: entry.requestBody }),
        ...(entry.responseBody && { responseBody: entry.responseBody }),
        ...(entry.errorDetails && { errorDetails: entry.errorDetails }),
      }),

      // Performance-specific fields
      ...(isPerformanceEntry(entry) && {
        operation: entry.operation,
        duration: entry.duration,
        ...(entry.memoryUsage && { memoryUsage: entry.memoryUsage }),
        ...(entry.customMetrics && { customMetrics: entry.customMetrics }),
      }),
    };

    return JSON.stringify(logObject);
  }
}

// Performance formatter
export class SimplePerformanceFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    if (!isPerformanceEntry(entry)) {
      return new SimpleTextFormatter().format(entry);
    }

    const perfEntry = entry as PerformanceEntry;
    const level = getLevelName(entry.level);
    const timestamp = entry.timestamp.toISOString();

    let output = `${timestamp} [${level}] PERF: ${perfEntry.operation} - ${perfEntry.duration}ms`;

    if (perfEntry.memoryUsage) {
      const memMB = (perfEntry.memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
      output += ` | Memory: ${memMB}MB`;
    }

    if (perfEntry.customMetrics) {
      const metrics = Object.entries(perfEntry.customMetrics)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      output += ` | Metrics: ${metrics}`;
    }

    return output;
  }
}
