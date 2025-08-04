import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // BrowserView management APIs
  createBrowserView: (url: string) => ipcRenderer.invoke('create-browser-view', url),
  loadURLInBrowserView: (url: string) => ipcRenderer.invoke('load-url-in-browser-view', url),
  goBackInBrowserView: () => ipcRenderer.invoke('go-back-in-browser-view'),
  goForwardInBrowserView: () => ipcRenderer.invoke('go-forward-in-browser-view'),
  reloadBrowserView: () => ipcRenderer.invoke('reload-browser-view'),
  getBrowserViewCanGoBack: () => ipcRenderer.invoke('get-browser-view-can-go-back'),
  getBrowserViewCanGoForward: () => ipcRenderer.invoke('get-browser-view-can-go-forward'),
  updateBrowserViewBounds: () => ipcRenderer.invoke('update-browser-view-bounds'),
  
  // BrowserView event listeners
  onBrowserViewNavigated: (callback: (data: { url: string }) => void) => {
    ipcRenderer.on('browser-view-navigated', (event, data) => callback(data));
  },
  onBrowserViewTitleChanged: (callback: (data: { title: string }) => void) => {
    ipcRenderer.on('browser-view-title-changed', (event, data) => callback(data));
  },
  onBrowserViewLoaded: (callback: (data: {}) => void) => {
    ipcRenderer.on('browser-view-loaded', (event, data) => callback(data));
  },
  onBrowserViewLoadFailed: (callback: (data: { error: any }) => void) => {
    ipcRenderer.on('browser-view-load-failed', (event, data) => callback(data));
  },
  onBrowserViewLoadingStateChanged: (callback: (data: { isLoading: boolean }) => void) => {
    ipcRenderer.on('browser-view-loading-state-changed', (event, data) => callback(data));
  },
  
  // Context menu and utility APIs
  showContextMenu: (x: number, y: number, params: any) => ipcRenderer.invoke('show-context-menu', x, y, params),
  showContextMenuAtPosition: (x: number, y: number) => ipcRenderer.invoke('show-context-menu-at-position', x, y),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // BrowserPane API
  loadURL: (url: string) => ipcRenderer.invoke('load-url', url),
  navigate: (direction: 'back' | 'forward') => ipcRenderer.invoke('navigate', direction),
  getCurrentURL: () => ipcRenderer.invoke('get-current-url'),
  updateLayout: () => ipcRenderer.invoke('update-layout'),
  initializeBrowserView: () => ipcRenderer.invoke('initialize-browser-view'),
  onDevToolsToggle: (callback: () => void) => {
    ipcRenderer.on('dev-tools-toggle', callback);
  },
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
      onBrowserViewNavigated: (callback: (data: { url: string }) => void) => void;
      onBrowserViewTitleChanged: (callback: (data: { title: string }) => void) => void;
      onBrowserViewLoaded: (callback: (data: {}) => void) => void;
      onBrowserViewLoadFailed: (callback: (data: { error: any }) => void) => void;
      onBrowserViewLoadingStateChanged: (callback: (data: { isLoading: boolean }) => void) => void;
      showContextMenu: (x: number, y: number, params: any) => Promise<void>;
      showContextMenuAtPosition: (x: number, y: number) => Promise<void>;
      
      // BrowserPane API
      loadURL: (url: string) => Promise<void>;
      navigate: (direction: 'back' | 'forward') => Promise<void>;
      getCurrentURL: () => Promise<string>;
      updateLayout: () => Promise<void>;
      initializeBrowserView: () => Promise<void>;
      onDevToolsToggle: (callback: () => void) => void;
    };
  }
} 