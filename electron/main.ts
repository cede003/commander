import { app, BrowserWindow } from 'electron';
import { CONFIG } from './constants/config';
import { createMainWindow } from './windows/mainWindow';
import { createBrowserView, setMainWindow, updateBrowserViewBoundsFromWindow } from './views/browserViewManager';
import { setupIpcHandlers } from './ipc/handlers';

let mainWindow: BrowserWindow | undefined;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  console.log('🚀 Electron app is ready');
  
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
  // Handle window resize
  window.on('resize', () => {
    console.log('[DEBUG] Window resized, updating BrowserView bounds');
    updateBrowserViewBoundsFromWindow(window);
  });
  
  // Handle window move
  window.on('move', () => {
    console.log('[DEBUG] Window moved, updating BrowserView bounds');
    updateBrowserViewBoundsFromWindow(window);
  });
  
  // Handle window focus
  window.on('focus', () => {
    console.log('[DEBUG] Window focused, refreshing BrowserView bounds');
    updateBrowserViewBoundsFromWindow(window);
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
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here. 