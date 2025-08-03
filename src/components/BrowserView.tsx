import React, { forwardRef, useEffect, useRef, useState } from 'react';

// Extend Window interface to include our global tracker
declare global {
  interface Window {
    browserViewCreationTracker?: Set<string>;
    browserViewTracker?: Map<string, any>;
  }
}

interface BrowserViewProps {
  url: string;
  onNavigate: (url: string) => void;
  onTitleChange: (title: string) => void;
  onContextMenu: (event: any) => void;
  onLoad: (event: any) => void;
  onLoadingStateChange: (isLoading: boolean) => void;
}

const BrowserViewComponent = forwardRef<any, BrowserViewProps>(({
  url,
  onNavigate,
  onTitleChange,
  onContextMenu,
  onLoad,
  onLoadingStateChange
}, ref) => {
  const [isBrowserViewReady, setIsBrowserViewReady] = useState(false);
  const [isCreatingBrowserView, setIsCreatingBrowserView] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  
  const isMounted = useRef(true); // Track if component is mounted
  
  // Global tracker map for BrowserView instances
  if (!window.browserViewTracker) {
    window.browserViewTracker = new Map<string, any>();
  }
  
  // Refs for tracking state
  const browserViewCreatedRef = useRef<{ [key: string]: boolean }>({});
  const lastLoadedUrlRef = useRef<{ [key: string]: string }>({});
  const creationInProgressRef = useRef<{ [key: string]: boolean }>({});
  const eventListenersRegisteredRef = useRef<{ [key: string]: boolean }>({});
  const renderCountRef = useRef(0);
  const prevUrlRef = useRef<string>();

  // Track component mount state and reset creation state on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      // Reset creation state on unmount to allow retrying
      if (isCreatingBrowserView) {
        console.log(`[BROWSERVIEW DEBUG] Component unmounting, resetting creation state`);
        setIsCreatingBrowserView(false);
      }
      // Clean up tracker
      window.browserViewTracker?.delete('main');
    };
  }, [isCreatingBrowserView]);

  // URL normalization function
  const normalize = (url: string) => {
    try {
      const u = new URL(url);
      return u.origin + u.pathname.replace(/\/$/, '');
    } catch {
      return url;
    }
  };

  // Set up BrowserView event listeners - only once
  useEffect(() => {
    const electronAPI = window.electronAPI;
    if (!electronAPI || eventListenersRegisteredRef.current['main']) {
      return;
    }

    console.log(`[BROWSERVIEW DEBUG] Setting up event listeners`);
    eventListenersRegisteredRef.current['main'] = true;

    // Create event handler functions
    const handleNavigated = (data: { url: string }) => {
      if (isMounted.current) {
        // Only trigger navigation if URL actually changed (using normalized URLs)
        const normalizedNewUrl = normalize(data.url);
        const normalizedCurrentUrl = lastLoadedUrlRef.current['main'] ? normalize(lastLoadedUrlRef.current['main']) : null;
        
        if (normalizedCurrentUrl !== normalizedNewUrl) {
          console.log(`[BROWSERVIEW DEBUG] Navigated to:`, data.url, `(normalized: ${normalizedNewUrl})`);
          onNavigate(data.url);
          // Update tracker with new URL
          window.browserViewTracker?.set('main', { ready: true, url: data.url });
        } else {
          console.debug(`[BROWSERVIEW DEBUG] Skipping navigation event, URL unchanged: ${data.url} (normalized: ${normalizedNewUrl})`);
        }
      }
    };

    const handleTitleChanged = (data: { title: string }) => {
      console.log(`[BROWSERVIEW DEBUG] Title changed:`, data.title);
      onTitleChange(data.title);
    };

    const handleLoaded = (data: {}) => {
      if (isMounted.current) {
        console.log(`[BROWSERVIEW DEBUG] Browser finished loading`);
        // Only update state if it actually changed
        if (!isBrowserViewReady) {
          setIsBrowserViewReady(true);
        }
        if (isCreatingBrowserView) {
          setIsCreatingBrowserView(false); // Reset creation state
        }
        
        // Set tracker when BrowserView is fully ready
        if (isBrowserViewReady) {
          window.browserViewTracker?.set('main', { ready: true, url });
          console.log(`[BROWSERVIEW DEBUG] Browser is fully initialized and tracked`);
        }
        
        onLoad({ target: { canGoBack: () => canGoBack, canGoForward: () => canGoForward } });
      }
    };

    const handleLoadFailed = (data: { error: any }) => {
      console.error(`[BROWSERVIEW DEBUG] Browser failed to load:`, data.error);
      // Handle different error codes
      if (data.error.errorCode === -3) {
        console.log('Navigation aborted (common for embedded content)');
      } else if (data.error.errorCode === -6) {
        console.log('Connection refused - network issue');
      } else if (data.error.errorCode === -106) {
        console.log('Internet connection error');
      } else {
        console.error('BrowserView failed to load:', data.error.validatedURL, 'Error code:', data.error.errorCode);
      }
    };

    const handleLoadingStateChanged = (data: { isLoading: boolean }) => {
      // Only log and trigger loading state changes
      console.log(`[BROWSERVIEW DEBUG] Loading state changed:`, data.isLoading);
      onLoadingStateChange(data.isLoading);
    };

    // Set up event listeners
    electronAPI.onBrowserViewNavigated?.(handleNavigated);
    electronAPI.onBrowserViewTitleChanged?.(handleTitleChanged);
    electronAPI.onBrowserViewLoaded?.(handleLoaded);
    electronAPI.onBrowserViewLoadFailed?.(handleLoadFailed);
    electronAPI.onBrowserViewLoadingStateChanged?.(handleLoadingStateChanged);

    // Update navigation state periodically
    const updateNavigationState = async () => {
      if (electronAPI) {
        const backEnabled = await electronAPI.getBrowserViewCanGoBack?.();
        const forwardEnabled = await electronAPI.getBrowserViewCanGoForward?.();
        setCanGoBack(backEnabled || false);
        setCanGoForward(forwardEnabled || false);
      }
    };

    // Update navigation state every second
    const interval = setInterval(updateNavigationState, 1000);

    return () => {
      console.log(`[BROWSERVIEW DEBUG] Cleaning up event listeners`);
      clearInterval(interval);
      // Mark as unregistered so it can be re-registered if needed
      eventListenersRegisteredRef.current['main'] = false;
      // Note: We can't easily remove the event listeners from the preload script
      // but this effect should only run once, so it's manageable
    };
  }, []); // Only depend on nothing to prevent re-registering listeners

  // Handle URL changes with proper dependency management
  useEffect(() => {
    const electronAPI = window.electronAPI;
    if (!electronAPI) {
      console.error('electronAPI not available');
      return;
    }

    console.log(`[BROWSERVIEW DEBUG] URL effect triggered, url: ${url}, isBrowserViewReady: ${isBrowserViewReady}, isCreatingBrowserView: ${isCreatingBrowserView}`);

    // Guard: Skip if URL hasn't actually changed (using normalized URLs)
    const normalizedUrl = normalize(url);
    const normalizedPrevUrl = prevUrlRef.current ? normalize(prevUrlRef.current) : null;
    
    // Only skip if we have a previous URL and it's the same as current
    if (prevUrlRef.current && normalizedPrevUrl === normalizedUrl) {
      console.debug(`[BROWSERVIEW DEBUG] Skipping navigation, URL unchanged: ${url} (normalized: ${normalizedUrl})`);
      return;
    }

    // Guard: Skip if no URL provided
    if (!url || url.trim() === '') {
      console.debug(`[BROWSERVIEW DEBUG] Skipping navigation, no URL provided`);
      return;
    }

    console.log(`[BROWSERVIEW DEBUG] Processing URL: ${url}`);
    prevUrlRef.current = url; // Update previous URL ref

    const loadURL = async () => {
      try {
        console.log(`[BROWSERVIEW DEBUG] Loading URL in BrowserView, URL: ${url}, isBrowserViewReady: ${isBrowserViewReady}`);
        
        // Prevent loading the same URL multiple times
        if (lastLoadedUrlRef.current['main'] === url && isBrowserViewReady) {
          console.log(`[BROWSERVIEW DEBUG] URL already loaded, skipping: ${url}`);
          return;
        }
        
        if (!isBrowserViewReady && !isCreatingBrowserView && !browserViewCreatedRef.current['main']) {
          // Create new BrowserView with proper lifecycle guarding
          if (!isMounted.current) {
            console.log(`[BROWSERVIEW DEBUG] Component unmounted, aborting creation`);
            return;
          }

          console.log(`[BROWSERVIEW DEBUG] Creating new BrowserView`);
          setIsCreatingBrowserView(true);
          creationInProgressRef.current['main'] = true;
          browserViewCreatedRef.current['main'] = true;

          try {
            await electronAPI.createBrowserView?.(url);
            
            if (!isMounted.current) {
              console.log(`[BROWSERVIEW DEBUG] Component unmounted after creation, aborting`);
              return;
            }

            console.log(`[BROWSERVIEW DEBUG] ✅ BrowserView creation completed`);
            lastLoadedUrlRef.current['main'] = url;
          } catch (error) {
            console.error(`[BROWSERVIEW DEBUG] Error creating BrowserView:`, error);
          } finally {
            if (isMounted.current) {
              setIsCreatingBrowserView(false);
            }
          }
        } else if (isBrowserViewReady) {
          // Load URL in existing BrowserView only if URL actually changed
          console.log(`[BROWSERVIEW DEBUG] Loading URL in existing BrowserView`);
          await electronAPI.loadURLInBrowserView?.(url);
          lastLoadedUrlRef.current['main'] = url;
        } else {
          console.log(`[BROWSERVIEW DEBUG] BrowserView creation skipped - State: isBrowserViewReady=${isBrowserViewReady}, isCreatingBrowserView=${isCreatingBrowserView}, browserViewCreated=${browserViewCreatedRef.current['main']}`);
        }
      } catch (error) {
        console.error(`[BROWSERVIEW DEBUG] Error loading URL in BrowserView:`, error);
      }
    };

    // For initial load, don't debounce to ensure BrowserView gets created
    if (!prevUrlRef.current) {
      loadURL();
    } else {
      // Throttle subsequent URL processing to reduce render counts
      const timeoutId = setTimeout(() => {
        if (!isMounted.current) return;
        loadURL();
      }, 50); // 50ms debounce

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [url, isBrowserViewReady, isCreatingBrowserView]); // Include all dependencies that affect the logic

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      console.log(`[BROWSERVIEW DEBUG] Component unmounting`);
      if (isCreatingBrowserView) {
        console.log(`[BROWSERVIEW DEBUG] Resetting BrowserView creation state`);
        setIsCreatingBrowserView(false);
      }
      // Clean up refs and tracker when component unmounts
      delete browserViewCreatedRef.current['main'];
      delete lastLoadedUrlRef.current['main'];
      delete creationInProgressRef.current['main'];
      window.browserViewTracker?.delete('main');
    };
  }, [isCreatingBrowserView]);

  // Expose navigation methods through ref
  useEffect(() => {
    const electronAPI = window.electronAPI;
    if (!electronAPI) return;

    if (typeof ref === 'function') {
      ref({
        goBack: async () => {
          const success = await electronAPI.goBackInBrowserView?.();
          if (success) {
            setCanGoBack(false);
            setCanGoForward(true);
          }
        },
        goForward: async () => {
          const success = await electronAPI.goForwardInBrowserView?.();
          if (success) {
            setCanGoBack(true);
            setCanGoForward(false);
          }
        },
        reload: async () => {
          await electronAPI.reloadBrowserView?.();
        },
        canGoBack: () => canGoBack,
        canGoForward: () => canGoForward,
      });
    } else if (ref) {
      ref.current = {
        goBack: async () => {
          const success = await electronAPI.goBackInBrowserView?.();
          if (success) {
            setCanGoBack(false);
            setCanGoForward(true);
          }
        },
        goForward: async () => {
          const success = await electronAPI.goForwardInBrowserView?.();
          if (success) {
            setCanGoBack(true);
            setCanGoForward(false);
          }
        },
        reload: async () => {
          await electronAPI.reloadBrowserView?.();
        },
        canGoBack: () => canGoBack,
        canGoForward: () => canGoForward,
      };
    }
  }, [ref, canGoBack, canGoForward]);

  // Update BrowserView bounds when component mounts
  useEffect(() => {
    const electronAPI = window.electronAPI;
    if (electronAPI) {
      electronAPI.updateBrowserViewBounds?.();
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
      {/* This div serves as a background when BrowserView is ready */}
      {isBrowserViewReady && (
        <div className="w-full h-full bg-white">
          {/* The actual BrowserView content is embedded in the main window */}
          {/* This div is just a background in case the BrowserView doesn't cover the full area */}
        </div>
      )}
    </div>
  );
});

BrowserViewComponent.displayName = 'BrowserViewComponent';

export default BrowserViewComponent; 