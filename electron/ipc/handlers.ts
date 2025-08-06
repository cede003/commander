import { registerBrowserCommands } from './commands/browserCommands';
import { registerWorkflowCommands } from './commands/workflowCommands';
import { registerLoggingCommands } from './commands/loggingCommands';
import logger from '../utils/logger';

export function setupIpcHandlers(): void {
  logger.info('[IPC] Setting up IPC handlers');
  
  // Register all command handlers
  registerBrowserCommands();
  registerWorkflowCommands();
  registerLoggingCommands();
  
  logger.info('[IPC] IPC handlers setup complete');
  logger.debug('[IPC] Available IPC handlers:');
  logger.debug('[IPC] - initialize-browser-view');
  logger.debug('[IPC] - load-url');
  logger.debug('[IPC] - load-url-in-browser-view');
  logger.debug('[IPC] - get-current-url');
  logger.debug('[IPC] - navigate');
  logger.debug('[IPC] - focus-browser-view');
  logger.debug('[IPC] - update-browser-view-bounds-from-client');
  logger.debug('[IPC] - update-sidebar-visibility');
  logger.debug('[IPC] - test-ipc');
  logger.debug('[IPC] - execute-workflow');
  logger.debug('[IPC] - execute-workflow-command');
  logger.debug('[IPC] - open-create-workflow-modal');
  logger.debug('[IPC] - logEntry');
} 