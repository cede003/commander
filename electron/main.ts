import { app, BrowserWindow, session } from 'electron';
import { CONFIG } from './constants/config';
import { createMainWindow } from './windows/mainWindow';
import { createBrowserView, setMainWindow, getSidebarVisible } from './views/browserViewManager';
import { setupIpcHandlers } from './ipc/handlers';
import { initializePythonProcess, cleanupPythonProcess } from './utils/pythonRunner';
import { setupBrowserViewAutoResize, calculateBrowserViewBounds, updateBrowserViewBounds } from './utils/bounds';
import logger, { applyLogLevelFromArgv } from './utils/logger';

// Layout constants
const LAYOUT = {
  SIDEBAR_WIDTH: 320,
  URL_BAR_HEIGHT: 80
} as const;

let mainWindow: BrowserWindow | undefined;

// Readiness tracking
let electronReady = false;
let pythonReady = false;
let appReadyLogged = false;

function maybeLogAppReady(): void {
  if (electronReady && pythonReady && !appReadyLogged) {
    appReadyLogged = true;
    logger.info('🚀 App is ready');
  }
}

function initializePythonWhenRendererReady(window: BrowserWindow): void {
  const startPython = () => {
    initializePythonProcess()
      .then(() => {
        pythonReady = true;
        logger.info('Python is ready');
        maybeLogAppReady();
      })
      .catch((error) => {
        logger.error('Failed to initialize Python process:', error);
      });
  };

  if (window.webContents.isLoading()) {
    window.webContents.once('did-finish-load', startPython);
    // Fallback: if load fails, still initialize so workflows can run
    window.webContents.once('did-fail-load', () => {
      logger.warn('Renderer failed to load; initializing Python process anyway');
      startPython();
    });
  } else {
    // If already loaded (e.g., on reload), start immediately
    startPython();
  }
}

// Ensure single instance to avoid duplicate initialization/logs during dev restarts
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

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

// Use whenReady() instead of 'ready' event
app.whenReady().then(() => {
  electronReady = true;
  logger.info('Electron is ready');
  maybeLogAppReady();
  // Apply log level flags from argv and propagate to env
  applyLogLevelFromArgv(process.argv.slice(1));

  // Ensure no cached renderer assets between rebuilds
  session.defaultSession.clearCache().catch(() => {});
  logger.debug('CONFIG:', CONFIG);
  logger.debug('CONFIG.mainWindow:', CONFIG.mainWindow);
  logger.debug('CONFIG.preloadPath:', CONFIG.preloadPath);
  
  // Enable remote debugging
  app.commandLine.appendSwitch('remote-debugging-port', CONFIG.remoteDebuggingPort.toString());
  app.commandLine.appendSwitch('remote-debugging-address', CONFIG.remoteDebuggingAddress);
  
  // Set up IPC handlers FIRST - before creating any windows
  setupIpcHandlers();
  
  // Create the main window with browser view
  mainWindow = createWindowWithBrowserView();
  
  // Initialize Python process when the renderer has finished loading
  if (mainWindow) {
    initializePythonWhenRendererReady(mainWindow);
  }
  
  logger.info('Main window and BrowserView created successfully');
}).catch((err) => {
  logger.error('Error during app.whenReady initialization:', err);
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