import React, { useRef, useState } from 'react';
import BrowserViewComponent from './BrowserView';
import { BrowserInterfaceProps } from '../types';

const BrowserInterface: React.FC<BrowserInterfaceProps> = ({
  browserState,
  onNavigate,
  onGoBack,
  onGoForward,
  onReload
}) => {
  const [urlInput, setUrlInput] = useState(browserState.url);
  const browserViewRef = useRef<any>(null);

  // Update URL input when browser state changes
  React.useEffect(() => {
    setUrlInput(browserState.url);
  }, [browserState.url]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim() !== browserState.url) {
      onNavigate(urlInput.trim());
    }
  };

  const handleGoBack = () => {
    console.log(`[BUTTON DEBUG] Back button clicked`);
    console.log(`[BUTTON DEBUG] Current browser state:`, browserState);
    onGoBack();
    // The BrowserView will handle the actual navigation
    if (browserViewRef.current?.goBack) {
      browserViewRef.current.goBack();
    }
  };

  const handleGoForward = () => {
    console.log(`[BUTTON DEBUG] Forward button clicked`);
    console.log(`[BUTTON DEBUG] Current browser state:`, browserState);
    onGoForward();
    // The BrowserView will handle the actual navigation
    if (browserViewRef.current?.goForward) {
      browserViewRef.current.goForward();
    }
  };

  const handleReload = () => {
    if (browserViewRef.current?.reload) {
      browserViewRef.current.reload();
    }
    onReload();
  };

  const handleNavigate = (url: string) => {
    onNavigate(url);
  };

  const handleTitleChange = (title: string) => {
    // Title changes are handled by the BrowserView component
    console.log(`[TITLE DEBUG] Title changed to: ${title}`);
  };

  const handleLoad = (event: any) => {
    // Navigation state is handled by the BrowserView component
    console.log(`[LOAD DEBUG] Browser loaded`);
  };

  const handleLoadingStateChange = (isLoading: boolean) => {
    // Loading state is handled by the BrowserView component
    console.log(`[LOADING DEBUG] Loading state changed: ${isLoading}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Browser Toolbar */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center space-x-2">
          {/* Navigation Buttons */}
          <button
            onClick={handleGoBack}
            disabled={!browserState.canGoBack}
            className={`p-2 rounded ${browserState.canGoBack ? 'hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'}`}
            title="Go Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={handleGoForward}
            disabled={!browserState.canGoForward}
            className={`p-2 rounded ${browserState.canGoForward ? 'hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'}`}
            title="Go Forward"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          <button
            onClick={handleReload}
            className="p-2 rounded hover:bg-gray-100"
            title="Reload"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Loading Indicator */}
          {browserState.isLoading && (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* URL Bar */}
          <form onSubmit={handleUrlSubmit} className="flex-1">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter URL or search..."
            />
          </form>
        </div>
      </div>

      {/* Browser Content */}
      <div className="flex-1 relative">
        <BrowserViewComponent
          ref={browserViewRef}
          url={browserState.url}
          onNavigate={handleNavigate}
          onTitleChange={handleTitleChange}
          onContextMenu={(event) => {
            // Context menu is handled by the BrowserView component
            console.log(`[CONTEXT DEBUG] Context menu event:`, event);
          }}
          onLoad={handleLoad}
          onLoadingStateChange={handleLoadingStateChange}
        />
      </div>
    </div>
  );
};

export default BrowserInterface; 