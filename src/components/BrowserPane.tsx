import React, { useState, useEffect, useRef } from 'react';
import { BrowserPaneProps } from '../types';
import logger from '../utils/logger';

const BrowserPane: React.FC<BrowserPaneProps> = ({ 
  className = '', 
  onURLChange,
  onNavigationStateChange,
}) => {
  const [currentURL, setCurrentURL] = useState<string>('');
  const [isBrowserReady, setIsBrowserReady] = useState<boolean>(false);
  const [browserHealth, setBrowserHealth] = useState<{ isHealthy: boolean; failedChecks: number; isRecovering: boolean }>({ 
    isHealthy: true, 
    failedChecks: 0, 
    isRecovering: false 
  });
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
        logger.info('Starting browser initialization...');
        
        // Initialize BrowserView with default URL
        if (window.electronAPI?.initializeBrowserView) {
          logger.debug('Calling initializeBrowserView...');
          await window.electronAPI.initializeBrowserView();
          logger.debug('initializeBrowserView completed');
        } else {
          logger.warn('initializeBrowserView not available');
        }
        
        // Get current URL from main process
        if (window.electronAPI?.getCurrentURL) {
          logger.debug('Getting current URL...');
          const url = await window.electronAPI.getCurrentURL();
          logger.debug('Current URL:', url);
          setCurrentURL(url);
        } else {
          logger.warn('getCurrentURL not available');
        }
        
        // Mark browser as ready
        logger.info('Browser initialization complete');
        setIsBrowserReady(true);
      } catch (error) {
        logger.error('Failed to initialize browser:', error);
        // Still mark as ready even if there's an error to show the interface
        setIsBrowserReady(true);
      }
    };

    // Only log and initialize if this is the first time
    if (!hasInitialized.current) {
      logger.debug('Browser initialization effect running for the first time');
      hasInitialized.current = true;
      initializeBrowser();
    } else {
              logger.debug('Browser already initialized, skipping initialization');
    }
  }, []); // Empty dependency array - only runs once on mount

  // Monitor BrowserView health
  useEffect(() => {
    const checkHealth = async () => {
      if (window.electronAPI?.getBrowserViewHealth) {
        try {
          const health = await window.electronAPI.getBrowserViewHealth();
          setBrowserHealth(health);
        } catch (error) {
          logger.error('Failed to check BrowserView health:', error);
        }
      }
    };

    // Check health immediately
    checkHealth();

    // Check health every 30 seconds
    const healthInterval = setInterval(checkHealth, 30000);

    return () => clearInterval(healthInterval);
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
      if (window.electronAPI?.removeBrowserViewNavigatedListener) {
        window.electronAPI.removeBrowserViewNavigatedListener();
      }
    };
  }, []); // Remove onNavigationStateChange from dependencies to prevent unnecessary re-runs



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
        className="flex-1 relative bg-white"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '0', // Prevent flex item from growing beyond container
        }}
      >

        
        {/* Recovery in Progress Indicator */}
        {browserHealth.isRecovering && (
          <div className="absolute top-2 left-2 z-10 bg-blue-100 border border-blue-300 rounded-lg p-3 shadow-lg">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-800">
                Recovering Browser...
              </span>
            </div>
          </div>
        )}

        {!isBrowserReady ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-semibold mb-2 text-gray-700">
                Initializing Browser...
              </div>
              <div className="text-sm text-gray-500">
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