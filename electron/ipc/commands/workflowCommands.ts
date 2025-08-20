import { ipcMain } from 'electron';
import { runPythonWorkflow } from '../../utils/pythonRunner';
import logger from '../../utils/logger';

export function registerWorkflowCommands(): void {
  logger.info('[IPC] Registered workflow command handler(s)');

  ipcMain.handle('execute-workflow', async (event, workflowData: string) => {
    try {
      logger.info('Executing workflow:', { workflowDataLength: workflowData.length });
      
      // Parse workflow data to get metadata for logging
      let workflowName = 'Unknown';
      try {
        const parsed = JSON.parse(workflowData);
        workflowName = parsed.metadata?.name || 'Unknown';
      } catch (e) {
        logger.warn('Could not parse workflow metadata for logging');
      }
      
      logger.info(`Starting execution of workflow: ${workflowName}`);
      
      const result = await runPythonWorkflow({
        workflowData,
        timeout: 120000 // Increased to 120 seconds (2 minutes)
      });
      
      logger.info(`Workflow execution completed: ${workflowName}`, { 
        success: result.success
      });
      return result;
      
    } catch (error) {
      logger.error('Workflow execution failed:', error);
      throw error;
    }
  });
} 