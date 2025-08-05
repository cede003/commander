import React, { useState, useEffect, useRef } from 'react';
import { BrowserPaneProps } from '../types';

const BrowserPane: React.FC<BrowserPaneProps> = ({ 
  className = '', 
  isSidebarVisible = true,
  onURLChange,
  onNavigationStateChange,
  isDarkMode = false
}) => {
  const [currentURL, setCurrentURL] = useState<string>('');
  const [isBrowserReady, setIsBrowserReady] = useState<boolean>(false);
  const browserViewRef = useRef<HTMLDivElement>(null);

  // Call parent callbacks when state changes
  useEffect(() => {
    if (onURLChange) {
      onURLChange(currentURL);
    }
  }, [currentURL, onURLChange]);

  // Initialize browser on mount
  useEffect(() => {
    const initializeBrowser = async () => {
      try {
        // Initialize BrowserView with default URL
        if (window.electronAPI?.initializeBrowserView) {
          await window.electronAPI.initializeBrowserView();
        }
        
        // Get current URL from main process
        if (window.electronAPI?.getCurrentURL) {
          const url = await window.electronAPI.getCurrentURL();
          setCurrentURL(url);
        }
        
        // Mark browser as ready
        setIsBrowserReady(true);
      } catch (error) {
        console.error('Failed to initialize browser:', error);
      }
    };

    initializeBrowser();
  }, []);

  // Listen for browser navigation events
  useEffect(() => {
    const handleBrowserViewNavigated = async (data: { url: string }) => {
      console.log('[DEBUG] BrowserView navigated:', data.url);
      setCurrentURL(data.url);
    };

    // Set up event listeners
    if (window.electronAPI?.onBrowserViewNavigated) {
      console.log('[DEBUG] Setting up browser view navigated listener');
      window.electronAPI.onBrowserViewNavigated(handleBrowserViewNavigated);
    }

    return () => {
      // Cleanup event listeners
      console.log('[DEBUG] Cleaning up event listeners');
      if (window.electronAPI?.removeBrowserViewNavigatedListener) {
        window.electronAPI.removeBrowserViewNavigatedListener();
      }
    };
  }, []); // Keep empty dependency array

  // Handle window resize and DevTools events
  useEffect(() => {
    const handleResize = () => {
      // Send bounds update instead of just updateLayout
      const rect = browserViewRef.current?.getBoundingClientRect();
      if (rect) {
        window.electronAPI?.updateBrowserViewBoundsFromClient?.({
          x: Math.floor(rect.left),
          y: Math.floor(rect.top),
          width: Math.floor(rect.width),
          height: Math.floor(rect.height)
        });
      }
    };

    const handleDevToolsToggle = () => {
      // Small delay to ensure DevTools state is updated
      setTimeout(() => {
        const rect = browserViewRef.current?.getBoundingClientRect();
        if (rect) {
          window.electronAPI?.updateBrowserViewBoundsFromClient?.({
            x: Math.floor(rect.left),
            y: Math.floor(rect.top),
            width: Math.floor(rect.width),
            height: Math.floor(rect.height)
          });
        }
      }, 100);
    };

    // Listen for DevTools events (if available)
    if (window.electronAPI?.onDevToolsToggle) {
      window.electronAPI.onDevToolsToggle(handleDevToolsToggle);
    }

    return () => {
      // Cleanup handled by the bounds sending useEffect
    };
  }, []);

  // Update browser bounds when sidebar visibility changes
  useEffect(() => {
    if (isBrowserReady) {
      // Immediate update for responsiveness
      const rect = browserViewRef.current?.getBoundingClientRect();
      if (rect) {
        window.electronAPI?.updateBrowserViewBoundsFromClient?.({
          x: Math.floor(rect.left),
          y: Math.floor(rect.top),
          width: Math.floor(rect.width),
          height: Math.floor(rect.height)
        });
      }
      
      // Delayed update after sidebar animation completes
      setTimeout(() => {
        // Update sidebar visibility in main process
        if (window.electronAPI?.updateSidebarVisibility) {
          window.electronAPI.updateSidebarVisibility(isSidebarVisible);
        }
        
        // Send updated bounds after sidebar animation
        const rect = browserViewRef.current?.getBoundingClientRect();
        if (rect) {
          window.electronAPI?.updateBrowserViewBoundsFromClient?.({
            x: Math.floor(rect.left),
            y: Math.floor(rect.top),
            width: Math.floor(rect.width),
            height: Math.floor(rect.height)
          });
        }
      }, 350); // Match the sidebar transition duration (300ms) + buffer
    }
  }, [isSidebarVisible, isBrowserReady]);

  // Send browser view bounds to Electron
  useEffect(() => {
    const sendBounds = () => {
      const rect = browserViewRef.current?.getBoundingClientRect();
      if (rect) {
        window.electronAPI?.updateBrowserViewBoundsFromClient?.({
          x: Math.floor(rect.left),
          y: Math.floor(rect.top),
          width: Math.floor(rect.width),
          height: Math.floor(rect.height)
        });
      }
    };

    // Initial send
    sendBounds();

    // Use ResizeObserver for more responsive updates
    let resizeObserver: ResizeObserver | null = null;
    if (browserViewRef.current) {
      resizeObserver = new ResizeObserver(() => {
        sendBounds();
      });
      resizeObserver.observe(browserViewRef.current);
    }

    // Use MutationObserver to watch for layout changes (like sidebar animations)
    let mutationObserver: MutationObserver | null = null;
    if (browserViewRef.current?.parentElement) {
      mutationObserver = new MutationObserver(() => {
        // Small delay to let layout settle
        setTimeout(sendBounds, 50);
      });
      mutationObserver.observe(browserViewRef.current.parentElement, {
        attributes: true,
        childList: true,
        subtree: true
      });
    }

    // Also listen for window resize as fallback
    window.addEventListener('resize', sendBounds);
    
    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mutationObserver) {
        mutationObserver.disconnect();
      }
      window.removeEventListener('resize', sendBounds);
    };
  }, []);

  // Handle control+click for context menu
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      
      // Send IPC event to show context menu at click position
      if (window.electronAPI?.showContextMenuAtPosition) {
        window.electronAPI.showContextMenuAtPosition(e.clientX, e.clientY);
      }
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Browser Area */}
      <div className={`flex-1 relative ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {!isBrowserReady ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={`text-lg font-semibold mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Initializing Browser...
              </div>
              <div className={`text-sm ${
                isDarkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
                Loading WebContentsView
              </div>
            </div>
          </div>
        ) : (
          <div ref={browserViewRef} className="w-full h-full">
            {/* WebContentsView is managed by the main process */}
            {/* The actual WebContentsView content is embedded by the main process */}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowserPane; 