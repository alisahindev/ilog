const chalk = require('chalk');
import { ApiLogEntry, LogEntry, LogFormatter, LogLevel, PerformanceEntry } from '../types';

// Renk haritası
const levelColors = {
  [LogLevel.DEBUG]: chalk.gray,
  [LogLevel.INFO]: chalk.blue,
  [LogLevel.WARN]: chalk.yellow,
  [LogLevel.ERROR]: chalk.red,
  [LogLevel.FATAL]: chalk.magenta.bold
};

// Seviye isimlerini alma
const getLevelName = (level: LogLevel): string => {
  return LogLevel[level];
};

// JSON formatter
export class JsonFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    return JSON.stringify({
      ...entry,
      timestamp: entry.timestamp.toISOString(),
      level: getLevelName(entry.level)
    });
  }
}

// Pretty formatter (development için)
export class PrettyFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const level = getLevelName(entry.level);
    const colorFn = levelColors[entry.level];
    const timestamp = entry.timestamp.toISOString();
    
    let output = `${chalk.dim(timestamp)} ${colorFn(`[${level}]`)} ${entry.message}`;
    
    // Context bilgilerini ekle
    if (entry.context && Object.keys(entry.context).length > 0) {
      output += `\n${chalk.dim('Context:')} ${JSON.stringify(entry.context, null, 2)}`;
    }
    
    // Tags ekle
    if (entry.tags && entry.tags.length > 0) {
      output += `\n${chalk.dim('Tags:')} ${entry.tags.map(tag => chalk.cyan(`#${tag}`)).join(' ')}`;
    }
    
    // Request ID ekle
    if (entry.requestId) {
      output += `\n${chalk.dim('Request ID:')} ${chalk.green(entry.requestId)}`;
    }
    
    return output;
  }
}

// API-specific formatter
export class ApiFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    if (!this.isApiLogEntry(entry)) {
      return new PrettyFormatter().format(entry);
    }
    
    const apiEntry = entry as ApiLogEntry;
    const level = getLevelName(entry.level);
    const colorFn = levelColors[entry.level];
    const timestamp = entry.timestamp.toISOString();
    
    let output = `${chalk.dim(timestamp)} ${colorFn(`[${level}]`)} `;
    output += `${this.getMethodColor(apiEntry.method)}${apiEntry.method}${chalk.reset()} `;
    output += `${chalk.underline(apiEntry.url)}`;
    
    if (apiEntry.statusCode) {
      output += ` ${this.getStatusColor(apiEntry.statusCode)}${apiEntry.statusCode}${chalk.reset()}`;
    }
    
    if (apiEntry.responseTime) {
      output += ` ${chalk.dim(`(${apiEntry.responseTime}ms)`)}`;
    }
    
    output += `\n${entry.message}`;
    
    // Error details
    if (apiEntry.errorDetails) {
      output += `\n${chalk.red('Error Details:')}`;
      if (apiEntry.errorDetails.code) {
        output += `\n  Code: ${apiEntry.errorDetails.code}`;
      }
      if (apiEntry.errorDetails.stack) {
        output += `\n  Stack: ${chalk.dim(apiEntry.errorDetails.stack)}`;
      }
    }
    
    // Request/Response bodies (eğer çok büyük değilse)
    if (apiEntry.requestBody && JSON.stringify(apiEntry.requestBody).length < 1000) {
      output += `\n${chalk.dim('Request Body:')} ${JSON.stringify(apiEntry.requestBody, null, 2)}`;
    }
    
    if (apiEntry.responseBody && JSON.stringify(apiEntry.responseBody).length < 1000) {
      output += `\n${chalk.dim('Response Body:')} ${JSON.stringify(apiEntry.responseBody, null, 2)}`;
    }
    
    return output;
  }
  
  private isApiLogEntry(entry: LogEntry): entry is ApiLogEntry {
    return 'method' in entry && 'url' in entry;
  }
  
  private getMethodColor(method: string): string {
    const methodColors: Record<string, (str: string) => string> = {
      GET: chalk.green,
      POST: chalk.blue,
      PUT: chalk.yellow,
      DELETE: chalk.red,
      PATCH: chalk.magenta,
      HEAD: chalk.gray,
      OPTIONS: chalk.cyan
    };
    
    return methodColors[method] ? methodColors[method](method) : method;
  }
  
  private getStatusColor(status: number): (str: string) => string {
    if (status >= 200 && status < 300) return chalk.green;
    if (status >= 300 && status < 400) return chalk.yellow;
    if (status >= 400 && status < 500) return chalk.red;
    if (status >= 500) return chalk.magenta;
    return chalk.gray;
  }
}

// Performance formatter
export class PerformanceFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    if (!this.isPerformanceEntry(entry)) {
      return new PrettyFormatter().format(entry);
    }
    
    const perfEntry = entry as PerformanceEntry;
    const timestamp = entry.timestamp.toISOString();
    
    let output = `${chalk.dim(timestamp)} ${chalk.cyan('[PERF]')} `;
    output += `${chalk.bold(perfEntry.operation)} `;
    output += `${this.getDurationColor(perfEntry.duration)}${perfEntry.duration}ms${chalk.reset()}`;
    
    if (perfEntry.memoryUsage) {
      const heapMB = (perfEntry.memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
      output += ` ${chalk.dim(`(Heap: ${heapMB}MB)`)}`;
    }
    
    output += `\n${entry.message}`;
    
    if (perfEntry.customMetrics && Object.keys(perfEntry.customMetrics).length > 0) {
      output += `\n${chalk.dim('Metrics:')} ${JSON.stringify(perfEntry.customMetrics, null, 2)}`;
    }
    
    return output;
  }
  
  private isPerformanceEntry(entry: LogEntry): entry is PerformanceEntry {
    return 'operation' in entry && 'duration' in entry;
  }
  
  private getDurationColor(duration: number): (str: string) => string {
    if (duration < 100) return chalk.green;
    if (duration < 500) return chalk.yellow;
    if (duration < 1000) return chalk.red;
    return chalk.magenta;
  }
} 