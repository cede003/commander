import React, { useState } from 'react';
import BrowserInterface from './components/BrowserInterface';
import Sidebar from './components/Sidebar';
import { Tab } from './types';

function App() {
  // Initialize with a working external URL that should load properly in BrowserView
  const [currentTabs, setCurrentTabs] = useState<Tab[]>([
    { id: '1', url: 'https://example.com', title: 'Commander Browser', isActive: true }
  ]);

  const [closedTabs, setClosedTabs] = useState<Tab[]>([]);

  const handleTabUpdate = (tabId: string, updates: Partial<Tab>) => {
    setCurrentTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, ...updates } : tab
    ));
  };

  const handleNewTab = () => {
    const newTab: Tab = {
      id: Date.now().toString(),
      url: 'https://example.com',
      title: 'New Tab',
      isActive: false
    };
    setCurrentTabs(prev => prev.map(tab => ({ ...tab, isActive: false })).concat(newTab));
  };

  const handleTabActivate = (tabId: string) => {
    setCurrentTabs(prev => prev.map(tab => ({ 
      ...tab, 
      isActive: tab.id === tabId 
    })));
  };

  const handleTabClose = (tabId: string) => {
    const tabToClose = currentTabs.find(tab => tab.id === tabId);
    if (tabToClose) {
      setClosedTabs(prev => [tabToClose, ...prev]);
    }
    
    const remainingTabs = currentTabs.filter(tab => tab.id !== tabId);
    
    // If we're closing the active tab, activate the last remaining tab
    if (remainingTabs.length > 0 && tabToClose?.isActive) {
      const lastTab = remainingTabs[remainingTabs.length - 1];
      lastTab.isActive = true;
    }
    
    setCurrentTabs(remainingTabs);
  };

  const handleTabReopen = (tabId: string) => {
    const tabToReopen = closedTabs.find(tab => tab.id === tabId);
    if (tabToReopen) {
      setCurrentTabs(prev => prev.map(tab => ({ ...tab, isActive: false })).concat({
        ...tabToReopen,
        isActive: true
      }));
      setClosedTabs(prev => prev.filter(tab => tab.id !== tabId));
    }
  };

  const activeTab = currentTabs.find(tab => tab.isActive) || currentTabs[0];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar
        currentTabs={currentTabs}
        closedTabs={closedTabs}
        onTabActivate={handleTabActivate}
        onTabClose={handleTabClose}
        onTabReopen={handleTabReopen}
      />
      
      {/* Main Browser Interface */}
      <div className="flex-1 flex flex-col">
        {activeTab && (
          <BrowserInterface
            activeTab={activeTab}
            onTabUpdate={handleTabUpdate}
            onNewTab={handleNewTab}
          />
        )}
      </div>
    </div>
  );
}

export default App; 