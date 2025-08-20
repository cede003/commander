import { app } from 'electron';
import path from 'path';

export const CONFIG = {
  // Development flags
  isDev: process.env.NODE_ENV === 'development' || !app.isPackaged,
  openDevToolsOnStart: false,
  
  // Debug preload path
  preloadPath: path.join(__dirname, '..', 'preload.js'),
  
  // Paths
  userDataPath: path.join(__dirname, '../userData'),
  enginePath: path.join(__dirname, '../engine'),
  
  // URLs
  devServerUrl: 'http://localhost:5174',
  modalUrl: 'http://localhost:5174/#/modal',
  
  // BrowserView settings
  defaultUrl: 'https://www.google.com',
  remoteDebuggingPort: 9222,
  remoteDebuggingAddress: '127.0.0.1',
  
  // UI settings
  sidebar_default_state: true,
  sidebar_width: 320,
  url_bar_height: 80,
  
  // Window settings
  mainWindow: {
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: true, // Keep frame for main window
    titleBarStyle: 'default' as const,
    transparent: false,
    backgroundThrottling: false, // Prevent background throttling for smooth resizing
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'preload.js'),
      webSecurity: false,
      allowRunningInsecureContent: true,
      sandbox: false,
      experimentalFeatures: true,
      enableRemoteModule: false,
      offscreen: false, // Ensure hardware acceleration
    },
  },
  
  modalWindow: {
    width: 900,
    height: 800,
    resizable: false,
    minimizable: false,
    maximizable: false,
    show: false,
    frame: false, // Frameless for reduced flicker/delay
    titleBarStyle: 'customButtonsOnHover' as const,
    transparent: true, // Enable transparency for better visual effects
    backgroundThrottling: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'preload.js'),
      webSecurity: false,
      allowRunningInsecureContent: true,
      sandbox: false,
      experimentalFeatures: true,
      enableRemoteModule: false,
      offscreen: false,
    },
  },
  
  // Timeouts
  workflowTimeout: 60000, // 60 seconds
  connectionRetries: 3,
  retryDelay: 2000, // 2 seconds
}; 