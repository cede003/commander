import React, { useState, useEffect } from 'react';
import BrowserInterface from './components/BrowserInterface';
import Sidebar from './components/Sidebar';
import { Workflow, BrowserState } from './types';

function App() {
  // Initialize with Google as the default home page
  const [browserState, setBrowserState] = useState<BrowserState>({
    url: 'https://www.google.com',
    title: 'Commander Browser',
    canGoBack: false,
    canGoForward: false,
    isLoading: false,
    history: ['https://www.google.com'],
    currentHistoryIndex: 0
  });

  const [currentWorkflows, setCurrentWorkflows] = useState<Workflow[]>([
    {
      id: '1',
      name: 'Research Workflow',
      description: 'Default workflow for web research',
      url: 'https://www.google.com',
      isActive: true,
      createdAt: new Date(),
      lastAccessed: new Date()
    }
  ]);

  // History management functions
  const addToHistory = (url: string) => {
    setBrowserState(prev => {
      // Don't add the same URL twice in a row
      if (prev.history[prev.currentHistoryIndex] === url) {
        console.log(`[HISTORY DEBUG] Skipping duplicate URL: ${url}`);
        return prev;
      }
      
      // Remove any URLs after current index (when navigating to a new URL)
      const newHistory = prev.history.slice(0, prev.currentHistoryIndex + 1);
      newHistory.push(url);
      console.log(`[HISTORY DEBUG] Added URL: ${url}`);
      console.log(`[HISTORY DEBUG] New history:`, newHistory);
      console.log(`[HISTORY DEBUG] Current index: ${newHistory.length - 1}`);
      return {
        ...prev,
        url: url,
        history: newHistory,
        currentHistoryIndex: newHistory.length - 1,
        canGoBack: newHistory.length > 1,
        canGoForward: false
      };
    });
  };

  const goBack = () => {
    console.log(`[BACK DEBUG] Attempting to go back`);
    setBrowserState(prev => {
      console.log(`[BACK DEBUG] Current state:`, {
        currentIndex: prev.currentHistoryIndex,
        historyLength: prev.history.length,
        canGoBack: prev.canGoBack,
        currentUrl: prev.url
      });
      
      if (prev.currentHistoryIndex > 0) {
        const newIndex = prev.currentHistoryIndex - 1;
        const newUrl = prev.history[newIndex];
        console.log(`[BACK DEBUG] Going BACK to index ${newIndex}: ${newUrl}`);
        return {
          ...prev,
          url: newUrl,
          currentHistoryIndex: newIndex,
          canGoBack: newIndex > 0,
          canGoForward: newIndex < prev.history.length - 1
        };
      } else {
        console.log(`[BACK DEBUG] Cannot go back. Current index: ${prev.currentHistoryIndex}, History length: ${prev.history.length}`);
        return prev;
      }
    });
  };

  const goForward = () => {
    console.log(`[FORWARD DEBUG] Attempting to go forward`);
    setBrowserState(prev => {
      console.log(`[FORWARD DEBUG] Current state:`, {
        currentIndex: prev.currentHistoryIndex,
        historyLength: prev.history.length,
        canGoForward: prev.canGoForward,
        currentUrl: prev.url
      });
      
      if (prev.currentHistoryIndex < prev.history.length - 1) {
        const newIndex = prev.currentHistoryIndex + 1;
        const newUrl = prev.history[newIndex];
        console.log(`[FORWARD DEBUG] Going FORWARD to index ${newIndex}: ${newUrl}`);
        return {
          ...prev,
          url: newUrl,
          currentHistoryIndex: newIndex,
          canGoBack: newIndex > 0,
          canGoForward: newIndex < prev.history.length - 1
        };
      } else {
        console.log(`[FORWARD DEBUG] Cannot go forward. Current index: ${prev.currentHistoryIndex}, History length: ${prev.history.length}`);
        return prev;
      }
    });
  };

  const handleNavigate = (url: string) => {
    console.log(`[NAVIGATION DEBUG] Navigating to: ${url}`);
    addToHistory(url);
  };

  const handleGoBack = () => {
    goBack();
  };

  const handleGoForward = () => {
    goForward();
  };

  const handleReload = () => {
    console.log(`[RELOAD DEBUG] Reloading current page`);
    // The actual reload is handled by the BrowserView component
  };

  const handleWorkflowActivate = (workflowId: string) => {
    setCurrentWorkflows(prev => prev.map(workflow => ({
      ...workflow,
      isActive: workflow.id === workflowId,
      lastAccessed: workflow.id === workflowId ? new Date() : workflow.lastAccessed
    })));
    
    const workflow = currentWorkflows.find(w => w.id === workflowId);
    if (workflow) {
      setBrowserState(prev => ({
        ...prev,
        url: workflow.url,
        title: workflow.name
      }));
    }
  };

  const handleWorkflowCreate = () => {
    const newWorkflow: Workflow = {
      id: Date.now().toString(),
      name: `Workflow ${currentWorkflows.length + 1}`,
      description: 'New workflow',
      url: 'https://www.google.com',
      isActive: false,
      createdAt: new Date(),
      lastAccessed: new Date()
    };
    
    setCurrentWorkflows(prev => [...prev, newWorkflow]);
  };

  const handleWorkflowDelete = (workflowId: string) => {
    setCurrentWorkflows(prev => prev.filter(w => w.id !== workflowId));
  };

  const handleWorkflowRename = (workflowId: string, newName: string) => {
    setCurrentWorkflows(prev => prev.map(workflow => 
      workflow.id === workflowId ? { ...workflow, name: newName } : workflow
    ));
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-lg pt-8">
        <Sidebar
          currentWorkflows={currentWorkflows}
          onWorkflowActivate={handleWorkflowActivate}
          onWorkflowCreate={handleWorkflowCreate}
          onWorkflowDelete={handleWorkflowDelete}
          onWorkflowRename={handleWorkflowRename}
        />
      </div>

      {/* Main Browser Area */}
      <div className="flex-1 flex flex-col">
        <BrowserInterface
          browserState={browserState}
          onNavigate={handleNavigate}
          onGoBack={handleGoBack}
          onGoForward={handleGoForward}
          onReload={handleReload}
        />
      </div>
    </div>
  );
}

export default App; 