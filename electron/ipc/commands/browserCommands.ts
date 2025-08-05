import { ipcMain, BrowserWindow } from 'electron';
import { 
  getBrowserView, 
  loadURLInBrowserView, 
  focusBrowserView,
  updateBrowserViewBoundsFromClient,
  setSidebarVisible
} from '../../views/browserViewManager';
import { Bounds } from '../../utils/bounds';

export function registerBrowserCommands(): void {
  // Load URL in BrowserView
  ipcMain.handle('load-url', async (event, url: string) => {
    console.log(`[IPC] Loading URL: ${url}`);
    loadURLInBrowserView(url);
    return { success: true };
  });

  // Load URL in BrowserView (alternative method)
  ipcMain.handle('load-url-in-browser-view', async (event, url: string) => {
    console.log(`[IPC] Loading URL in BrowserView: ${url}`);
    loadURLInBrowserView(url);
    return { success: true };
  });

  // Get current URL from BrowserView
  ipcMain.handle('get-current-url', async (event) => {
    console.log(`[IPC] Getting current URL`);
    const browserView = getBrowserView();
    if (browserView) {
      const url = browserView.webContents.getURL();
      console.log(`[IPC] Current URL from BrowserView: ${url}`);
      return { url };
    }
    return { url: '' };
  });

  // Navigate BrowserView
  ipcMain.handle('navigate', async (event, direction: 'back' | 'forward') => {
    console.log(`[IPC] Navigating ${direction}`);
    const browserView = getBrowserView();
    if (browserView) {
      if (direction === 'back' && browserView.webContents.canGoBack()) {
        browserView.webContents.goBack();
      } else if (direction === 'forward' && browserView.webContents.canGoForward()) {
        browserView.webContents.goForward();
      }
    }
    return { success: true };
  });

  // Focus BrowserView
  ipcMain.handle('focus-browser-view', async (event) => {
    console.log(`[IPC] Focusing BrowserView`);
    focusBrowserView();
    return { success: true };
  });

  // Update BrowserView bounds from client
  ipcMain.handle('update-browser-view-bounds-from-client', async (event, bounds: Bounds) => {
    console.log(`[IPC] Updating BrowserView bounds from client:`, bounds);
    updateBrowserViewBoundsFromClient(bounds);
    return { success: true };
  });

  // Update sidebar visibility
  ipcMain.handle('update-sidebar-visibility', async (event, visible: boolean) => {
    console.log(`[IPC] Updating sidebar visibility: ${visible}`);
    setSidebarVisible(visible);
    return { success: true };
  });
} 