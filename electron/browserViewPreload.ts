import { contextBridge } from 'electron';

console.log('🔧 BrowserView preload script loaded');

// Set up identification for the Python engine
// @ts-ignore
window.name = 'main-browser';
console.log('🔧 Set window.name = "main-browser" for Python engine identification');

// Expose any necessary APIs to the page
contextBridge.exposeInMainWorld('browserViewAPI', {
  // Add any BrowserView-specific APIs here if needed
  getWindowInfo: () => ({
    // @ts-ignore
    name: window.name,
    // @ts-ignore
    userAgent: navigator.userAgent,
    // @ts-ignore
    url: window.location.href
  })
});

// Log when the page is ready
// @ts-ignore
document.addEventListener('DOMContentLoaded', () => {
  // @ts-ignore
  console.log('🔧 BrowserView page loaded, window.name:', window.name);
});

// Ensure window.name persists across navigations
// @ts-ignore
let originalName = window.name;
// @ts-ignore
Object.defineProperty(window, 'name', {
  get: () => originalName,
  set: (value) => {
    // Only allow setting to 'main-browser' or keep original
    if (value === 'main-browser' || value === originalName) {
      originalName = value;
    }
    // Otherwise, ignore the change to maintain identification
  }
}); 