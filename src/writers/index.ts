import * as fs from 'fs';
import * as path from 'path';
import { LogLevel, LogWriter } from '../types';

// Console writer
export class ConsoleWriter implements LogWriter {
  write(formattedLog: string, level: LogLevel): void {
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedLog);
        break;
      case LogLevel.INFO:
        console.info(formattedLog);
        break;
      case LogLevel.WARN:
        console.warn(formattedLog);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formattedLog);
        break;
      default:
        console.log(formattedLog);
    }
  }
}

// File writer with rotation support
export class FileWriter implements LogWriter {
  private currentFileSize: number = 0;
  private fileIndex: number = 0;
  
  constructor(
    private filePath: string,
    private maxFileSize: number = 10, // MB
    private maxFiles: number = 5
  ) {
    this.ensureDirectoryExists();
    this.initializeFileSize();
  }
  
  async write(formattedLog: string, level: LogLevel): Promise<void> {
    const logLine = `${formattedLog}\n`;
    const logSize = Buffer.byteLength(logLine, 'utf8');
    
    // File size check
    if (this.currentFileSize + logSize > this.maxFileSize * 1024 * 1024) {
      await this.rotateFile();
    }
    
    try {
      await fs.promises.appendFile(this.getCurrentFilePath(), logLine);
      this.currentFileSize += logSize;
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }
  
  private ensureDirectoryExists(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  private initializeFileSize(): void {
    const currentFile = this.getCurrentFilePath();
    if (fs.existsSync(currentFile)) {
      const stats = fs.statSync(currentFile);
      this.currentFileSize = stats.size;
    }
  }
  
  private getCurrentFilePath(): string {
    if (this.fileIndex === 0) {
      return this.filePath;
    }
    const ext = path.extname(this.filePath);
    const base = path.basename(this.filePath, ext);
    const dir = path.dirname(this.filePath);
    return path.join(dir, `${base}.${this.fileIndex}${ext}`);
  }
  
  private async rotateFile(): Promise<void> {
    // Rotate old files
    for (let i = this.maxFiles - 1; i > 0; i--) {
      const oldFile = this.getFilePathWithIndex(i);
      const newFile = this.getFilePathWithIndex(i + 1);
      
      if (fs.existsSync(oldFile)) {
        if (i === this.maxFiles - 1) {
          // Delete the oldest file
          fs.unlinkSync(oldFile);
        } else {
          fs.renameSync(oldFile, newFile);
        }
      }
    }
    
    // Rename current file to .1
    const currentFile = this.getCurrentFilePath();
    if (fs.existsSync(currentFile)) {
      const rotatedFile = this.getFilePathWithIndex(1);
      fs.renameSync(currentFile, rotatedFile);
    }
    
    this.currentFileSize = 0;
  }
  
  private getFilePathWithIndex(index: number): string {
    if (index === 0) {
      return this.filePath;
    }
    const ext = path.extname(this.filePath);
    const base = path.basename(this.filePath, ext);
    const dir = path.dirname(this.filePath);
    return path.join(dir, `${base}.${index}${ext}`);
  }
}

// Buffer writer (async batch writing)
export class BufferedWriter implements LogWriter {
  private buffer: string[] = [];
  private flushTimer?: NodeJS.Timeout;
  
  constructor(
    private targetWriter: LogWriter,
    private bufferSize: number = 100,
    private flushInterval: number = 5000 // 5 seconds
  ) {
    this.scheduleFlush();
  }
  
  write(formattedLog: string, level: LogLevel): void {
    this.buffer.push(formattedLog);
    
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }
  }
  
  private scheduleFlush(): void {
    this.flushTimer = setTimeout(() => {
      this.flush();
      this.scheduleFlush();
    }, this.flushInterval);
  }
  
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const logsToFlush = [...this.buffer];
    this.buffer = [];
    
    for (const log of logsToFlush) {
      await this.targetWriter.write(log, LogLevel.INFO); // Level is not important here
    }
  }
  
  // For graceful shutdown
  async close(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    await this.flush();
  }
}

// HTTP writer for remote logging
export class HttpWriter implements LogWriter {
  constructor(
    private endpoint: string,
    private headers: Record<string, string> = {}
  ) {}
  
  async write(formattedLog: string, level: LogLevel): Promise<void> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers
        },
        body: JSON.stringify({ log: formattedLog, level })
      });
      
      if (!response.ok) {
        console.error('Failed to send log to HTTP endpoint:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending log to HTTP endpoint:', error);
    }
  }
} 