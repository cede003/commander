import { BrowserView, BrowserWindow } from 'electron';
import { CONFIG } from '../constants/config';
import { setupBrowserViewContextMenu } from '../utils/contextMenu';
import logger from '../utils/logger';
import path from 'path';

let browserView: BrowserView | undefined;
let sidebarVisible = CONFIG.sidebar_default_state;
let mainWindow: BrowserWindow | undefined;

function tagPageAsMainApp(): void {
  if (browserView) {
    browserView.webContents.executeJavaScript(`
      window._isMainAppPage = true;
      window._appTaggedAt = new Date().toISOString();
    `).catch((error) => {
      logger.error('Failed to tag page as main app page:', error);
    });
  }
}

function cleanupBrowserView(): void {
  if (browserView) {
    // Remove all event listeners from the webContents
    browserView.webContents.removeAllListeners('did-start-loading');
    browserView.webContents.removeAllListeners('did-stop-loading');
    browserView.webContents.removeAllListeners('did-navigate');
    browserView.webContents.removeAllListeners('page-title-updated');
    browserView.webContents.removeAllListeners('did-fail-load');
    
    // Clear the reference
    browserView = undefined;
  }
}

export function createBrowserView(url: string = CONFIG.defaultUrl): BrowserView {
  logger.debug('Creating new BrowserView with URL:', { url });
  
  // Clean up existing BrowserView if it exists
  cleanupBrowserView();
  
  browserView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      sandbox: false,
      experimentalFeatures: true,
      preload: path.join(__dirname, '../../dist/browserViewPreload.js')
    }
  });
  browserView.webContents.openDevTools({ mode: 'undocked', activate: true });
  setupBrowserViewEvents(browserView);
  browserView.webContents.loadURL(url);
  setupBrowserViewContextMenu(browserView);
  
  logger.debug('BrowserView created');
  return browserView;
}

export function getBrowserView(): BrowserView | undefined {
  return browserView;
}

export function getBrowserViewId(): number | undefined {
  return browserView?.webContents.id;
}

export function setSidebarVisible(visible: boolean): void {
  sidebarVisible = visible;
}

export function getSidebarVisible(): boolean {
  return sidebarVisible;
}

export function loadURLInBrowserView(url: string): void {
  if (!browserView) {
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
  // Loading events
  browserView.webContents.on('did-start-loading', () => {
    mainWindow?.webContents.send('browser-view-loading-state-changed', { isLoading: true });
  });

  browserView.webContents.on('did-stop-loading', () => {
    mainWindow?.webContents.send('browser-view-loading-state-changed', { isLoading: false });
    mainWindow?.webContents.send('browser-view-loaded', {});
    tagPageAsMainApp();
  });

  browserView.webContents.on('did-navigate', (event, navigationUrl) => {
    mainWindow?.webContents.send('browser-view-navigated', { url: navigationUrl });
    
    // Re-tag the page after navigation
    setTimeout(() => {
      tagPageAsMainApp();
    }, 100);
  });

  browserView.webContents.on('page-title-updated', (event, title) => {
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

export function setMainWindow(window: BrowserWindow): void {
  mainWindow = window;
}