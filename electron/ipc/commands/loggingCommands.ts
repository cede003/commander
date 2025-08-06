import { ipcMain } from 'electron';
import logger from '../../utils/logger';

export function registerLoggingCommands(): void {
  // Handle log entries from renderer process
  ipcMain.handle('logEntry', (event, logEntry) => {
    try {
      const { level, message, ...meta } = logEntry;
      switch (level) {
        case 'error':
          logger.error(message, meta);
          break;
        case 'warn':
          logger.warn(message, meta);
          break;
        case 'info':
          logger.info(message, meta);
          break;
        case 'debug':
          logger.debug(message, meta);
          break;
        case 'verbose':
          logger.verbose(message, meta);
          break;
        default:
          logger.info(message, meta);
      }
    } catch (error) {
      logger.error('Failed to handle log entry from renderer', { error: String(error), logEntry });
    }
  });
} 