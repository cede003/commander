import { registerBrowserCommands } from './commands/browserCommands';
import { registerWorkflowCommands } from './commands/workflowCommands';

export function setupIpcHandlers(): void {
  console.log('[IPC] Setting up IPC handlers');
  
  // Register all command handlers
  registerBrowserCommands();
  registerWorkflowCommands();
  
  console.log('[IPC] IPC handlers setup complete');
  console.log('[IPC] Available IPC handlers:');
  console.log('[IPC] - initialize-browser-view');
  console.log('[IPC] - load-url');
  console.log('[IPC] - load-url-in-browser-view');
  console.log('[IPC] - get-current-url');
  console.log('[IPC] - navigate');
  console.log('[IPC] - focus-browser-view');
  console.log('[IPC] - update-browser-view-bounds-from-client');
  console.log('[IPC] - update-sidebar-visibility');
  console.log('[IPC] - test-ipc');
  console.log('[IPC] - execute-workflow');
  console.log('[IPC] - execute-workflow-command');
  console.log('[IPC] - open-create-workflow-modal');
} 