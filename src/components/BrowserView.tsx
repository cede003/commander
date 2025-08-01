import React, { forwardRef, useEffect, useRef, useState } from 'react';

// Extend Window interface for electronAPI
declare global {
  interface Window {
    electronAPI?: {
      createBrowserView?: (url: string) => Promise<any>;
      loadURLInBrowserView?: (url: string) => Promise<any>;
      goBackInBrowserView?: () => Promise<boolean>;
      goForwardInBrowserView?: () => Promise<boolean>;
      reloadBrowserView?: () => Promise<any>;
      getBrowserViewCanGoBack?: () => Promise<boolean>;
      getBrowserViewCanGoForward?: () => Promise<boolean>;
      updateBrowserViewBounds?: () => Promise<any>;
      onBrowserViewNavigated?: (callback: (url: string) => void) => void;
      onBrowserViewTitleChanged?: (callback: (title: string) => void) => void;
      onBrowserViewLoaded?: (callback: () => void) => void;
      onBrowserViewLoadFailed?: (callback: (error: any) => void) => void;
      showContextMenu?: (x: number, y: number, params: any) => Promise<void>;
    };
  }
}

interface BrowserViewProps {
  url: string;
  onNavigate: (url: string) => void;
  onTitleChange: (title: string) => void;
  onContextMenu: (event: any) => void;
  onLoad: (event: any) => void;
}

const BrowserViewComponent = forwardRef<any, BrowserViewProps>(({
  url,
  onNavigate,
  onTitleChange,
  onContextMenu,
  onLoad
}, ref) => {
  const [isBrowserViewReady, setIsBrowserViewReady] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  // Set up BrowserView event listeners
  useEffect(() => {
    if (!window.electronAPI) {
      console.error('electronAPI not available');
      return;
    }

    // Set up navigation event listener
    window.electronAPI.onBrowserViewNavigated?.((newUrl: string) => {
      console.log('BrowserView navigated to:', newUrl);
      onNavigate(newUrl);
    });

    // Set up title change event listener
    window.electronAPI.onBrowserViewTitleChanged?.((title: string) => {
      console.log('BrowserView title changed:', title);
      onTitleChange(title);
    });

    // Set up load complete event listener
    window.electronAPI.onBrowserViewLoaded?.(() => {
      console.log('BrowserView finished loading');
      setIsBrowserViewReady(true);
      onLoad({ target: { canGoBack: () => canGoBack, canGoForward: () => canGoForward } });
    });

    // Set up load failed event listener
    window.electronAPI.onBrowserViewLoadFailed?.((error: any) => {
      console.error('BrowserView failed to load:', error);
      // Handle different error codes
      if (error.errorCode === -3) {
        console.log('Navigation aborted (common for embedded content)');
      } else if (error.errorCode === -6) {
        console.log('Connection refused - network issue');
      } else if (error.errorCode === -106) {
        console.log('Internet connection error');
      } else {
        console.error('BrowserView failed to load:', error.validatedURL, 'Error code:', error.errorCode);
      }
    });

    // Update navigation state periodically
    const updateNavigationState = async () => {
      if (window.electronAPI) {
        const backEnabled = await window.electronAPI.getBrowserViewCanGoBack?.();
        const forwardEnabled = await window.electronAPI.getBrowserViewCanGoForward?.();
        setCanGoBack(backEnabled || false);
        setCanGoForward(forwardEnabled || false);
      }
    };

    // Update navigation state every second
    const interval = setInterval(updateNavigationState, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [onNavigate, onTitleChange, onLoad, canGoBack, canGoForward]);

  // Handle URL changes
  useEffect(() => {
    if (!window.electronAPI) {
      console.error('electronAPI not available');
      return;
    }

    const loadURL = async () => {
      try {
        console.log('Loading URL in BrowserView:', url);
        
        if (!isBrowserViewReady) {
          // Create new BrowserView if not ready
          await window.electronAPI.createBrowserView?.(url);
          setIsBrowserViewReady(true);
        } else {
          // Load URL in existing BrowserView
          await window.electronAPI.loadURLInBrowserView?.(url);
        }
      } catch (error) {
        console.error('Error loading URL in BrowserView:', error);
      }
    };

    loadURL();
  }, [url, isBrowserViewReady]);

  // Expose navigation methods through ref
  useEffect(() => {
    if (typeof ref === 'function') {
      ref({
        goBack: async () => {
          if (window.electronAPI) {
            const success = await window.electronAPI.goBackInBrowserView?.();
            if (success) {
              setCanGoBack(false);
              setCanGoForward(true);
            }
          }
        },
        goForward: async () => {
          if (window.electronAPI) {
            const success = await window.electronAPI.goForwardInBrowserView?.();
            if (success) {
              setCanGoBack(true);
              setCanGoForward(false);
            }
          }
        },
        reload: async () => {
          if (window.electronAPI) {
            await window.electronAPI.reloadBrowserView?.();
          }
        },
        canGoBack: () => canGoBack,
        canGoForward: () => canGoForward,
      });
    } else if (ref) {
      ref.current = {
        goBack: async () => {
          if (window.electronAPI) {
            const success = await window.electronAPI.goBackInBrowserView?.();
            if (success) {
              setCanGoBack(false);
              setCanGoForward(true);
            }
          }
        },
        goForward: async () => {
          if (window.electronAPI) {
            const success = await window.electronAPI.goForwardInBrowserView?.();
            if (success) {
              setCanGoBack(true);
              setCanGoForward(false);
            }
          }
        },
        reload: async () => {
          if (window.electronAPI) {
            await window.electronAPI.reloadBrowserView?.();
          }
        },
        canGoBack: () => canGoBack,
        canGoForward: () => canGoForward,
      };
    }
  }, [ref, canGoBack, canGoForward]);

  // Update BrowserView bounds when component mounts
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.updateBrowserViewBounds?.();
    }
  }, []);

  return (
    <div className="w-full h-full relative">
      {!isBrowserViewReady && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-700 mb-2">Initializing Browser...</div>
            <div className="text-sm text-gray-500">Loading BrowserView component</div>
          </div>
        </div>
      )}
      
      {/* BrowserView is embedded in the main window by the main process */}
      {/* This div serves as a placeholder and for loading states */}
      <div className="w-full h-full bg-white">
        {isBrowserViewReady && (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-sm">Browser content is embedded in the main window</div>
              <div className="text-xs mt-2">Right-click for context menu</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

BrowserViewComponent.displayName = 'BrowserViewComponent';

export default BrowserViewComponent; 