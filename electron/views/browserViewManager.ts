import { BrowserView, BrowserWindow } from 'electron';
import { CONFIG } from '../constants/config';
import { setupBrowserViewContextMenu } from '../utils/contextMenu';
import { updateBrowserViewBounds } from '../utils/bounds';
import logger from '../utils/logger';
import path from 'path';
import { getMainWindow } from '../windows/mainWindow';

let browserView: BrowserView | undefined;
let sidebarVisible = CONFIG.sidebar_default_state;
let mainWindow: BrowserWindow | undefined;
let healthCheckInterval: NodeJS.Timeout | undefined;
let isRecovering = false;

// Health check configuration
const HEALTH_CHECK_INTERVAL = 10000; // 10 seconds
const MAX_FAILED_HEALTH_CHECKS = 3;
let failedHealthChecks = 0;

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
    // Stop health monitoring
    stopHealthMonitoring();
    
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

/**
 * Check if BrowserView is healthy and responsive
 */
function isBrowserViewHealthy(): boolean {
  if (!browserView) return false;
  
  try {
    // Check if the webContents is still valid
    if (!browserView.webContents) return false;
    
    // Check if the process is still running
    if (browserView.webContents.isDestroyed()) return false;
    
    // Check if the page is accessible
    const url = browserView.webContents.getURL();
    if (!url || url === 'about:blank') return false;
    
    return true;
  } catch (error) {
    logger.error('BrowserView health check failed:', error);
    return false;
  }
}

/**
 * Perform health check and recover if needed
 */
async function performHealthCheck(): Promise<void> {
  if (isRecovering) {
    logger.debug('Recovery already in progress, skipping health check');
    return;
  }
  
  const isHealthy = isBrowserViewHealthy();
  
  if (!isHealthy) {
    failedHealthChecks++;
    logger.warn(`BrowserView health check failed (${failedHealthChecks}/${MAX_FAILED_HEALTH_CHECKS})`);
    
    if (failedHealthChecks >= MAX_FAILED_HEALTH_CHECKS) {
      logger.error('BrowserView is unhealthy, initiating recovery...');
      await recoverBrowserView();
    }
  } else {
    // Reset failed health checks on success
    if (failedHealthChecks > 0) {
      logger.info('BrowserView recovered, resetting health check counter');
      failedHealthChecks = 0;
    }
  }
}

/**
 * Recover BrowserView by recreating it
 */
async function recoverBrowserView(): Promise<void> {
  if (isRecovering) {
    logger.warn('BrowserView recovery already in progress, skipping');
    return;
  }

  isRecovering = true;
  failedHealthChecks = 0;

  try {
    logger.info('Recovering BrowserView...');
    
    // Get current URL before cleanup
    const currentUrl = browserView?.webContents.getURL() || CONFIG.defaultUrl;
    
    // Clean up existing BrowserView
    cleanupBrowserView();
    
    // Create new BrowserView
    const newBrowserView = createBrowserView(currentUrl);
    
    // Wait for the new BrowserView to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('BrowserView recovery timeout'));
      }, 10000);

      const checkReady = () => {
        if (newBrowserView.webContents.isLoading()) {
          setTimeout(checkReady, 100);
        } else {
          clearTimeout(timeout);
          resolve();
        }
      };
      checkReady();
    });

    // Update main window with new BrowserView
    const mainWindow = getMainWindow();
    if (mainWindow && newBrowserView) {
      mainWindow.setBrowserView(newBrowserView);
      updateBrowserViewBounds(newBrowserView, mainWindow, getSidebarVisible());
    }

    // After successful BrowserView recovery, restart Python browser session
    try {
      logger.info('Coordinating with Python browser session...');
      // Import here to avoid circular dependencies
      const { runPythonWorkflow } = require('../utils/pythonRunner');
      
      const result = await runPythonWorkflow({
        workflowData: JSON.stringify({
          action: 'restart_browser_session',
          metadata: { name: 'Coordinated Browser Recovery' }
        })
      });
      
      if (result.success) {
        logger.info('Python browser session restarted successfully');
      } else {
        logger.warn('Python browser session restart failed, but BrowserView recovery succeeded');
      }
    } catch (error) {
              logger.warn('Failed to restart Python browser session during coordinated recovery:', error);
      // Don't fail the entire recovery if Python restart fails
    }

    logger.info('BrowserView recovery completed successfully');
  } catch (error) {
    logger.error('BrowserView recovery failed:', error);
    throw error;
  } finally {
    isRecovering = false;
  }
}

/**
 * Start health monitoring
 */
function startHealthMonitoring(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  
  healthCheckInterval = setInterval(performHealthCheck, HEALTH_CHECK_INTERVAL);
      logger.info('BrowserView health monitoring started');
}

/**
 * Stop health monitoring
 */
function stopHealthMonitoring(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = undefined;
    logger.info('BrowserView health monitoring stopped');
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
      preload: path.join(__dirname, '../../dist/views/browserViewPreload.js')
    }
  });
  if (CONFIG.openDevToolsOnStart) {
    browserView.webContents.openDevTools({ mode: 'undocked' });
  }
  setupBrowserViewEvents(browserView);
  browserView.webContents.loadURL(url);
  setupBrowserViewContextMenu(browserView);
  
  // Start health monitoring for the new BrowserView
  startHealthMonitoring();
  
  logger.debug('BrowserView created');
  return browserView;
}

/**
 * Manually trigger BrowserView recovery (can be called from UI)
 */
export async function manualRecovery(): Promise<void> {
  logger.info('Manual BrowserView recovery requested');
  await recoverBrowserView();
}

/**
 * Get BrowserView health status
 */
export function getBrowserViewHealthStatus(): { isHealthy: boolean; failedChecks: number; isRecovering: boolean } {
  return {
    isHealthy: isBrowserViewHealthy(),
    failedChecks: failedHealthChecks,
    isRecovering
  };
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