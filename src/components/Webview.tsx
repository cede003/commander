import React, { forwardRef, useEffect, useRef, useState } from 'react';

// Extend Window interface for electronAPI
declare global {
  interface Window {
    electronAPI?: {
      showContextMenu?: (x: number, y: number, params: any) => Promise<void>;
      sendToHost?: (channel: string, ...args: any[]) => void;
    };
  }
}

interface WebviewProps {
  url: string;
  onNavigate: (url: string) => void;
  onTitleChange: (title: string) => void;
  onContextMenu: (event: any) => void;
  onLoad: (event: any) => void;
}

const Webview = forwardRef<any, WebviewProps>(({
  url,
  onNavigate,
  onTitleChange,
  onContextMenu,
  onLoad
}, ref) => {
  const webviewRef = useRef<any>(null);
  const [isWebviewReady, setIsWebviewReady] = useState(false);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleDomReady = () => {
      console.log('Webview DOM ready');
      setIsWebviewReady(true);
      
      // Simple content loaded notification
      webview.executeJavaScript(`
        console.log('=== WEBVIEW CONTENT LOADED ===');
        console.log('electron-context-menu will handle context menus automatically');
      `);
    };

    const handleDidNavigate = (event: any) => {
      console.log('Webview navigated to:', event.url);
      onNavigate(event.url);
    };

    const handlePageTitleUpdated = (event: any) => {
      onTitleChange(event.title);
    };

    const handleLoad = (event: any) => {
      console.log('Webview finished loading');
      onLoad(event);
    };

    const handleError = (event: any) => {
      console.error('Webview error:', event);
      // Handle different error codes
      if (event.errorCode === -3) {
        console.log('Navigation aborted (common for webview)');
      } else if (event.errorCode === -6) {
        console.log('Connection refused - network issue');
      } else if (event.errorCode === -106) {
        console.log('Internet connection error');
      } else {
        console.error('Webview failed to load:', event.validatedURL, 'Error code:', event.errorCode);
      }
    };

    // Listen for context menu messages from webview
    const handleIpcMessage = (event: any) => {
      if (event.channel === 'webview-context-menu') {
        const { x, y, params } = event.args[0];
        console.log('Context menu from webview:', { x, y, params });
        
        // Call the main process context menu
        if (window.electronAPI?.showContextMenu) {
          window.electronAPI.showContextMenu(x, y, params);
        }
      }
    };

    webview.addEventListener('ipc-message', handleIpcMessage);

    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-navigate', handleDidNavigate);
    webview.addEventListener('page-title-updated', handlePageTitleUpdated);
    webview.addEventListener('did-finish-load', handleLoad);
    webview.addEventListener('did-fail-load', handleError);

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-navigate', handleDidNavigate);
      webview.removeEventListener('page-title-updated', handlePageTitleUpdated);
      webview.removeEventListener('did-finish-load', handleLoad);
      webview.removeEventListener('did-fail-load', handleError);
      webview.removeEventListener('ipc-message', handleIpcMessage);
    };
  }, [onNavigate, onTitleChange, onLoad]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (webview && url && isWebviewReady) {
      try {
        console.log('Loading URL in webview:', url);
        console.log('Webview ready state:', webview.readyState);
        console.log('Webview src attribute:', webview.src);
        
        // Add timeout and error handling
        const loadURL = async () => {
          try {
            console.log('Attempting to load URL:', url);
            await webview.loadURL(url, {
              userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });
          } catch (error) {
            console.error('Error loading URL:', error);
            // For data URLs, this should rarely fail
            if (!url.startsWith('data:')) {
              console.log('URL failed to load, but continuing...');
            }
          }
        };
        
        loadURL();
      } catch (error) {
        console.error('Error in loadURL effect:', error);
      }
    }
  }, [url, isWebviewReady]);

  // Add debugging for webview creation
  useEffect(() => {
    const webview = webviewRef.current;
    if (webview) {
      console.log('Webview element created');
      console.log('Initial webview src:', webview.src);
      console.log('Initial webview ready state:', webview.readyState);
    }
  }, []);

  return (
    <div className="w-full h-full relative">
      {!isWebviewReady && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-700 mb-2">Initializing Browser...</div>
            <div className="text-sm text-gray-500">Loading webview component</div>
          </div>
        </div>
      )}
      <webview
        ref={(el) => {
          webviewRef.current = el;
          if (typeof ref === 'function') {
            ref(el);
          } else if (ref) {
            ref.current = el;
          }
        }}
        src={url}
        className="w-full h-full"
        webpreferences="contextIsolation=no, nodeIntegration=no, webSecurity=no, enableRemoteModule=no, experimentalFeatures=yes, contextMenu=yes, allowRunningInsecureContent=yes, partition=persist:commander, webviewTag=yes, sandbox=no"
      />
    </div>
  );
});

Webview.displayName = 'Webview';

export default Webview; 