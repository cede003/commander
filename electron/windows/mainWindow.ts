import { BrowserWindow, app } from 'electron';
import { CONFIG } from '../constants/config';
import path from 'path';

let mainWindowInstance: BrowserWindow | undefined;

export function createMainWindow(): BrowserWindow {
  console.log('🔧 Creating main window with preload path:', CONFIG.preloadPath);
  console.log('🔧 __dirname:', __dirname);
  console.log('🔧 File exists:', require('fs').existsSync(CONFIG.preloadPath));
  
  const mainWindow = new BrowserWindow(CONFIG.mainWindow);

  // Store the instance
  mainWindowInstance = mainWindow;

  // Load the app
  if (CONFIG.isDev) {
    console.log('Loading app in development mode:', CONFIG.isDev);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('app.isPackaged:', app.isPackaged);
    console.log('Loading URL:', CONFIG.devServerUrl);
    mainWindow.loadURL(CONFIG.devServerUrl);
  } else {
    console.log('Loading app in production mode');
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindowInstance = undefined;
  });

  // Handle window focus
  mainWindow.on('focus', () => {
    console.log('[DEBUG] Window focused, refreshing BrowserView bounds');
    // This will be handled by the browser view manager
  });

  return mainWindow;
}

export function getMainWindow(): BrowserWindow | undefined {
  return mainWindowInstance;
} 