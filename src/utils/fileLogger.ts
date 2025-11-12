/**
 * File Logger for React Native
 * Writes console logs to a file in the app's document directory
 */

import * as FileSystem from 'expo-file-system';

class FileLogger {
  private logFilePath: string = '';
  private latestLogPath: string = '';
  private isInitialized: boolean = false;
  private logBuffer: string[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize paths - will be set in initialize()
  }

  private initPaths() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const docsDir = (FileSystem as any).documentDirectory || '';
    this.logFilePath = `${docsDir}logs/app_${timestamp}.log`;
    this.latestLogPath = `${docsDir}logs/app_latest.log`;
  }

  async initialize() {
    try {
      // Initialize paths
      this.initPaths();
      
      // Create logs directory if it doesn't exist
      const docsDir = (FileSystem as any).documentDirectory || '';
      const logsDir = `${docsDir}logs/`;
      const dirInfo = await FileSystem.getInfoAsync(logsDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(logsDir, { intermediates: true });
      }

      // Initialize log files
      const header = `
================================================================================
Fantasy Competition Mobile App - Log File
Started: ${new Date().toISOString()}
Log File: ${this.logFilePath}
================================================================================
\n`;

      await FileSystem.writeAsStringAsync(this.logFilePath, header);
      await FileSystem.writeAsStringAsync(this.latestLogPath, header);

      this.isInitialized = true;
      console.log(`📝 [LOGGER] Log files initialized:`);
      console.log(`📝 [LOGGER] Main: ${this.logFilePath}`);
      console.log(`📝 [LOGGER] Latest: ${this.latestLogPath}`);

      // Start periodic flush
      this.flushInterval = setInterval(() => this.flush(), 2000);

    } catch (error) {
      console.error('❌ [LOGGER] Failed to initialize logger:', error);
    }
  }

  private formatMessage(level: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    return `${timestamp} | ${level.padEnd(8)} | ${message}\n`;
  }

  private async writeToFile(message: string) {
    if (!this.isInitialized) {
      this.logBuffer.push(message);
      return;
    }

    try {
      // Write to both files
      await FileSystem.writeAsStringAsync(this.logFilePath, message, {
        encoding: 'utf8',
      });
      await FileSystem.writeAsStringAsync(this.latestLogPath, message, {
        encoding: 'utf8',
      });
    } catch (error) {
      // Silently fail to avoid infinite loops
    }
  }

  private async flush() {
    if (this.logBuffer.length === 0) return;

    const messages = [...this.logBuffer];
    this.logBuffer = [];

    try {
      for (const message of messages) {
        await this.writeToFile(message);
      }
    } catch (error) {
      // Silently fail
    }
  }

  log(...args: any[]) {
    const message = this.formatMessage('INFO', ...args);
    this.logBuffer.push(message);
  }

  info(...args: any[]) {
    const message = this.formatMessage('INFO', ...args);
    this.logBuffer.push(message);
  }

  warn(...args: any[]) {
    const message = this.formatMessage('WARN', ...args);
    this.logBuffer.push(message);
  }

  error(...args: any[]) {
    const message = this.formatMessage('ERROR', ...args);
    this.logBuffer.push(message);
  }

  debug(...args: any[]) {
    const message = this.formatMessage('DEBUG', ...args);
    this.logBuffer.push(message);
  }

  async getLogPath(): Promise<string> {
    return this.latestLogPath;
  }

  async getLogContent(): Promise<string> {
    try {
      const content = await FileSystem.readAsStringAsync(this.latestLogPath);
      return content;
    } catch (error) {
      return 'No log file found';
    }
  }

  async cleanup() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush();
  }
}

// Create singleton instance
const fileLogger = new FileLogger();

// Override console methods to also write to file
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

export function initializeFileLogging() {
  fileLogger.initialize();

  // Override console methods
  console.log = (...args: any[]) => {
    originalConsole.log(...args);
    fileLogger.log(...args);
  };

  console.info = (...args: any[]) => {
    originalConsole.info(...args);
    fileLogger.info(...args);
  };

  console.warn = (...args: any[]) => {
    originalConsole.warn(...args);
    fileLogger.warn(...args);
  };

  console.error = (...args: any[]) => {
    originalConsole.error(...args);
    fileLogger.error(...args);
  };

  console.debug = (...args: any[]) => {
    originalConsole.debug(...args);
    fileLogger.debug(...args);
  };
}

export async function getLogFilePath(): Promise<string> {
  return fileLogger.getLogPath();
}

export async function getLogContent(): Promise<string> {
  return fileLogger.getLogContent();
}

export async function shareLogFile(): Promise<void> {
  try {
    const logPath = await fileLogger.getLogPath();
    const fileInfo = await FileSystem.getInfoAsync(logPath);
    
    if (!fileInfo.exists) {
      console.warn('⚠️ [LOGGER] No log file to share');
      return;
    }

    // You can implement sharing here using expo-sharing
    console.log(`📤 [LOGGER] Log file available at: ${logPath}`);
  } catch (error) {
    console.error('❌ [LOGGER] Error sharing log file:', error);
  }
}

export { fileLogger };
