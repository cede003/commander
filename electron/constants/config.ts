import { app } from 'electron';
import path from 'path';

export const CONFIG = {
  // Development flags
  isDev: process.env.NODE_ENV === 'development' || !app.isPackaged,
  
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
  
  // Window settings
  mainWindow: {
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    titleBarStyle: 'default' as const,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      allowRunningInsecureContent: true,
      sandbox: false,
      experimentalFeatures: true,
    },
  },
  
  modalWindow: {
    width: 900,
    height: 800,
    resizable: false,
    minimizable: false,
    maximizable: false,
    show: false,
    titleBarStyle: 'default' as const,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      allowRunningInsecureContent: true,
      sandbox: false,
      experimentalFeatures: true,
    },
  },
  
  // Timeouts
  workflowTimeout: 60000, // 60 seconds
  connectionRetries: 3,
  retryDelay: 2000, // 2 seconds
}; 