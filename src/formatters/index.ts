const chalk = require('chalk');
import { ApiLogEntry, LogEntry, LogFormatter, LogLevel, PerformanceEntry } from '../types';

// Color mapping
const levelColors = {
  [LogLevel.DEBUG]: chalk.gray,
  [LogLevel.INFO]: chalk.blue,
  [LogLevel.WARN]: chalk.yellow,
  [LogLevel.ERROR]: chalk.red,
  [LogLevel.FATAL]: chalk.magenta.bold
};

// Get level names
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

// Pretty formatter (for development)
export class PrettyFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const level = getLevelName(entry.level);
    const colorFn = levelColors[entry.level];
    const timestamp = entry.timestamp.toISOString();
    
    let output = `${chalk.dim(timestamp)} ${colorFn(`[${level}]`)} ${entry.message}`;
    
    // Add context information
    if (entry.context && Object.keys(entry.context).length > 0) {
      output += `\n${chalk.dim('Context:')} ${JSON.stringify(entry.context, null, 2)}`;
    }
    
    // Add tags
    if (entry.tags && entry.tags.length > 0) {
      output += `\n${chalk.dim('Tags:')} ${entry.tags.map(tag => chalk.cyan(`#${tag}`)).join(' ')}`;
    }
    
    // Add request ID
    if (entry.requestId) {
      output += `\n${chalk.dim('Request ID:')} ${chalk.green(entry.requestId)}`;
    }
    
    return output;
  }
}

// JSON formatter (for production)
export class JsonFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const logObject = {
      timestamp: entry.timestamp.toISOString(),
      level: getLevelName(entry.level),
      message: entry.message,
      ...(entry.context && { context: entry.context }),
      ...(entry.tags && { tags: entry.tags }),
      ...(entry.requestId && { requestId: entry.requestId }),
      ...(entry.userId && { userId: entry.userId }),
      ...(entry.sessionId && { sessionId: entry.sessionId }),
      
      // API-specific fields
      ...(isApiLogEntry(entry) && {
        method: entry.method,
        url: entry.url,
        ...(entry.statusCode && { statusCode: entry.statusCode }),
        ...(entry.responseTime && { responseTime: entry.responseTime }),
        ...(entry.requestHeaders && { requestHeaders: entry.requestHeaders }),
        ...(entry.responseHeaders && { responseHeaders: entry.responseHeaders }),
        ...(entry.requestBody && { requestBody: entry.requestBody }),
        ...(entry.responseBody && { responseBody: entry.responseBody }),
        ...(entry.errorDetails && { errorDetails: entry.errorDetails })
      }),
      
      // Performance-specific fields
      ...(isPerformanceEntry(entry) && {
        operation: entry.operation,
        duration: entry.duration,
        ...(entry.memoryUsage && { memoryUsage: entry.memoryUsage }),
        ...(entry.customMetrics && { customMetrics: entry.customMetrics })
      })
    };
    
    return JSON.stringify(logObject);
  }
}

// API-specific formatter
export class ApiFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    if (!isApiLogEntry(entry)) {
      return new PrettyFormatter().format(entry);
    }
    
    const apiEntry = entry as ApiLogEntry;
    const level = getLevelName(entry.level);
    const colorFn = levelColors[entry.level];
    const timestamp = entry.timestamp.toISOString();
    
    // Status code color
    const statusColor = apiEntry.statusCode 
      ? (apiEntry.statusCode >= 400 ? chalk.red : apiEntry.statusCode >= 300 ? chalk.yellow : chalk.green)
      : chalk.white;
    
    let output = `${chalk.dim(timestamp)} ${colorFn(`[${level}]`)} `;
    output += `${chalk.cyan(apiEntry.method)} ${chalk.white(apiEntry.url)}`;
    
    if (apiEntry.statusCode) {
      output += ` ${statusColor(apiEntry.statusCode)}`;
    }
    
    if (apiEntry.responseTime) {
      const timeColor = apiEntry.responseTime > 1000 ? chalk.red : apiEntry.responseTime > 500 ? chalk.yellow : chalk.green;
      output += ` ${timeColor(`${apiEntry.responseTime}ms`)}`;
    }
    
    // Error details
    if (apiEntry.errorDetails) {
      output += `\n${chalk.red('Error:')} ${apiEntry.errorDetails.code || 'Unknown'}`;
      if (apiEntry.errorDetails.stack) {
        output += `\n${chalk.dim(apiEntry.errorDetails.stack)}`;
      }
    }
    
    // Request/Response bodies (limited size)
    if (apiEntry.requestBody && JSON.stringify(apiEntry.requestBody).length < 500) {
      output += `\n${chalk.dim('Request:')} ${JSON.stringify(apiEntry.requestBody, null, 2)}`;
    }
    
    if (apiEntry.responseBody && JSON.stringify(apiEntry.responseBody).length < 500) {
      output += `\n${chalk.dim('Response:')} ${JSON.stringify(apiEntry.responseBody, null, 2)}`;
    }
    
    return output;
  }
}

// Performance-specific formatter
export class PerformanceFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    if (!isPerformanceEntry(entry)) {
      return new PrettyFormatter().format(entry);
    }
    
    const perfEntry = entry as PerformanceEntry;
    const timestamp = entry.timestamp.toISOString();
    
    // Duration color based on performance
    const durationColor = perfEntry.duration > 1000 
      ? chalk.red 
      : perfEntry.duration > 500 
        ? chalk.yellow 
        : chalk.green;
    
    let output = `${chalk.dim(timestamp)} ${chalk.magenta('[PERF]')} `;
    output += `${chalk.white(perfEntry.operation)} `;
    output += `${durationColor(`${perfEntry.duration}ms`)}`;
    
    if (perfEntry.memoryUsage) {
      const memMB = (perfEntry.memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
      const memColor = parseFloat(memMB) > 100 ? chalk.red : parseFloat(memMB) > 50 ? chalk.yellow : chalk.green;
      output += ` ${memColor(`${memMB}MB`)}`;
    }
    
    if (perfEntry.customMetrics) {
      const metrics = Object.entries(perfEntry.customMetrics)
        .map(([key, value]) => `${chalk.cyan(key)}: ${chalk.white(value)}`)
        .join(' ');
      output += ` ${metrics}`;
    }
    
    return output;
  }
} 