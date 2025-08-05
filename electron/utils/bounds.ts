import { BrowserView, BrowserWindow } from 'electron';

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
  const [width, height] = mainWindow.getSize();
  const [x, y] = mainWindow.getPosition();
  
  // Calculate sidebar width (320px when visible, 0 when hidden)
  const sidebarWidth = sidebarVisible ? 320 : 0;
  
  // Calculate available width for BrowserView
  const availableWidth = width - sidebarWidth;
  
  // Calculate y offset (account for title bar and any other UI elements)
  const yOffset = 80; // Adjust based on your UI layout
  
  return {
    x: x + sidebarWidth,
    y: y + yOffset,
    width: availableWidth,
    height: height - yOffset,
  };
}

export function updateBrowserViewBounds(
  browserView: BrowserView,
  bounds: Bounds
): void {
  if (browserView) {
    browserView.setBounds(bounds);
    browserView.setAutoResize({ width: true, height: true });
  }
}

export function getBoundsFromClient(clientBounds: Bounds): Bounds {
  return {
    x: Math.floor(clientBounds.x),
    y: Math.floor(clientBounds.y),
    width: Math.floor(clientBounds.width),
    height: Math.floor(clientBounds.height),
  };
} 