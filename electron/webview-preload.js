const { ipcRenderer } = require('electron');

// Listen for context menu events and send to embedder
window.addEventListener('contextmenu', (event) => {
  event.preventDefault();

  const params = {
    x: event.x,
    y: event.y,
    linkURL: event.target?.href || '',
    srcURL: event.target?.src || '',
  };

  ipcRenderer.sendToHost('webview-context-menu', {
    x: event.x,
    y: event.y,
    params
  });
});

console.log('Webview preload script loaded'); 