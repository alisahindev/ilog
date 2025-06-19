import { ApiLogEntry, LogEntry, LogFormatter, LogLevel, PerformanceEntry } from '../types';

// Seviye isimlerini alma
const getLevelName = (level: LogLevel): string => {
  return LogLevel[level];
};

// Basit JSON formatter
export class SimpleJsonFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    return JSON.stringify({
      ...entry,
      timestamp: entry.timestamp.toISOString(),
      level: getLevelName(entry.level)
    });
  }
}

// Basit text formatter
export class SimpleTextFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const level = getLevelName(entry.level);
    const timestamp = entry.timestamp.toISOString();
    
    let output = `${timestamp} [${level}] ${entry.message}`;
    
    // Context bilgilerini ekle
    if (entry.context && Object.keys(entry.context).length > 0) {
      output += `\nContext: ${JSON.stringify(entry.context, null, 2)}`;
    }
    
    // Request ID ekle
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
    
    // Request/Response bodies (eğer çok büyük değilse)
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

// Performance formatter
export class SimplePerformanceFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    if (!this.isPerformanceEntry(entry)) {
      return new SimpleTextFormatter().format(entry);
    }
    
    const perfEntry = entry as PerformanceEntry;
    const timestamp = entry.timestamp.toISOString();
    
    let output = `${timestamp} [PERF] ${perfEntry.operation} - ${perfEntry.duration}ms`;
    
    if (perfEntry.memoryUsage) {
      const heapMB = (perfEntry.memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
      output += ` (Heap: ${heapMB}MB)`;
    }
    
    output += `\n${entry.message}`;
    
    if (perfEntry.customMetrics && Object.keys(perfEntry.customMetrics).length > 0) {
      output += `\nMetrics: ${JSON.stringify(perfEntry.customMetrics, null, 2)}`;
    }
    
    return output;
  }
  
  private isPerformanceEntry(entry: LogEntry): entry is PerformanceEntry {
    return 'operation' in entry && 'duration' in entry;
  }
} 