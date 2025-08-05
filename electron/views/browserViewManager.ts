import { BrowserView, BrowserWindow, ipcMain } from 'electron';
import { CONFIG } from '../constants/config';
import { calculateBrowserViewBounds, updateBrowserViewBounds, getBoundsFromClient, Bounds } from '../utils/bounds';
import { setupBrowserViewContextMenu } from '../utils/contextMenu';

let browserView: BrowserView | undefined;
let sidebarVisible = true;
let devToolsOpen = false;

export function createBrowserView(url: string = CONFIG.defaultUrl): BrowserView {
  console.log(`[DEBUG] Creating new BrowserView with URL: ${url}`);
  
  // Create new BrowserView
  browserView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      sandbox: false,
      experimentalFeatures: true,
    }
  });

  // Set up event listeners
  setupBrowserViewEvents(browserView);
  
  // Load the URL
  browserView.webContents.loadURL(url);
  
  // Set up context menu
  setupBrowserViewContextMenu(browserView);
  
  console.log(`[DEBUG] BrowserView created and added to main window`);
  
  return browserView;
}

export function getBrowserView(): BrowserView | undefined {
  return browserView;
}

export function updateBrowserViewBoundsFromClient(bounds: Bounds): void {
  if (!browserView) return;
  
  const adjustedBounds = getBoundsFromClient(bounds);
  console.log(`[DEBUG] Using dynamic bounds from React:`, adjustedBounds);
  updateBrowserViewBounds(browserView, adjustedBounds);
}

export function updateBrowserViewBoundsFromWindow(mainWindow: BrowserWindow): void {
  if (!browserView) return;
  
  const bounds = calculateBrowserViewBounds(mainWindow, sidebarVisible, devToolsOpen);
  console.log(`[DEBUG] Setting BrowserView bounds (fallback):`, bounds, `DevTools open: ${devToolsOpen}, Sidebar visible: ${sidebarVisible}`);
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
    console.log(`[IPC] Initializing BrowserView with default URL`);
    createBrowserView(url);
    return;
  }

  console.log(`[IPC] Loading URL in BrowserView: ${url}`);
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
    console.log(`[DEBUG] BrowserView started loading: ${browserView.webContents.getURL()}`);
    mainWindow?.webContents.send('browser-view-loading-state-changed', { isLoading: true });
  });

  browserView.webContents.on('did-stop-loading', () => {
    console.log(`[DEBUG] BrowserView finished loading: ${browserView.webContents.getURL()}`);
    mainWindow?.webContents.send('browser-view-loading-state-changed', { isLoading: false });
    mainWindow?.webContents.send('browser-view-loaded', {});
  });

  browserView.webContents.on('did-navigate', (event, navigationUrl) => {
    console.log(`[DEBUG] BrowserView navigated to: ${navigationUrl}`);
    mainWindow?.webContents.send('browser-view-navigated', { url: navigationUrl });
  });

  browserView.webContents.on('page-title-updated', (event, title) => {
    console.log(`[DEBUG] BrowserView title changed: ${title}`);
    mainWindow?.webContents.send('browser-view-title-changed', { title });
  });

  browserView.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[DEBUG] BrowserView failed to load: ${validatedURL}, Error: ${errorDescription} (${errorCode})`);
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