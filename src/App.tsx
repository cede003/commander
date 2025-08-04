import React, { useState, useEffect } from 'react';
import BrowserPane from './components/BrowserPane';
import Sidebar from './components/Sidebar';
import { Workflow } from './types';

function App() {
  const [currentWorkflows, setCurrentWorkflows] = useState<Workflow[]>([
    {
      id: '1',
      name: 'Research Workflow',
      description: 'Default workflow for web research',
      url: 'https://www.google.com',
      isActive: false,
      createdAt: new Date(),
      lastAccessed: new Date()
    }
  ]);

  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  const handleWorkflowActivate = (workflowId: string) => {
    setCurrentWorkflows(prev => prev.map(workflow => {
      if (workflow.id === workflowId) {
        // Toggle the active state for the clicked workflow
        return {
          ...workflow,
          isActive: !workflow.isActive,
          lastAccessed: new Date()
        };
      } else {
        // Deactivate all other workflows
        return {
          ...workflow,
          isActive: false
        };
      }
    }));
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
      <div className={`bg-white shadow-lg pt-8 transition-all duration-300 ease-in-out ${
        isSidebarVisible ? 'w-80' : 'w-0'
      }`}>
        {isSidebarVisible && (
          <div className="relative h-full">
            <button
              onClick={toggleSidebar}
              className="absolute right-2 top-4 z-50"
              title="Hide Sidebar"
            >
              <span className="text-black text-xl">
                V
              </span>
            </button>
            <Sidebar
              currentWorkflows={currentWorkflows}
              onWorkflowActivate={handleWorkflowActivate}
              onWorkflowCreate={handleWorkflowCreate}
              onWorkflowDelete={handleWorkflowDelete}
              onWorkflowRename={handleWorkflowRename}
            />
          </div>
        )}
      </div>

      {/* Toggle Button - Show when sidebar is hidden */}
      {!isSidebarVisible && (
        <div className="relative">
          <button
            onClick={toggleSidebar}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 z-50"
            title="Show Sidebar"
          >
            <span className="text-black text-xl">
              &gt;
            </span>
          </button>
        </div>
      )}

      {/* Main Browser Area */}
      <div className="flex-1">
        <BrowserPane />
      </div>
    </div>
  );
}

export default App; 