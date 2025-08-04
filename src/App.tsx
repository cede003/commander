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
      isActive: true,
      createdAt: new Date(),
      lastAccessed: new Date()
    }
  ]);

  const handleWorkflowActivate = (workflowId: string) => {
    setCurrentWorkflows(prev => prev.map(workflow => ({
      ...workflow,
      isActive: workflow.id === workflowId,
      lastAccessed: workflow.id === workflowId ? new Date() : workflow.lastAccessed
    })));
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
      <div className="flex-1">
        <BrowserPane />
      </div>
    </div>
  );
}

export default App; 