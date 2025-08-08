import React, { useState, useEffect, useRef } from 'react';
import { BrowserPaneProps } from '../types';
import logger from '../utils/logger';

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
  const hasInitialized = useRef(false);
  
  // Get window dimensions
  const windowDimensions = {
    width: window.innerWidth,
    height: window.innerHeight
  };
  


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
        console.log('Starting browser initialization...');
        
        // Initialize BrowserView with default URL
        if (window.electronAPI?.initializeBrowserView) {
          console.log('Calling initializeBrowserView...');
          await window.electronAPI.initializeBrowserView();
          console.log('initializeBrowserView completed');
        } else {
          console.log('initializeBrowserView not available');
        }
        
        // Get current URL from main process
        if (window.electronAPI?.getCurrentURL) {
          console.log('Getting current URL...');
          const url = await window.electronAPI.getCurrentURL();
          console.log('Current URL:', url);
          setCurrentURL(url);
        } else {
          console.log('getCurrentURL not available');
        }
        
        // Mark browser as ready
        console.log('Marking browser as ready');
        setIsBrowserReady(true);
      } catch (error) {
        console.error('Failed to initialize browser:', error);
        // Still mark as ready even if there's an error to show the interface
        setIsBrowserReady(true);
      }
    };

    console.log('Browser initialization effect running, hasInitialized:', hasInitialized.current);
    console.log('electronAPI available:', !!window.electronAPI);
    
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      initializeBrowser();
    }
  }, []);

  // Listen for browser navigation events
  useEffect(() => {
    const handleBrowserViewNavigated = async (data: { url: string }) => {
      logger.debug('BrowserView navigated:', { url: data.url });
      setCurrentURL(data.url);
      
      // Call navigation state change callback if provided
      if (onNavigationStateChange) {
        onNavigationStateChange(
          true,  // canGoBack - This would need to be determined from the browser view
          false  // canGoForward - This would need to be determined from the browser view
        );
      }
    };

    // Set up event listeners
    if (window.electronAPI?.onBrowserViewNavigated) {
      logger.debug('Setting up browser view navigated listener');
      window.electronAPI.onBrowserViewNavigated(handleBrowserViewNavigated);
    }

    return () => {
      // Cleanup event listeners
      logger.debug('Cleaning up event listeners');
      // Note: removeBrowserViewNavigatedListener is not implemented in the current API
      // The listener will be cleaned up automatically when the component unmounts
    };
  }, [onNavigationStateChange]); // Include onNavigationStateChange in dependencies



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
    <div 
      className={`flex flex-col h-full ${className}`}
      style={{
        '--browser-pane-width': `${windowDimensions.width}px`,
        '--browser-pane-height': `${windowDimensions.height}px`,
      } as React.CSSProperties}
    >
      {/* Browser Area */}
      <div 
        className={`flex-1 relative ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '0', // Prevent flex item from growing beyond container
        }}
      >
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
          <div 
            ref={browserViewRef} 
            className="w-full h-full"
            style={{
              width: '100%',
              height: '100%',
              overflow: 'hidden', // Prevent content overflow during resize
              position: 'relative',
            }}
            onMouseDown={handleMouseDown}
          >
            {/* WebContentsView is managed by the main process */}
            {/* The actual WebContentsView content is embedded by the main process */}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowserPane; 