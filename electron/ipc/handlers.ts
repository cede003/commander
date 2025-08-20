import { registerBrowserCommands } from './commands/browserCommands';
import { registerLoggingCommands } from './commands/loggingCommands';
import { registerUiCommands } from './commands/uiCommands';
import { registerWorkflowCommands } from './commands/workflowCommands';
import logger from '../utils/logger';

// Declare global variables
declare global {
  var __ipcHandlersInitialized: boolean;
}

export function setupIpcHandlers(): void {
  if (global.__ipcHandlersInitialized) {
    logger.debug('[IPC] IPC handlers already initialized, skipping');
    return;
  }
  
  logger.info('[IPC] Setting up IPC handlers');
  
  // Register all command handlers
  registerBrowserCommands();
  registerLoggingCommands();
  registerUiCommands();
  registerWorkflowCommands();
  
  global.__ipcHandlersInitialized = true;
  logger.info('[IPC] IPC handlers setup complete');
  // Handler list is now logged by each registration module.
} 