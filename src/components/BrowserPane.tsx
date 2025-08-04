import React, { useState, useEffect, useRef } from 'react';

interface BrowserPaneProps {
  className?: string;
}

const BrowserPane: React.FC<BrowserPaneProps> = ({ className = '' }) => {
  const [currentURL, setCurrentURL] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [canGoBack, setCanGoBack] = useState<boolean>(false);
  const [canGoForward, setCanGoForward] = useState<boolean>(false);
  const [isBrowserReady, setIsBrowserReady] = useState<boolean>(false);

  // Update URL input when currentURL changes
  useEffect(() => {
    setUrlInput(currentURL);
  }, [currentURL]);

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
          setUrlInput(url);
        }
        
        // Get initial navigation state
        if (window.electronAPI?.getBrowserViewCanGoBack) {
          const canGoBackState = await window.electronAPI.getBrowserViewCanGoBack();
          setCanGoBack(canGoBackState);
        }
        
        if (window.electronAPI?.getBrowserViewCanGoForward) {
          const canGoForwardState = await window.electronAPI.getBrowserViewCanGoForward();
          setCanGoForward(canGoForwardState);
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
      setUrlInput(data.url);
      
      // Update navigation state
      if (window.electronAPI?.getBrowserViewCanGoBack) {
        const canGoBackState = await window.electronAPI.getBrowserViewCanGoBack();
        setCanGoBack(canGoBackState);
      }
      
      if (window.electronAPI?.getBrowserViewCanGoForward) {
        const canGoForwardState = await window.electronAPI.getBrowserViewCanGoForward();
        setCanGoForward(canGoForwardState);
      }
    };

    // Set up event listeners
    if (window.electronAPI?.onBrowserViewNavigated) {
      console.log('[DEBUG] Setting up browser view navigated listener');
      window.electronAPI.onBrowserViewNavigated(handleBrowserViewNavigated);
    }

    return () => {
      // Cleanup event listeners if needed
      console.log('[DEBUG] Cleaning up event listeners');
    };
  }, []); // Keep empty dependency array

  // Handle window resize and DevTools events
  useEffect(() => {
    const handleResize = () => {
      if (window.electronAPI?.updateLayout) {
        window.electronAPI.updateLayout();
      }
    };

    const handleDevToolsToggle = () => {
      if (window.electronAPI?.updateLayout) {
        // Small delay to ensure DevTools state is updated
        setTimeout(() => {
          if (window.electronAPI?.updateLayout) {
            window.electronAPI.updateLayout();
          }
        }, 100);
      }
    };

    // Listen for resize events
    window.addEventListener('resize', handleResize);

    // Listen for DevTools events (if available)
    if (window.electronAPI?.onDevToolsToggle) {
      window.electronAPI.onDevToolsToggle(handleDevToolsToggle);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Handle URL form submission
  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!urlInput.trim() || urlInput.trim() === currentURL) {
      return;
    }

    try {
      
      // Add protocol if missing
      let url = urlInput.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }

      if (window.electronAPI?.loadURL) {
        await window.electronAPI.loadURL(url);
        setCurrentURL(url);
        
        // Update navigation state after loading new URL
        if (window.electronAPI?.getBrowserViewCanGoBack) {
          const canGoBackState = await window.electronAPI.getBrowserViewCanGoBack();
          setCanGoBack(canGoBackState);
        }
        
        if (window.electronAPI?.getBrowserViewCanGoForward) {
          const canGoForwardState = await window.electronAPI.getBrowserViewCanGoForward();
          setCanGoForward(canGoForwardState);
        }
      }
    } catch (error) {
      console.error('Failed to load URL:', error);
      // Only set loading to false on error, let the event handle successful loads
    }
  };

  // Handle navigation
  const handleNavigate = async (direction: 'back' | 'forward') => {
    try {
      
      if (window.electronAPI?.navigate) {
        await window.electronAPI.navigate(direction);
        
        // Update current URL after navigation
        if (window.electronAPI?.getCurrentURL) {
          const newURL = await window.electronAPI.getCurrentURL();
          setCurrentURL(newURL);
        }
        
        // Update navigation state
        if (window.electronAPI?.getBrowserViewCanGoBack) {
          const canGoBackState = await window.electronAPI.getBrowserViewCanGoBack();
          setCanGoBack(canGoBackState);
        }
        
        if (window.electronAPI?.getBrowserViewCanGoForward) {
          const canGoForwardState = await window.electronAPI.getBrowserViewCanGoForward();
          setCanGoForward(canGoForwardState);
        }
      }
    } catch (error) {
      console.error(`Failed to navigate ${direction}:`, error);
    }
  };

  // Handle back button
  const handleGoBack = () => {
    if (canGoBack) {
      handleNavigate('back');
    }
  };

  // Handle forward button
  const handleGoForward = () => {
    if (canGoForward) {
      handleNavigate('forward');
    }
  };

  // Handle reload
  const handleReload = async () => {
    try {
      if (window.electronAPI?.loadURL && currentURL) {
        await window.electronAPI.loadURL(currentURL);
      }
    } catch (error) {
      console.error('Failed to reload:', error);
    }
  };

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
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-4 h-16 flex items-center space-x-2">
        {/* Navigation Buttons */}
        <button
          onClick={handleGoBack}
          disabled={!canGoBack}
          className={`p-2 rounded transition-colors ${
            canGoBack 
              ? 'hover:bg-gray-100 text-gray-700' 
              : 'text-gray-400 cursor-not-allowed'
          }`}
          title="Go Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button
          onClick={handleGoForward}
          disabled={!canGoForward}
          className={`p-2 rounded transition-colors ${
            canGoForward 
              ? 'hover:bg-gray-100 text-gray-700' 
              : 'text-gray-400 cursor-not-allowed'
          }`}
          title="Go Forward"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        
        <button
          onClick={handleReload}
          className="p-2 rounded hover:bg-gray-100 text-gray-700 transition-colors"
          title="Reload"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        {/* Loading Indicator */}
        

        {/* URL Input */}
        <form onSubmit={handleUrlSubmit} className="flex-1 ml-4 flex">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="Enter URL or search..."
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Go
          </button>
        </form>
      </div>

      {/* Browser Area */}
      <div className="flex-1 relative bg-gray-50">
        {!isBrowserReady ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-700 mb-2">Initializing Browser...</div>
              <div className="text-sm text-gray-500">Loading WebContentsView</div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full">
            {/* WebContentsView is managed by the main process */}
            {/* This div serves as a placeholder/background */}
            <div 
              className="w-full h-full bg-white"
              onMouseDown={handleMouseDown}
            >
              {/* The actual WebContentsView content is embedded by the main process */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowserPane; 