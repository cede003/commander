// Browser-compatible logger that mimics Winston API
// This avoids Node.js dependencies that cause issues in the browser

interface LogLevel {
  error: number;
  warn: number;
  info: number;
  debug: number;
  verbose: number;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  service: string;
  module?: string;
  function?: string;
  line?: number;
  workflowId?: string;
  workflowName?: string;
  runId?: string;
  [key: string]: any;
}

class BrowserLogger {
  private level: string;
  private name: string;
  private workflowId?: string;
  private workflowName?: string;
  private runId?: string;

  private levels: LogLevel = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    verbose: 4
  };

  constructor(name: string, options: any = {}) {
    this.name = name;
    this.level = this.getLogLevel();
    this.workflowId = options.workflowId;
    this.workflowName = options.workflowName;
    this.runId = options.runId;
  }

  private getLogLevel(): string {
    // Check for LOG_LEVEL in URL params or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const localStorageLevel = localStorage.getItem('LOG_LEVEL');
    const urlLevel = urlParams.get('LOG_LEVEL');
    const envLevel = (window as any).LOG_LEVEL;
    
    const level = urlLevel || localStorageLevel || envLevel || 'info';
    const validLevels = ['error', 'warn', 'info', 'debug', 'verbose'];
    
    return validLevels.includes(level) ? level : 'info';
  }

  private shouldLog(level: string): boolean {
    return this.levels[level as keyof LogLevel] <= this.levels[this.level as keyof LogLevel];
  }

  private formatMessage(level: string, message: string, meta?: any): LogEntry {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    const entry: LogEntry = {
      timestamp,
      level,
      message,
      service: 'commander',
      module: this.name
    };

    if (this.workflowId) entry.workflowId = this.workflowId;
    if (this.workflowName) entry.workflowName = this.workflowName;
    if (this.runId) entry.runId = this.runId;

    if (meta) {
      Object.assign(entry, meta);
    }

    return entry;
  }

  private logToConsole(entry: LogEntry): void {
    const colors = {
      error: 'color: #ff0000; font-weight: bold;',
      warn: 'color: #ffa500; font-weight: bold;',
      info: 'color: #0000ff; font-weight: bold;',
      debug: 'color: #008000; font-weight: bold;',
      verbose: 'color: #808080; font-weight: bold;'
    };

    const style = colors[entry.level as keyof typeof colors] || '';
    const timestamp = entry.timestamp;
    const level = entry.level.toUpperCase();
    const extra = entry.workflowId ? ` [workflow:${entry.workflowId}]` : '';
    const extra2 = entry.runId ? ` [run:${entry.runId}]` : '';

    // Use consistent format similar to Winston
    console.log(`${timestamp} [${level}]: ${entry.message}${extra}${extra2}`, style, entry);
  }

  private logToStorage(entry: LogEntry): void {
    try {
      // Store in localStorage for persistence
      const logs = JSON.parse(localStorage.getItem('commander_logs') || '[]');
      logs.push(entry);
      
      // Keep only last 1000 entries
      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
      }
      
      localStorage.setItem('commander_logs', JSON.stringify(logs));
    } catch (error) {
      console.warn('Failed to store log entry:', error);
    }
  }

  private log(level: string, message: string, meta?: any): void {
    if (!this.shouldLog(level)) return;

    const entry = this.formatMessage(level, message, meta);
    
    // Console output
    this.logToConsole(entry);
    
    // Storage for persistence
    this.logToStorage(entry);
    
    // Send to main process if available (for Electron) - only in production or when explicitly enabled
    const shouldSendToMain = process.env.NODE_ENV === 'production' || 
                           localStorage.getItem('SEND_LOGS_TO_MAIN') === 'true';
    
    if (shouldSendToMain && (window as any).electronAPI?.logEntry) {
      try {
        (window as any).electronAPI.logEntry(entry);
      } catch (error) {
        // Ignore errors if electronAPI is not available
      }
    }
  }

  error(message: string, meta?: any): void {
    this.log('error', message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log('warn', message, meta);
  }

  info(message: string, meta?: any): void {
    this.log('info', message, meta);
  }

  debug(message: string, meta?: any): void {
    this.log('debug', message, meta);
  }

  verbose(message: string, meta?: any): void {
    this.log('verbose', message, meta);
  }
}

// Create main logger instance
const logger = new BrowserLogger('commander');

// Create workflow-specific logger
export const createWorkflowLogger = (workflowId: string, workflowName?: string): BrowserLogger => {
  return new BrowserLogger(`commander.workflow.${workflowId}`, {
    workflowId,
    workflowName
  });
};

// Create run-specific logger
export const createRunLogger = (runId: string, workflowId?: string): BrowserLogger => {
  return new BrowserLogger(`commander.run.${runId}`, {
    workflowId,
    runId
  });
};

// Export the main logger
export default logger;

// Export convenience methods
export const log = {
  error: (message: string, meta?: any) => logger.error(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  info: (message: string, meta?: any) => logger.info(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),
  verbose: (message: string, meta?: any) => logger.verbose(message, meta),
};

// Utility function to get stored logs
export const getStoredLogs = (): LogEntry[] => {
  try {
    return JSON.parse(localStorage.getItem('commander_logs') || '[]');
  } catch (error) {
    console.warn('Failed to get stored logs:', error);
    return [];
  }
};

// Utility function to clear stored logs
export const clearStoredLogs = (): void => {
  localStorage.removeItem('commander_logs');
}; 