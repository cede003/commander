import { BrowserView, BrowserWindow, ipcMain } from 'electron';
import { CONFIG } from '../constants/config';
import { calculateBrowserViewBounds, updateBrowserViewBounds, getBoundsFromClient, Bounds } from '../utils/bounds';
import { setupBrowserViewContextMenu } from '../utils/contextMenu';
import logger from '../utils/logger';
import path from 'path';

let browserView: BrowserView | undefined;
let sidebarVisible = true;
let devToolsOpen = false;

export function createBrowserView(url: string = CONFIG.defaultUrl): BrowserView {
  logger.debug('Creating new BrowserView with URL:', { url });
  
  // Create new BrowserView with preload script
  browserView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      sandbox: false,
      experimentalFeatures: true,
      preload: path.join(__dirname, '../../dist/browserViewPreload.js') // Fixed path to dist root
    }
  });

  // Set up event listeners
  setupBrowserViewEvents(browserView);
  
  // Load the URL
  browserView.webContents.loadURL(url);
  
  // Set up context menu
  setupBrowserViewContextMenu(browserView);
  
  logger.debug('BrowserView created and added to main window');
  logger.debug('BrowserView webContents.id:', { id: browserView.webContents.id });
  logger.debug('BrowserView bounds:', { bounds: browserView.getBounds() });
  
  return browserView;
}

export function getBrowserView(): BrowserView | undefined {
  return browserView;
}

export function getBrowserViewId(): number | undefined {
  return browserView?.webContents.id;
}

export function updateBrowserViewBoundsFromClient(bounds: Bounds): void {
  if (!browserView) return;
  
  const adjustedBounds = getBoundsFromClient(bounds);
  logger.debug('Using dynamic bounds from React:', adjustedBounds);
  updateBrowserViewBounds(browserView, adjustedBounds);
}

export function updateBrowserViewBoundsFromWindow(mainWindow: BrowserWindow): void {
  if (!browserView) return;
  
  const bounds = calculateBrowserViewBounds(mainWindow, sidebarVisible, devToolsOpen);
  logger.debug('Setting BrowserView bounds (fallback):', { 
    bounds, 
    devToolsOpen, 
    sidebarVisible 
  });
  updateBrowserViewBounds(browserView, bounds);
}

export function setSidebarVisible(visible: boolean): void {
  sidebarVisible = visible;
}

export function setDevToolsOpen(open: boolean): void {
  devToolsOpen = open;
}

export function loadURLInBrowserView(url: string): void {
  if (!browserView) {
    logger.info('Initializing BrowserView with default URL');
    createBrowserView(url);
    return;
  }

  logger.info('Loading URL in BrowserView:', { url });
  browserView.webContents.loadURL(url);
}

export function focusBrowserView(): void {
  if (browserView) {
    browserView.webContents.focus();
  }
}

function setupBrowserViewEvents(browserView: BrowserView): void {
  // BrowserView loading events
  browserView.webContents.on('did-start-loading', () => {
    logger.debug('BrowserView started loading:', { url: browserView.webContents.getURL() });
    mainWindow?.webContents.send('browser-view-loading-state-changed', { isLoading: true });
  });

  browserView.webContents.on('did-stop-loading', () => {
    logger.debug('BrowserView finished loading:', { url: browserView.webContents.getURL() });
    mainWindow?.webContents.send('browser-view-loading-state-changed', { isLoading: false });
    mainWindow?.webContents.send('browser-view-loaded', {});
  });

  browserView.webContents.on('did-navigate', (event, navigationUrl) => {
    logger.debug('BrowserView navigated to:', { url: navigationUrl });
    mainWindow?.webContents.send('browser-view-navigated', { url: navigationUrl });
  });

  browserView.webContents.on('page-title-updated', (event, title) => {
    logger.debug('BrowserView title changed:', { title });
    mainWindow?.webContents.send('browser-view-title-changed', { title });
  });

  browserView.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    logger.error('BrowserView failed to load:', { 
      url: validatedURL, 
      errorCode, 
      errorDescription 
    });
    mainWindow?.webContents.send('browser-view-load-failed', { 
      error: { 
        errorCode, 
        errorDescription, 
        validatedURL 
      } 
    });
  });
}

// Reference to main window (will be set by main.ts)
let mainWindow: BrowserWindow | undefined;

export function setMainWindow(window: BrowserWindow): void {
  mainWindow = window;
} 