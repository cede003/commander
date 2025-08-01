import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  createWebviewSession: () => ipcRenderer.invoke('create-webview-session'),
  sendToHost: (channel: string, ...args: any[]) => ipcRenderer.sendToHost(channel, ...args),
  showContextMenu: (x: number, y: number, params: any) => ipcRenderer.invoke('show-context-menu', x, y, params),
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      getPlatform: () => Promise<string>;
      createWebviewSession: () => Promise<any>;
      sendToHost: (channel: string, ...args: any[]) => void;
      showContextMenu: (x: number, y: number, params: any) => Promise<void>;
    };
  }
} 