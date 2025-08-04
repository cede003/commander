import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import BrowserPane from './components/BrowserPane';
import URLBar from './components/URLBar';
import { Workflow } from './types';

function App() {
  const [currentWorkflows, setCurrentWorkflows] = useState<Workflow[]>([
    {
      id: '1',
      name: 'Default Workflow',
      description: 'Default workflow for testing',
      url: 'https://www.google.com',
      workflowData: '{"steps": []}',
      isActive: false,
      createdAt: new Date(),
      lastAccessed: new Date()
    }
  ]);

  const [currentURL, setCurrentURL] = useState<string>('');
  const [canGoBack, setCanGoBack] = useState<boolean>(false);
  const [canGoForward, setCanGoForward] = useState<boolean>(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(true);
  const workflowListenerRef = useRef<boolean>(false);

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
    if (window.electronAPI?.updateSidebarVisibility) {
      window.electronAPI.updateSidebarVisibility(!isSidebarVisible);
    }
  };

  const handleGoBack = async () => {
    if (window.electronAPI?.navigate) {
      await window.electronAPI.navigate('back');
    }
  };

  const handleGoForward = async () => {
    if (window.electronAPI?.navigate) {
      await window.electronAPI.navigate('forward');
    }
  };

  const handleReload = async () => {
    if (window.electronAPI?.loadURL && currentURL) {
      await window.electronAPI.loadURL(currentURL);
    }
  };

  const handleURLChange = (url: string) => {
    console.log('[DEBUG] Browser navigated to:', url);
    setCurrentURL(url);
  };

  const handleNavigationStateChange = (canGoBack: boolean, canGoForward: boolean) => {
    setCanGoBack(canGoBack);
    setCanGoForward(canGoForward);
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
    if (window.electronAPI?.openCreateWorkflowModal) {
      window.electronAPI.openCreateWorkflowModal();
    }
  };

  const handleWorkflowEdit = (workflow: Workflow) => {
    if (window.electronAPI?.openCreateWorkflowModal) {
      // Store the workflow data to be edited
      localStorage.setItem('editingWorkflow', JSON.stringify(workflow));
      window.electronAPI.openCreateWorkflowModal();
    }
  };

  // Listen for workflow creation from modal
  useEffect(() => {
    // Clean up any existing listeners first
    if (window.electronAPI?.removeWorkflowCreatedListener) {
      window.electronAPI.removeWorkflowCreatedListener();
    }

    const handleWorkflowCreated = (workflow: { id?: string; name: string; description: string; workflowData: string; isEditing?: boolean }) => {
      if (workflow.isEditing && workflow.id) {
        // Update existing workflow
        setCurrentWorkflows(prev => prev.map(w => 
          w.id === workflow.id ? {
            ...w,
            name: workflow.name,
            description: workflow.description,
            workflowData: workflow.workflowData,
            lastAccessed: new Date()
          } : w
        ));
      } else {
        // Create new workflow
        const workflowId = Date.now().toString();
        
        const newWorkflow: Workflow = {
          id: workflowId,
          name: workflow.name,
          description: workflow.description,
          url: 'https://www.google.com',
          workflowData: workflow.workflowData,
          isActive: false,
          createdAt: new Date(),
          lastAccessed: new Date()
        };
        
        setCurrentWorkflows(prev => {
          // Check if this workflow already exists (by name and description)
          const existingWorkflow = prev.find(w => 
            w.name === newWorkflow.name && 
            w.description === newWorkflow.description
          );
          
          if (existingWorkflow) {
            return prev;
          }
          
          return [...prev, newWorkflow];
        });
      }
    };

    // Listen for workflow-created event
    if (window.electronAPI?.onWorkflowCreated) {
      window.electronAPI.onWorkflowCreated(handleWorkflowCreated);
      workflowListenerRef.current = true;
    }

    return () => {
      // Clean up the event listener when component unmounts
      if (window.electronAPI?.removeWorkflowCreatedListener) {
        window.electronAPI.removeWorkflowCreatedListener();
      }
      workflowListenerRef.current = false;
    };
  }, []);

  const handleWorkflowDelete = (workflowId: string) => {
    setCurrentWorkflows(prev => prev.filter(w => w.id !== workflowId));
  };

  const handleWorkflowRename = (workflowId: string, newName: string) => {
    setCurrentWorkflows(prev => prev.map(workflow => 
      workflow.id === workflowId ? { ...workflow, name: newName } : workflow
    ));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* URL Bar - Top level component */}
      <URLBar
        currentURL={currentURL}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onReload={handleReload}
        onToggleSidebar={toggleSidebar}
        isSidebarVisible={isSidebarVisible}
      />

      {/* Main Content Area */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <div className={`bg-white shadow-lg transition-all duration-300 ease-in-out ${
          isSidebarVisible ? 'w-80 border-r border-gray-200' : 'w-0'
        }`}>
          {isSidebarVisible && (
            <div className="relative h-full">
              <Sidebar
                currentWorkflows={currentWorkflows}
                onWorkflowActivate={handleWorkflowActivate}
                onWorkflowCreate={handleWorkflowCreate}
                onWorkflowDelete={handleWorkflowDelete}
                onWorkflowRename={handleWorkflowRename}
                onWorkflowEdit={handleWorkflowEdit}
              />
            </div>
          )}
        </div>

        {/* Browser Pane */}
        <div className="flex-1">
          <BrowserPane
            className="h-full"
            isSidebarVisible={isSidebarVisible}
            onURLChange={handleURLChange}
            onNavigationStateChange={handleNavigationStateChange}
          />
        </div>
      </div>


    </div>
  );
}

export default App; 