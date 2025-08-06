import { ipcMain } from 'electron';
import { runPythonWorkflow } from '../../utils/pythonRunner';
import { createModalWindow } from '../../windows/modalWindow';
import { getBrowserView } from '../../views/browserViewManager';
import { getMainWindow } from '../../windows/mainWindow';

export function registerWorkflowCommands(): void {
  // Execute workflow with Python
  ipcMain.handle('execute-workflow', async (event, workflowData: string) => {
    console.log(`[IPC] execute-workflow handler called`);
    console.log(`[IPC] Workflow data length:`, workflowData.length);
    console.log(`[IPC] Executing workflow with data:`, workflowData.substring(0, 100) + '...');
    
    try {
      const result = await runPythonWorkflow({ workflowData });
      console.log(`[IPC] Workflow executed successfully using new dynamic method`);
      return result;
    } catch (error) {
      console.error(`[IPC] Error executing workflow:`, error);
      throw error;
    }
  });

  // Execute workflow command in BrowserView
  ipcMain.handle('execute-workflow-command', async (event, command: string, data: any) => {
    console.log(`[IPC] Executing workflow command: ${command}`);
    
    const browserView = getBrowserView();
    if (!browserView) {
      throw new Error('BrowserView not available');
    }
    
    try {
      switch (command) {
        case 'navigate':
          await browserView.webContents.loadURL(data.url);
          return { success: true };
          
        case 'fill-form':
          // Execute JavaScript to fill form fields
          await browserView.webContents.executeJavaScript(`
            (() => {
              const fields = ${JSON.stringify(data.fields)};
              for (const [selector, value] of Object.entries(fields)) {
                const element = document.querySelector(selector);
                if (element) {
                  element.value = value;
                  element.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }
              return true;
            })()
          `);
          return { success: true };
          
        case 'click-element':
          await browserView.webContents.executeJavaScript(`
            (() => {
              const element = document.querySelector('${data.selector}');
              if (element) {
                element.click();
                return true;
              }
              return false;
            })()
          `);
          return { success: true };
          
        case 'get-text':
          const text = await browserView.webContents.executeJavaScript(`
            (() => {
              const element = document.querySelector('${data.selector}');
              return element ? element.textContent : '';
            })()
          `);
          return { success: true, text };
          
        default:
          throw new Error(`Unknown workflow command: ${command}`);
      }
    } catch (error) {
      console.error(`[IPC] Error executing workflow command:`, error);
      throw error;
    }
  });

  // Open create workflow modal
  ipcMain.handle('open-create-workflow-modal', async (event) => {
    console.log(`[IPC] Opening create workflow modal`);
    const mainWindow = getMainWindow();
    if (mainWindow) {
      createModalWindow(mainWindow);
    }
    return { success: true };
  });
} 