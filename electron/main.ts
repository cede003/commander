import { app, BrowserWindow } from 'electron';
import { CONFIG } from './constants/config';
import { createMainWindow } from './windows/mainWindow';
import { createBrowserView, setMainWindow, updateBrowserViewBoundsFromWindow, updateBrowserViewBoundsFromClient } from './views/browserViewManager';
import { setupIpcHandlers } from './ipc/handlers';

let mainWindow: BrowserWindow | undefined;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  console.log('🚀 Electron app is ready');
  console.log('🔧 CONFIG:', CONFIG);
  console.log('🔧 CONFIG.mainWindow:', CONFIG.mainWindow);
  console.log('🔧 CONFIG.preloadPath:', CONFIG.preloadPath);
  
  // Enable remote debugging
  app.commandLine.appendSwitch('remote-debugging-port', CONFIG.remoteDebuggingPort.toString());
  app.commandLine.appendSwitch('remote-debugging-address', CONFIG.remoteDebuggingAddress);
  
  // Create the main window
  mainWindow = createMainWindow();
  
  // Set the main window reference for other modules
  setMainWindow(mainWindow);
  
  // Set up IPC handlers
  setupIpcHandlers();
  
  // Create and add BrowserView to the main window
  const browserView = createBrowserView();
  mainWindow.setBrowserView(browserView);
  
  // Set up window event listeners
  setupWindowEventListeners(mainWindow);
  
  console.log('✅ Main window and BrowserView created successfully');
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow();
    setMainWindow(mainWindow);
    
    const browserView = createBrowserView();
    mainWindow.setBrowserView(browserView);
    
    setupWindowEventListeners(mainWindow);
  }
});

function setupWindowEventListeners(window: BrowserWindow): void {
  let isFocusTriggeredResize = false;
  let lastClientBounds: any = null;
  let isResizing = false;
  let resizeTimeout: NodeJS.Timeout | null = null;
  
  // Handle window resize
  window.on('resize', () => {
    console.log('[DEBUG] Window resized, updating BrowserView bounds');
    
    // Set resizing flag to prevent client bounds updates
    isResizing = true;
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    resizeTimeout = setTimeout(() => {
      isResizing = false;
      console.log('[DEBUG] Resize complete, allowing client bounds updates');
    }, 100); // Wait 100ms after resize stops
    
    // Only update bounds if not triggered by focus
    if (!isFocusTriggeredResize) {
      // If we have client bounds, use them instead of fallback
      if (lastClientBounds) {
        console.log('[DEBUG] Using last known client bounds for resize');
        updateBrowserViewBoundsFromClient(lastClientBounds);
      } else {
        console.log('[DEBUG] No client bounds available, using fallback');
        updateBrowserViewBoundsFromWindow(window);
      }
    } else {
      console.log('[DEBUG] Skipping bounds update for focus-triggered resize');
      isFocusTriggeredResize = false;
    }
  });
  
  // Handle window move
  window.on('move', () => {
    console.log('[DEBUG] Window moved, updating BrowserView bounds');
    // Use client bounds if available, otherwise fallback
    if (lastClientBounds) {
      console.log('[DEBUG] Using last known client bounds for move');
      updateBrowserViewBoundsFromClient(lastClientBounds);
    } else {
      updateBrowserViewBoundsFromWindow(window);
    }
  });
  
  // Handle window focus - don't override client bounds
  window.on('focus', () => {
    console.log('[DEBUG] Window focused');
    // Mark that the next resize might be focus-triggered
    isFocusTriggeredResize = true;
    // Removed the bounds update to preserve client-provided bounds
  });
  
  // Handle window blur
  window.on('blur', () => {
    console.log('[DEBUG] Window blurred');
  });
  
  // Handle window close
  window.on('closed', () => {
    console.log('[DEBUG] Window closed');
    mainWindow = undefined;
  });
  
  // Expose function to update last client bounds
  (window as any).updateLastClientBounds = (bounds: any) => {
    // Only update client bounds if not currently resizing
    if (!isResizing) {
      lastClientBounds = bounds;
      console.log('[DEBUG] Updated last client bounds:', bounds);
    } else {
      console.log('[DEBUG] Skipping client bounds update during resize');
    }
  };
  
  // Expose resizing state for IPC handlers
  (window as any).isResizing = () => isResizing;
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here. 