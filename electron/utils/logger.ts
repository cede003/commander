import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = ` ${JSON.stringify(meta)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Get log level from environment variable
const getLogLevel = (): string => {
  const envLevel = (process.env.LOG_LEVEL || '').toLowerCase();
  // Treat "verbose" as an alias for "debug" to include debug logs
  if (envLevel === 'verbose') return 'debug';
  if (['error', 'warn', 'info', 'debug'].includes(envLevel)) return envLevel;
  // Default
  return 'info';
};

// Create logger instance
const logger = winston.createLogger({
  level: getLogLevel(),
  format: fileFormat,
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  // Add error handling to prevent crashes
  exitOnError: false,
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    handleExceptions: true,
    handleRejections: true,
    // Add error handling to prevent EPIPE errors
    silent: false,
  }));
}

// Allow runtime log level override
export const setLogLevel = (level: string) => {
  const normalized = (level || '').toLowerCase();
  const mapped = normalized === 'verbose' ? 'debug' : normalized;
  const valid = ['error', 'warn', 'info', 'debug'];
  if (valid.includes(mapped)) {
    logger.level = mapped;
  }
};

// Apply log level based on argv flags
// Supports: --verbose | -v, --log_level=info, --log-level=debug
export const applyLogLevelFromArgv = (argv: string[]) => {
  const hasVerbose = argv.includes('--verbose') || argv.includes('-v');
  const explicitArg = argv.find(a => a.startsWith('--log_level=') || a.startsWith('--log-level='));

  if (hasVerbose) {
    setLogLevel('verbose');
    process.env.LOG_LEVEL = 'verbose';
  }

  if (explicitArg) {
    const level = (explicitArg.split('=')[1] || '').toLowerCase();
    if (level) {
      setLogLevel(level);
      process.env.LOG_LEVEL = level;
    }
  }
};

// Create workflow-specific logger
export const createWorkflowLogger = (workflowId: string, workflowName?: string) => {
  const workflowLogsDir = path.join(logsDir, 'workflows');
  if (!fs.existsSync(workflowLogsDir)) {
    fs.mkdirSync(workflowLogsDir, { recursive: true });
  }

  const workflowLogger = winston.createLogger({
    level: getLogLevel(),
    format: fileFormat,
    defaultMeta: { 
      workflowId,
      workflowName: workflowName || workflowId
    },
    transports: [
      new winston.transports.File({
        filename: path.join(workflowLogsDir, `${workflowId}.log`),
        maxsize: 5242880, // 5MB
        maxFiles: 3,
      }),
    ],
  });

  // Add console transport for development
  if (process.env.NODE_ENV !== 'production') {
    workflowLogger.add(new winston.transports.Console({
      format: consoleFormat,
    }));
  }

  return workflowLogger;
};

// Create run-specific logger
export const createRunLogger = (runId: string, workflowId?: string) => {
  const runLogsDir = path.join(logsDir, 'runs');
  if (!fs.existsSync(runLogsDir)) {
    fs.mkdirSync(runLogsDir, { recursive: true });
  }

  const runLogger = winston.createLogger({
    level: getLogLevel(),
    format: fileFormat,
    defaultMeta: { 
      runId,
      workflowId: workflowId || 'unknown'
    },
    transports: [
      new winston.transports.File({
        filename: path.join(runLogsDir, `${runId}.log`),
        maxsize: 5242880, // 5MB
        maxFiles: 3,
      }),
    ],
  });

  // Add console transport for development
  if (process.env.NODE_ENV !== 'production') {
    runLogger.add(new winston.transports.Console({
      format: consoleFormat,
    }));
  }

  return runLogger;
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