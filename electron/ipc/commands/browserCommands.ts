import { 
  getBrowserView, 
  loadURLInBrowserView, 
  focusBrowserView,
  setSidebarVisible,
  getSidebarVisible,
  manualRecovery,
  getBrowserViewHealthStatus
} from '../../views/browserViewManager';
import { getMainWindow } from '../../windows/mainWindow';
import { updateBrowserViewBounds } from '../../utils/bounds';
import logger from '../../utils/logger';
import { registerIpcHandlers } from '../register';
import { runPythonWorkflow } from '../../utils/pythonRunner';

export function registerBrowserCommands(): void {
  registerIpcHandlers('browserCommands', {
    'initialize-browser-view': async () => {
      logger.info('Initializing BrowserView');
      return { success: true };
    },
    'load-url': async (_event, url: string) => {
      logger.info('Loading URL:', { url });
      const browserView = getBrowserView();
      if (!browserView) {
        return { success: false, error: 'BrowserView not available' };
      }
      loadURLInBrowserView(url);
      return { success: true };
    },
    'get-current-url': async () => {
      try {
        const browserView = getBrowserView();
        if (!browserView) return '';
        return browserView.webContents.getURL();
      } catch (error) {
        logger.error('Error getting current URL:', error);
        return '';
      }
    },
    navigate: async (_event, direction: 'back' | 'forward') => {
      logger.info('Navigating:', { direction });
      const browserView = getBrowserView();
      if (!browserView) {
        return { success: false, error: 'BrowserView not available' };
      }
      if (direction === 'back' && browserView.webContents.canGoBack()) {
        browserView.webContents.goBack();
      } else if (direction === 'forward' && browserView.webContents.canGoForward()) {
        browserView.webContents.goForward();
      } else {
        return { success: false, error: `Cannot navigate ${direction}` };
      }
      return { success: true };
    },
    'focus-browser-view': async () => {
      focusBrowserView();
      return { success: true };
    },
    'update-sidebar-visibility': async (_event, visible: boolean) => {
      logger.info('Updating sidebar visibility:', { visible });
      setSidebarVisible(visible);
      const browserView = getBrowserView();
      const mainWindow = getMainWindow();
      if (browserView && mainWindow) {
        updateBrowserViewBounds(browserView, mainWindow, visible);
      }
      return { success: true };
    },
    
    // BrowserView health and recovery
    'get-browser-view-health': async () => {
      const healthStatus = getBrowserViewHealthStatus();
      logger.debug('BrowserView health status:', healthStatus);
      return healthStatus;
    },
    
    'manual-browser-view-recovery': async () => {
      logger.info('Manual BrowserView recovery requested via IPC');
      try {
        await manualRecovery();
        return { success: true, message: 'BrowserView recovery completed' };
      } catch (error) {
        logger.error('Manual BrowserView recovery failed:', error);
        return { success: false, error: String(error) };
      }
    },
    'update-browser-view-bounds': async () => {
      const browserView = getBrowserView();
      const mainWindow = getMainWindow();
      if (!browserView || !mainWindow) {
        const msg = 'BrowserView or MainWindow not available';
        logger.error(msg);
        return { success: false, error: msg };
      }
      updateBrowserViewBounds(browserView, mainWindow, getSidebarVisible());
      return { success: true };
    },
    'test-ipc': async () => ({ success: true, message: 'IPC bridge is working!' }),
    
    // Python browser session management
    'restart-python-browser-session': async () => {
      logger.info('Restarting Python browser session...');
      try {
        // Send restart signal to Python process
        const result = await runPythonWorkflow({
          workflowData: JSON.stringify({
            action: 'restart_browser_session',
            metadata: { name: 'Browser Session Restart' }
          })
        });
        return { success: true, message: 'Python browser session restarted successfully' };
      } catch (error) {
        logger.error('Failed to restart Python browser session:', error);
        return { success: false, error: String(error) };
      }
    },
    
    'check-python-session-health': async () => {
      logger.info('Checking Python browser session health...');
      try {
        // Send health check signal to Python process
        const result = await runPythonWorkflow({
          workflowData: JSON.stringify({
            action: 'check_session_health',
            metadata: { name: 'Session Health Check' }
          })
        });
        return { success: true, health: result };
      } catch (error) {
        logger.error('Failed to check Python session health:', error);
        return { success: false, error: String(error) };
      }
    },
  });
}