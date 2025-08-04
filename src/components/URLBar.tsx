import React, { useState, useEffect } from 'react';

interface URLBarProps {
  currentURL: string;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onToggleSidebar?: () => void;
  isSidebarVisible: boolean;
}

const URLBar: React.FC<URLBarProps> = ({
  currentURL,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onReload,
  onToggleSidebar,
  isSidebarVisible
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [isUserTyping, setIsUserTyping] = useState<boolean>(false);

  // Update input when currentURL changes (browser navigation)
  useEffect(() => {
    if (!isUserTyping) {
      setInputValue(currentURL);
    }
  }, [currentURL, isUserTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setIsUserTyping(true);
  };

  const handleInputFocus = () => {
    setIsUserTyping(true);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setIsUserTyping(false);
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
      e.currentTarget.blur();
    }
  };

  const handleSubmit = () => {
    if (!inputValue.trim()) return;

    const url = inputValue.trim();
    
    // Detect if input is URL or search query
    const urlRegex = /^(https?:\/\/)?[\w.-]+\.\w/;
    const isUrl = urlRegex.test(url);
    
    let finalURL: string;
    
    if (isUrl) {
      // If URL: prepend https:// if missing
      finalURL = url.startsWith('http://') || url.startsWith('https://') 
        ? url 
        : `https://${url}`;
    } else {
      // Else: generate Google search URL
      finalURL = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    }

    // Send URL to Electron main process
    if (window.electronAPI?.loadURL) {
      window.electronAPI.loadURL(finalURL);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 shadow-sm">
      {/* Left side - Hamburger menu */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onToggleSidebar?.()}
          className="p-2 rounded hover:bg-gray-100 text-gray-600 transition-colors"
          title={isSidebarVisible ? 'Hide Sidebar' : 'Show Sidebar'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Center - Navigation and URL */}
      <div className="flex-1 flex items-center justify-center w-3/5">
        <div className="flex items-center space-x-2">
          {/* Navigation Buttons */}
          <button
            onClick={onGoBack}
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
            onClick={onGoForward}
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
            onClick={onReload}
            className="p-2 rounded hover:bg-gray-100 text-gray-700 transition-colors"
            title="Reload"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* URL Input */}
          <div className="flex-1 flex min-w-0">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-w-0"
              style={{ minWidth: '60vw' }}
              placeholder="Enter URL or search terms..."
            />
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Go
            </button>
          </div>
        </div>
      </div>

      {/* Right side - Empty for balance */}
      <div className="w-32"></div>
    </div>
  );
};

export default URLBar; 