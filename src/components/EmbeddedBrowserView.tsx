import React, { forwardRef, useEffect, useRef, useState } from 'react';

interface EmbeddedBrowserViewProps {
  tabId: string;
  url: string;
  onNavigate: (url: string) => void;
  onTitleChange: (title: string) => void;
  onContextMenu: (event: any) => void;
  onLoad: (event: any) => void;
}

const EmbeddedBrowserView = forwardRef<any, EmbeddedBrowserViewProps>(({
  tabId,
  url,
  onNavigate,
  onTitleChange,
  onContextMenu,
  onLoad
}, ref) => {
  const webviewRef = useRef<any>(null);
  const [isWebviewReady, setIsWebviewReady] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  // Set up webview event listeners
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleDomReady = () => {
      console.log('Webview DOM ready for tab:', tabId);
      setIsWebviewReady(true);
    };

    const handleDidNavigate = (event: any) => {
      console.log('Webview navigated to:', event.url, 'for tab:', tabId);
      onNavigate(event.url);
    };

    const handlePageTitleUpdated = (event: any) => {
      console.log('Webview title changed:', event.title, 'for tab:', tabId);
      onTitleChange(event.title);
    };

    const handleLoad = (event: any) => {
      console.log('Webview finished loading for tab:', tabId);
      onLoad(event);
    };

    const handleError = (event: any) => {
      console.error('Webview error for tab:', tabId, event);
    };

    // Handle context menu
    const handleContextMenu = (event: any) => {
      event.preventDefault();
      onContextMenu(event);
    };

    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-navigate', handleDidNavigate);
    webview.addEventListener('page-title-updated', handlePageTitleUpdated);
    webview.addEventListener('did-finish-load', handleLoad);
    webview.addEventListener('did-fail-load', handleError);
    webview.addEventListener('contextmenu', handleContextMenu);

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-navigate', handleDidNavigate);
      webview.removeEventListener('page-title-updated', handlePageTitleUpdated);
      webview.removeEventListener('did-finish-load', handleLoad);
      webview.removeEventListener('did-fail-load', handleError);
      webview.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [onNavigate, onTitleChange, onLoad, onContextMenu, tabId]);

  // Handle URL changes
  useEffect(() => {
    const webview = webviewRef.current;
    if (webview && url && isWebviewReady) {
      console.log('Loading URL in webview for tab:', tabId, 'URL:', url);
      webview.loadURL(url);
    }
  }, [url, isWebviewReady, tabId]);

  // Expose navigation methods through ref
  useEffect(() => {
    if (typeof ref === 'function') {
      ref({
        goBack: async () => {
          const webview = webviewRef.current;
          if (webview && webview.canGoBack()) {
            webview.goBack();
            setCanGoBack(false);
            setCanGoForward(true);
          }
        },
        goForward: async () => {
          const webview = webviewRef.current;
          if (webview && webview.canGoForward()) {
            webview.goForward();
            setCanGoBack(true);
            setCanGoForward(false);
          }
        },
        reload: async () => {
          const webview = webviewRef.current;
          if (webview) {
            webview.reload();
          }
        },
        canGoBack: () => canGoBack,
        canGoForward: () => canGoForward,
      });
    } else if (ref) {
      ref.current = {
        goBack: async () => {
          const webview = webviewRef.current;
          if (webview && webview.canGoBack()) {
            webview.goBack();
            setCanGoBack(false);
            setCanGoForward(true);
          }
        },
        goForward: async () => {
          const webview = webviewRef.current;
          if (webview && webview.canGoForward()) {
            webview.goForward();
            setCanGoBack(true);
            setCanGoForward(false);
          }
        },
        reload: async () => {
          const webview = webviewRef.current;
          if (webview) {
            webview.reload();
          }
        },
        canGoBack: () => canGoBack,
        canGoForward: () => canGoForward,
      };
    }
  }, [ref, canGoBack, canGoForward, tabId]);

  return (
    <div className="w-full h-full relative">
      {!isWebviewReady && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-700 mb-2">Loading...</div>
            <div className="text-sm text-gray-500">Initializing browser for tab {tabId}</div>
          </div>
        </div>
      )}
      
      <webview
        ref={webviewRef}
        src={url}
        className="w-full h-full"
        webpreferences="contextIsolation=no, nodeIntegration=no, webSecurity=no, enableRemoteModule=no, experimentalFeatures=yes, contextMenu=yes, allowRunningInsecureContent=yes, partition=persist:commander-tab-${tabId}, webviewTag=yes, sandbox=no"
      />
    </div>
  );
});

EmbeddedBrowserView.displayName = 'EmbeddedBrowserView';

export default EmbeddedBrowserView; 