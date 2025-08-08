import { ipcMain } from 'electron';
import { 
  getBrowserView, 
  loadURLInBrowserView, 
  focusBrowserView,
  setSidebarVisible,
  getSidebarVisible
} from '../../views/browserViewManager';
import { getMainWindow } from '../../windows/mainWindow';
import { calculateBrowserViewBounds, updateBrowserViewBounds } from '../../utils/bounds';
import logger from '../../utils/logger';

export function registerBrowserCommands(): void {
  // Initialize BrowserView
  ipcMain.handle('initialize-browser-view', async () => {
    logger.info('Initializing BrowserView');
    return { success: true };
  });

  // Load URL in BrowserView
  ipcMain.handle('load-url', async (event, url: string) => {
    logger.info('Loading URL:', { url });
    
    try {
      const browserView = getBrowserView();
      if (!browserView) {
        return { success: false, error: 'BrowserView not available' };
      }
      
      loadURLInBrowserView(url);
      return { success: true };
    } catch (error) {
      logger.error('Error loading URL:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Get current URL from BrowserView
  ipcMain.handle('get-current-url', async () => {
    try {
      const browserView = getBrowserView();
      if (!browserView) {
        return '';
      }
      
      return browserView.webContents.getURL();
    } catch (error) {
      logger.error('Error getting current URL:', error);
      return '';
    }
  });

  // Navigate BrowserView
  ipcMain.handle('navigate', async (event, direction: 'back' | 'forward') => {
    logger.info('Navigating:', { direction });
    
    try {
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
    } catch (error) {
      logger.error('Error during navigation:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Focus BrowserView
  ipcMain.handle('focus-browser-view', async () => {
    focusBrowserView();
    return { success: true };
  });

  // Update sidebar visibility
  ipcMain.handle('update-sidebar-visibility', async (event, visible: boolean) => {
    logger.info('Updating sidebar visibility:', { visible });
    
    // Update the sidebar state
    setSidebarVisible(visible);
    
    // Get the BrowserView and MainWindow
    const browserView = getBrowserView();
    const mainWindow = getMainWindow();
    
    if (!browserView || !mainWindow) {
      const msg = 'BrowserView or MainWindow not available';
      logger.error(msg);
      return { success: false, error: msg };
    }
    
    // Update BrowserView bounds using the dedicated function
    updateBrowserViewBounds(browserView, mainWindow, visible);
    
    return { success: true };
  });

  // Update BrowserView bounds and enable auto-resize
  ipcMain.handle('update-browser-view-bounds', async () => {
    const browserView = getBrowserView();
    const mainWindow = getMainWindow();
  
    if (!browserView || !mainWindow) {
      const msg = 'BrowserView or MainWindow not available';
      logger.error(msg);
      return { success: false, error: msg };
    }
  
    // Update bounds using the dedicated function
    updateBrowserViewBounds(browserView, mainWindow, getSidebarVisible());
    
  
    logger.info('BrowserView bounds updated');
    return { success: true };
  });

  // Test IPC bridge
  ipcMain.handle('test-ipc', async () => {
    return { success: true, message: 'IPC bridge is working!' };
  });
}