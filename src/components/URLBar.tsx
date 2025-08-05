import React, { useState, useEffect } from 'react';
import { URLBarProps } from '../types';

const URLBar: React.FC<URLBarProps> = ({
  currentURL,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onReload,
  onToggleSidebar,
  isSidebarVisible,
  isDarkMode = false
}) => {
  const [urlInput, setUrlInput] = useState(currentURL);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setUrlInput(currentURL);
  }, [currentURL]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsLoading(true);
    try {
      const input = urlInput.trim();
      
      // Check if it's a valid URL
      if (isURL(input)) {
        // It's a valid URL, load it directly
        let url = input;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = `https://${url}`;
        }
        
        if (window.electronAPI?.loadURL) {
          await window.electronAPI.loadURL(url);
        }
      } else {
        // It's not a URL, treat it as a search query
        handleSearch(input);
      }
      
      // Force focus the BrowserView to ensure it's visible and active
      if (window.electronAPI?.focusBrowserView) {
        setTimeout(() => {
          window.electronAPI?.focusBrowserView?.();
        }, 200);
      }
    } catch (error) {
      console.error('Failed to load URL:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    if (window.electronAPI?.loadURL) {
      window.electronAPI.loadURL(searchUrl);
    }
  };

  const isURL = (str: string) => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  const handleUrlInputChange = (value: string) => {
    setUrlInput(value);
  };

  const handleUrlInputBlur = () => {
    if (urlInput.trim() && !isURL(urlInput.trim())) {
      handleSearch(urlInput.trim());
    }
  };

  return (
    <div className={`h-20 px-4 py-3 border-b transition-colors duration-200 ${
      isDarkMode 
        ? 'bg-gray-800 border-gray-700 text-white' 
        : 'bg-white border-gray-200 text-gray-900'
    }`}>
      <div className="flex items-center space-x-3 h-full">
        {/* Sidebar Toggle Button */}
        <button
          onClick={onToggleSidebar}
          className={`p-2 rounded-md transition-colors duration-200 ${
            isDarkMode
              ? 'hover:bg-gray-700 text-gray-300 hover:text-white'
              : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
          }`}
          title={isSidebarVisible ? 'Hide Sidebar' : 'Show Sidebar'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Navigation Buttons */}
        <div className="flex items-center space-x-1">
          <button
            onClick={onGoBack}
            disabled={!canGoBack}
            className={`p-2 rounded-md transition-colors duration-200 ${
              isDarkMode
                ? canGoBack 
                  ? 'hover:bg-gray-700 text-gray-300 hover:text-white' 
                  : 'text-gray-600 cursor-not-allowed'
                : canGoBack 
                  ? 'hover:bg-gray-100 text-gray-600 hover:text-gray-900' 
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
            className={`p-2 rounded-md transition-colors duration-200 ${
              isDarkMode
                ? canGoForward 
                  ? 'hover:bg-gray-700 text-gray-300 hover:text-white' 
                  : 'text-gray-600 cursor-not-allowed'
                : canGoForward 
                  ? 'hover:bg-gray-100 text-gray-600 hover:text-gray-900' 
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
            className={`p-2 rounded-md transition-colors duration-200 ${
              isDarkMode
                ? 'hover:bg-gray-700 text-gray-300 hover:text-white'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
            title="Reload"
          >
            <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* URL Input */}
        <form onSubmit={handleSubmit} className="flex-1">
          <div className={`relative rounded-md shadow-sm ${
            isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'
          }`}>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => handleUrlInputChange(e.target.value)}
              onBlur={handleUrlInputBlur}
              className={`block w-full px-3 py-2 pr-10 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              placeholder="Search Google or enter a URL"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className={`w-4 h-4 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </form>

        {/* Dark Mode Indicator */}
        <div className={`flex items-center px-2 py-1 rounded-md text-xs transition-colors duration-200 ${
          isDarkMode 
            ? 'bg-gray-700 text-gray-300' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          {isDarkMode ? (
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m6.01-6.01l.707-.707m12.728 12.728l.707.707M6.01 6.01l-.707-.707m12.728-12.728l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
          <span className="hidden sm:inline">
            {isDarkMode ? 'Dark' : 'Light'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default URLBar; 