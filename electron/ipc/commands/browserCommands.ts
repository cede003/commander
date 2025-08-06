import { ipcMain, BrowserWindow } from 'electron';
import { 
  getBrowserView, 
  loadURLInBrowserView, 
  focusBrowserView,
  updateBrowserViewBoundsFromClient,
  setSidebarVisible
} from '../../views/browserViewManager';
import { Bounds } from '../../utils/bounds';
import { getMainWindow } from '../../windows/mainWindow';

export function registerBrowserCommands(): void {
  // Initialize BrowserView
  ipcMain.handle('initialize-browser-view', async (event) => {
    console.log(`[IPC] Initializing BrowserView`);
    // The BrowserView is already created in main.ts, so we just need to return success
    return { success: true };
  });

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
      return url; // Return just the URL string, not an object
    }
    return ''; // Return empty string if no BrowserView
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
    
    // Check if we're currently resizing
    const mainWindow = getMainWindow();
    if (mainWindow && (mainWindow as any).isResizing && typeof (mainWindow as any).isResizing === 'function') {
      const isResizing = (mainWindow as any).isResizing();
      if (isResizing) {
        console.log(`[IPC] Skipping bounds update during resize`);
        return { success: true, skipped: true };
      }
    }
    
    updateBrowserViewBoundsFromClient(bounds);
    
    // Store the last client bounds for window resize/move events
    if (mainWindow && (mainWindow as any).updateLastClientBounds) {
      (mainWindow as any).updateLastClientBounds(bounds);
    }
    
    return { success: true };
  });

  // Update sidebar visibility
  ipcMain.handle('update-sidebar-visibility', async (event, visible: boolean) => {
    console.log(`[IPC] Updating sidebar visibility: ${visible}`);
    setSidebarVisible(visible);
    return { success: true };
  });

  // Test IPC bridge
  ipcMain.handle('test-ipc', async (event) => {
    console.log(`[IPC] Test IPC call received`);
    return 'IPC bridge is working!';
  });
} 