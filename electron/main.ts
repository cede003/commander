import { app, BrowserWindow } from 'electron';
import { CONFIG } from './constants/config';
import { createMainWindow } from './windows/mainWindow';
import { createBrowserView, setMainWindow, getSidebarVisible } from './views/browserViewManager';
import { setupIpcHandlers } from './ipc/handlers';
import { initializePythonProcess, cleanupPythonProcess } from './utils/pythonRunner';
import { setupBrowserViewAutoResize, calculateBrowserViewBounds, updateBrowserViewBounds } from './utils/bounds';
import logger from './utils/logger';

// Layout constants
const LAYOUT = {
  SIDEBAR_WIDTH: 320,
  URL_BAR_HEIGHT: 80
} as const;

let mainWindow: BrowserWindow | undefined;

function createWindowWithBrowserView(): BrowserWindow {
  // Create the main window
  const window = createMainWindow();
  
  // Set the main window reference for other modules
  setMainWindow(window);
  
  // Create and add BrowserView to the main window
  const browserView = createBrowserView();
  window.setBrowserView(browserView);
  
  // Set initial bounds using the consistent calculation function
  const initialBounds = calculateBrowserViewBounds(window, CONFIG.sidebar_default_state);
  browserView.setBounds(initialBounds);
  
  // Debug: Log the actual bounds that were set
  logger.debug('BrowserView initial bounds set:', initialBounds);
  
  // Enable auto-resize for the browser view
  setupBrowserViewAutoResize(browserView, window);
  
  // Keep BrowserView bounds in sync with window size and sidebar visibility
  window.on('resize', () => {
    if (browserView) {
      updateBrowserViewBounds(browserView, window, getSidebarVisible());
    }
  });
  
  logger.debug('BrowserView created with initial bounds');
  
  return window;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  logger.info('🚀 Electron app is ready');
  logger.debug('🔧 CONFIG:', CONFIG);
  logger.debug('🔧 CONFIG.mainWindow:', CONFIG.mainWindow);
  logger.debug('🔧 CONFIG.preloadPath:', CONFIG.preloadPath);
  
  // Enable remote debugging
  app.commandLine.appendSwitch('remote-debugging-port', CONFIG.remoteDebuggingPort.toString());
  app.commandLine.appendSwitch('remote-debugging-address', CONFIG.remoteDebuggingAddress);
  
  // Set up IPC handlers FIRST - before creating any windows
  setupIpcHandlers();
  
  // Create the main window with browser view
  mainWindow = createWindowWithBrowserView();
  
  // Initialize Python process after a short delay
  setTimeout(() => {
    initializePythonProcess().then(() => {
      logger.info('Python process initialized successfully');
    }).catch((error) => {
      logger.error('Failed to initialize Python process:', error);
    });
  }, 2000); // Wait 2 seconds for app to be fully ready
  
  logger.info('✅ Main window and BrowserView created successfully');
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup on app quit
app.on('before-quit', () => {
  logger.info('App quitting, cleaning up Python process');
  cleanupPythonProcess();
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createWindowWithBrowserView();
  }
});