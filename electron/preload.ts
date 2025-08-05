import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // BrowserView management APIs
  createBrowserView: (url: string) => ipcRenderer.invoke('create-browser-view', url),
  loadURLInBrowserView: (url: string) => ipcRenderer.invoke('load-url-in-browser-view', url),
  focusBrowserView: () => ipcRenderer.invoke('focus-browser-view'),
  goBackInBrowserView: () => ipcRenderer.invoke('go-back-in-browser-view'),
  goForwardInBrowserView: () => ipcRenderer.invoke('go-forward-in-browser-view'),
  reloadBrowserView: () => ipcRenderer.invoke('reload-browser-view'),
  getBrowserViewCanGoBack: () => ipcRenderer.invoke('get-browser-view-can-go-back'),
  getBrowserViewCanGoForward: () => ipcRenderer.invoke('get-browser-view-can-go-forward'),
  updateBrowserViewBounds: () => ipcRenderer.invoke('update-browser-view-bounds'),
  updateBrowserViewBoundsFromClient: (bounds: { x: number; y: number; width: number; height: number }) => ipcRenderer.invoke('update-browser-view-bounds-from-client', bounds),
  
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
  updateSidebarVisibility: (visible: boolean) => ipcRenderer.invoke('update-sidebar-visibility', visible),
  initializeBrowserView: () => ipcRenderer.invoke('initialize-browser-view'),
  openCreateWorkflowModal: () => ipcRenderer.invoke('open-create-workflow-modal'),
  createWorkflow: (workflow: { id?: string; name: string; description: string; workflowData: string; isEditing?: boolean }) => ipcRenderer.invoke('create-workflow', workflow),
  testIpc: () => ipcRenderer.invoke('test-ipc'),
  onWorkflowCreated: (callback: (workflow: { name: string; description: string; workflowData: string }) => void) => {
    ipcRenderer.on('workflow-created', (event, workflow) => callback(workflow));
  },
  removeWorkflowCreatedListener: () => {
    ipcRenderer.removeAllListeners('workflow-created');
  },
  onDevToolsToggle: (callback: () => void) => {
    ipcRenderer.on('dev-tools-toggle', callback);
  },
  executeWorkflow: (workflowData: string) => ipcRenderer.invoke('execute-workflow', workflowData),
  executeWorkflowCommand: (command: string, data: any) => ipcRenderer.invoke('execute-workflow-command', command, data),
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
      updateSidebarVisibility: (visible: boolean) => Promise<void>;
      initializeBrowserView: () => Promise<void>;
      openCreateWorkflowModal: () => Promise<void>;
      testIpc: () => Promise<string>;
      onDevToolsToggle: (callback: () => void) => void;
      executeWorkflow: (workflowData: string) => Promise<void>;
      executeWorkflowCommand: (command: string, data: any) => Promise<any>;
    };
  }
} 