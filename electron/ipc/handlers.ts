import { registerBrowserCommands } from './commands/browserCommands';
import { registerWorkflowCommands } from './commands/workflowCommands';

export function setupIpcHandlers(): void {
  console.log('[IPC] Setting up IPC handlers');
  
  // Register all command handlers
  registerBrowserCommands();
  registerWorkflowCommands();
  
  console.log('[IPC] IPC handlers setup complete');
} 