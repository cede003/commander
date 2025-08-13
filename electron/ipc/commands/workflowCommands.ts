import { runPythonWorkflow } from '../../utils/pythonRunner';
import { createModalWindow } from '../../windows/modalWindow';
import { getBrowserView } from '../../views/browserViewManager';
import { getMainWindow } from '../../windows/mainWindow';
import logger from '../../utils/logger';
import { registerIpcHandlers } from '../register';

// Global initialization guards
declare global {}

export function registerWorkflowCommands(): void {
  registerIpcHandlers('workflowCommands', {
    'execute-workflow': async (_event, workflowData: string) => {
      logger.info('execute-workflow handler called');
      if (typeof workflowData === 'string') {
        logger.debug('Workflow data length:', { length: workflowData.length });
        logger.debug('Executing workflow with data:', { preview: workflowData.substring(0, 100) + '...' });
      }
      const result = await runPythonWorkflow({ workflowData });
      return result;
    },

    'execute-workflow-command': async (_event, command: string, data: any) => {
      logger.info('Executing workflow command:', { command });
      const browserView = getBrowserView();
      if (!browserView) {
        throw new Error('BrowserView not available');
      }

      switch (command) {
        case 'navigate':
          await browserView.webContents.loadURL(data.url);
          return { success: true };

        case 'fill-form':
          await browserView.webContents.executeJavaScript(`
            (() => {
              const fields = ${JSON.stringify(data.fields)};
              for (const [selector, value] of Object.entries(fields)) {
                const element = document.querySelector(selector);
                if (element && 'value' in element) {
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
              if (element && typeof element.click === 'function') {
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
              return element ? (element.textContent ?? '') : '';
            })()
          `);
          return { success: true, text };

        default:
          throw new Error(`Unknown workflow command: ${command}`);
      }
    },

    'open-create-workflow-modal': async () => {
      logger.info('Opening create workflow modal');
      const mainWindow = getMainWindow();
      if (mainWindow) {
        createModalWindow(mainWindow);
      }
      return { success: true };
    },

    'create-workflow': async (_event, workflow: { id?: string; name: string; description: string; workflowData: string; isEditing?: boolean }) => {
      // Forward to the main window so the renderer can handle persistence/UI
      const mainWindow = getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('workflow-created', workflow);
      }
      return { success: true };
    },
  });
}