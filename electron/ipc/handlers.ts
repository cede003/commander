import { registerBrowserCommands } from './commands/browserCommands';
import { registerLoggingCommands } from './commands/loggingCommands';
import { registerUiCommands } from './commands/uiCommands';
import { registerWorkflowCommands } from './commands/workflowCommands';
import logger from '../utils/logger';

// Use a more robust guard mechanism
let ipcHandlersInitialized = false;

export function setupIpcHandlers(): void {
  if (ipcHandlersInitialized) {
    logger.debug('[IPC] IPC handlers already initialized, skipping');
    return;
  }
  
  logger.info('[IPC] Setting up IPC handlers');
  
  // Register all command handlers
  registerBrowserCommands();
  registerLoggingCommands();
  registerUiCommands();
  registerWorkflowCommands();
  
  ipcHandlersInitialized = true;
  logger.info('[IPC] IPC handlers setup complete');
  // Handler list is now logged by each registration module.
} 