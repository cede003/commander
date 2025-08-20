import { 
  getBrowserView, 
  loadURLInBrowserView, 
  focusBrowserView,
  setSidebarVisible,
  getSidebarVisible
} from '../../views/browserViewManager';
import { getMainWindow } from '../../windows/mainWindow';
import { updateBrowserViewBounds } from '../../utils/bounds';
import logger from '../../utils/logger';
import { registerIpcHandlers } from '../register';

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
      if (!browserView || !mainWindow) {
        const msg = 'BrowserView or MainWindow not available';
        logger.error(msg);
        return { success: false, error: msg };
      }
      updateBrowserViewBounds(browserView, mainWindow, visible);
      return { success: true };
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
  });
}