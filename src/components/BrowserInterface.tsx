import React, { useState, useRef, useEffect } from 'react';
import { BrowserInterfaceProps } from '../types';
import BrowserViewComponent from './BrowserView';

const BrowserInterface: React.FC<BrowserInterfaceProps> = ({
  activeTab,
  onTabUpdate,
  onNewTab
}) => {
  const [url, setUrl] = useState(activeTab.url);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const browserViewRef = useRef<any>(null);

  useEffect(() => {
    setUrl(activeTab.url);
  }, [activeTab.url]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let processedUrl = url;
    
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      processedUrl = `https://${url}`;
    }
    
    onTabUpdate(activeTab.id, { url: processedUrl });
  };

  const handleGoBack = () => {
    if (browserViewRef.current && canGoBack) {
      try {
        browserViewRef.current.goBack();
      } catch (error) {
        console.error('Error going back:', error);
      }
    }
  };

  const handleGoForward = () => {
    if (browserViewRef.current && canGoForward) {
      try {
        browserViewRef.current.goForward();
      } catch (error) {
        console.error('Error going forward:', error);
      }
    }
  };

  const handleNavigate = (newUrl: string) => {
    onTabUpdate(activeTab.id, { url: newUrl });
  };

  const handleTitleChange = (title: string) => {
    onTabUpdate(activeTab.id, { title });
  };

  const handleContextMenu = (event: any) => {
    // The electron-context-menu will handle the context menu
    // We don't need to prevent default here as we want the context menu to show
  };

  const handleBrowserViewLoad = (event: any) => {
    const browserView = event.target;
    setCanGoBack(browserView.canGoBack());
    setCanGoForward(browserView.canGoForward());
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* URL Bar */}
      <div className="flex items-center p-4 border-b border-gray-200 bg-gray-50">
        {/* Navigation Buttons */}
        <div className="flex items-center space-x-2 mr-4">
          <button
            onClick={handleGoBack}
            disabled={!canGoBack}
            className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Go Back"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleGoForward}
            disabled={!canGoForward}
            className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Go Forward"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* URL Input */}
        <form onSubmit={handleUrlSubmit} className="flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter URL or search..."
          />
        </form>

        {/* New Tab Button */}
        <button
          onClick={onNewTab}
          className="ml-4 p-2 rounded hover:bg-gray-200"
          title="New Tab"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* BrowserView Container */}
      <div className="flex-1 relative">
        <BrowserViewComponent
          ref={browserViewRef}
          url={activeTab.url}
          onNavigate={handleNavigate}
          onTitleChange={handleTitleChange}
          onContextMenu={handleContextMenu}
          onLoad={handleBrowserViewLoad}
        />
      </div>
    </div>
  );
};

export default BrowserInterface; 