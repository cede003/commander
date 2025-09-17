import { contextBridge, ipcRenderer } from 'electron';
import { CONFIG } from './constants/config';
import logger from './utils/logger';

logger.debug('Preload script loaded successfully');
logger.debug('__dirname:', __dirname);
logger.debug('process.type:', process.type);
logger.debug('contextBridge available:', typeof contextBridge !== 'undefined');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // BrowserView management APIs
  createBrowserView: (url: string) => ipcRenderer.invoke('create-browser-view', url),
  loadURLInBrowserView: (url: string) => ipcRenderer.invoke('load-url', url),
  focusBrowserView: () => ipcRenderer.invoke('focus-browser-view'),
  goBackInBrowserView: () => ipcRenderer.invoke('go-back-in-browser-view'),
  goForwardInBrowserView: () => ipcRenderer.invoke('go-forward-in-browser-view'),
  reloadBrowserView: () => ipcRenderer.invoke('reload-browser-view'),
  getBrowserViewCanGoBack: () => ipcRenderer.invoke('get-browser-view-can-go-back'),
  getBrowserViewCanGoForward: () => ipcRenderer.invoke('get-browser-view-can-go-forward'),
  updateBrowserViewBounds: () => ipcRenderer.invoke('update-browser-view-bounds'),
  
  // BrowserView health and recovery
  getBrowserViewHealth: () => ipcRenderer.invoke('get-browser-view-health'),
  manualBrowserViewRecovery: () => ipcRenderer.invoke('manual-browser-view-recovery'),
  restartPythonBrowserSession: () => ipcRenderer.invoke('restart-python-browser-session'),
  checkPythonSessionHealth: () => ipcRenderer.invoke('check-python-session-health'),

  
  // BrowserView event listeners
  onBrowserViewNavigated: (callback: (data: { url: string }) => void) => {
    ipcRenderer.on('browser-view-navigated', (event, data) => callback(data));
  },
  removeBrowserViewNavigatedListener: () => {
    ipcRenderer.removeAllListeners('browser-view-navigated');
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
  onDevToolsToggle: (callback: (data: { open: boolean }) => void) => {
    ipcRenderer.on('devtools-toggled', (event, data) => callback(data));
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
  testIpc: () => ipcRenderer.invoke('test-ipc'),
  onWorkflowCreated: (callback: (workflow: { name: string; description: string; workflowData: string }) => void) => {
    ipcRenderer.on('workflow-created', (event, workflow) => callback(workflow));
  },
  removeWorkflowCreatedListener: () => {
    ipcRenderer.removeAllListeners('workflow-created');
  },

  executeWorkflow: (workflowData: string) => ipcRenderer.invoke('execute-workflow', workflowData),
  logEntry: (logEntry: any) => ipcRenderer.invoke('logEntry', logEntry),

  // Workflow progress from Python engine
  onWorkflowProgress: (callback: (event: any) => void) => {
    ipcRenderer.on('workflow-progress', (_event, data) => callback(data));
  },
  removeWorkflowProgressListener: () => {
    ipcRenderer.removeAllListeners('workflow-progress');
  },
});

 