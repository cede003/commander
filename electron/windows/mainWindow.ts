import { BrowserWindow, app } from 'electron';
import { CONFIG } from '../constants/config';
import { focusBrowserView } from '../views/browserViewManager';
import logger from '../utils/logger';
import path from 'path';

let mainWindowInstance: BrowserWindow | undefined;

export function createMainWindow(): BrowserWindow {
  logger.debug('Creating main window with preload path:', CONFIG.preloadPath);
  logger.debug('__dirname:', __dirname);
  logger.debug('File exists:', require('fs').existsSync(CONFIG.preloadPath));
  
  const mainWindow = new BrowserWindow(CONFIG.mainWindow);

  // Store the instance
  mainWindowInstance = mainWindow;

  // Load the app
  if (CONFIG.isDev) {
    logger.debug('Loading app in development mode:', CONFIG.isDev);
    logger.debug('NODE_ENV:', process.env.NODE_ENV);
    logger.debug('app.isPackaged:', app.isPackaged);
    logger.debug('Loading URL:', CONFIG.devServerUrl);
    mainWindow.loadURL(CONFIG.devServerUrl);
  } else {
    logger.debug('Loading app in production mode');
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Focus the browser view after a short delay to ensure it's ready
    setTimeout(() => {
      focusBrowserView();
    }, 100);
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindowInstance = undefined;
  });

  // Handle window focus
  mainWindow.on('focus', () => {
    logger.debug('Window focused, refreshing BrowserView bounds');
    // Focus the browser view when window gains focus
    focusBrowserView();
    // This will be handled by the browser view manager
  });

  return mainWindow;
}

export function getMainWindow(): BrowserWindow | undefined {
  return mainWindowInstance;
} 