import { BrowserView, BrowserWindow } from 'electron';
import logger from './logger';
import { CONFIG } from '../constants/config';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function calculateBrowserViewBounds(
  mainWindow: BrowserWindow,
  sidebarVisible: boolean = true,
  devToolsOpen: boolean = false
): Bounds {
  const { width, height } = mainWindow.getContentBounds();
  
  // Calculate sidebar width (320px when visible, 0 when hidden)
  const sidebarWidth = sidebarVisible ? CONFIG.sidebar_width : 0;
  
  // Calculate available width for BrowserView
  const availableWidth = width - sidebarWidth;
  
  // Calculate y offset (account for title bar and any other UI elements)
  const yOffset = CONFIG.url_bar_height;
  
  
  // Use relative coordinates (0,0) for BrowserView within the window
  // BrowserView bounds are relative to the parent window, not screen coordinates
  return {
    x: sidebarWidth,  // Remove absolute window position
    y: yOffset,       // Remove absolute window position
    width: Math.max(0, availableWidth),  // Ensure positive width
    height: Math.max(0, height - yOffset ), // Account for DevTools space
  };
}

// Update BrowserView bounds when sidebar visibility changes
export function updateBrowserViewBounds(
  browserView: BrowserView,
  mainWindow: BrowserWindow,
  sidebarVisible: boolean
): void {
  if (!browserView || !mainWindow) {
    logger.error('BrowserView or MainWindow not available for bounds update');
    return;
  }
  
  const newBounds = calculateBrowserViewBounds(mainWindow, sidebarVisible);
  browserView.setBounds(newBounds);
  
  logger.info('BrowserView bounds updated for sidebar visibility change:', {
    sidebarVisible,
    newBounds
  });
}

// Set up auto-resize properly (call once during initialization)
export function setupBrowserViewAutoResize(
  browserView: BrowserView,
  mainWindow: BrowserWindow,
  sidebarVisible: boolean = true
): void {
  if (browserView) {
    // Set initial bounds
    const initialBounds = calculateBrowserViewBounds(mainWindow, sidebarVisible);
    
    // Disable auto-resize; we'll manage bounds manually to avoid overlaying the UI
    browserView.setAutoResize({
      width: false,
      height: false,
      horizontal: false,
      vertical: false
    });
    
    // Set bounds manually for full control
    browserView.setBounds(initialBounds);
    
    console.log('Manual bounds control enabled for BrowserView with initial bounds:', initialBounds);
  }
}