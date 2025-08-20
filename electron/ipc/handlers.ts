import { registerBrowserCommands } from './commands/browserCommands';
import { registerWorkflowCommands } from './commands/workflowCommands';
import { registerLoggingCommands } from './commands/loggingCommands';
import { registerUiCommands } from './commands/uiCommands';
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
  registerWorkflowCommands();
  registerLoggingCommands();
  registerUiCommands();
  
  global.__ipcHandlersInitialized = true;
  logger.info('[IPC] IPC handlers setup complete');
  // Handler list is now logged by each registration module.
} 