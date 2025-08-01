import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // BrowserView management APIs (replaces webview APIs)
  createBrowserView: (url: string) => ipcRenderer.invoke('create-browser-view', url),
  loadURLInBrowserView: (url: string) => ipcRenderer.invoke('load-url-in-browser-view', url),
  goBackInBrowserView: () => ipcRenderer.invoke('go-back-in-browser-view'),
  goForwardInBrowserView: () => ipcRenderer.invoke('go-forward-in-browser-view'),
  reloadBrowserView: () => ipcRenderer.invoke('reload-browser-view'),
  getBrowserViewCanGoBack: () => ipcRenderer.invoke('get-browser-view-can-go-back'),
  getBrowserViewCanGoForward: () => ipcRenderer.invoke('get-browser-view-can-go-forward'),
  updateBrowserViewBounds: () => ipcRenderer.invoke('update-browser-view-bounds'),
  
  // BrowserView event listeners
  onBrowserViewNavigated: (callback: (url: string) => void) => {
    ipcRenderer.on('browser-view-navigated', (event, url) => callback(url));
  },
  onBrowserViewTitleChanged: (callback: (title: string) => void) => {
    ipcRenderer.on('browser-view-title-changed', (event, title) => callback(title));
  },
  onBrowserViewLoaded: (callback: () => void) => {
    ipcRenderer.on('browser-view-loaded', () => callback());
  },
  onBrowserViewLoadFailed: (callback: (error: any) => void) => {
    ipcRenderer.on('browser-view-load-failed', (event, error) => callback(error));
  },

  // Legacy APIs for backward compatibility
  showContextMenu: (x: number, y: number, params: any) => ipcRenderer.invoke('show-context-menu', x, y, params),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      getPlatform: () => Promise<string>;
      createBrowserView: (url: string) => Promise<any>;
      loadURLInBrowserView: (url: string) => Promise<any>;
      goBackInBrowserView: () => Promise<any>;
      goForwardInBrowserView: () => Promise<any>;
      reloadBrowserView: () => Promise<any>;
      getBrowserViewCanGoBack: () => Promise<any>;
      getBrowserViewCanGoForward: () => Promise<any>;
      updateBrowserViewBounds: () => Promise<any>;
      onBrowserViewNavigated: (callback: (url: string) => void) => void;
      onBrowserViewTitleChanged: (callback: (title: string) => void) => void;
      onBrowserViewLoaded: () => void;
      onBrowserViewLoadFailed: (callback: (error: any) => void) => void;
      showContextMenu: (x: number, y: number, params: any) => Promise<void>;
    };
  }
} 