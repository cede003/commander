import React, { useState } from 'react';
import { SidebarProps, Workflow } from '../types';
import Chatbot from './Chatbot';
import logger from '../utils/logger';

const Sidebar: React.FC<SidebarProps> = ({
  currentWorkflows,
  onWorkflowActivate,
  onWorkflowCreate,
  onWorkflowDelete,
  onWorkflowEdit,
  isDarkMode = false
}) => {
  const [activeTab, setActiveTab] = useState<'workflows' | 'chatbot' | 'tests'>('workflows');
  const testElectronAPI = async () => {
    logger.debug('Testing Electron API availability');
    logger.debug('window.electronAPI:', { electronAPI: window.electronAPI });
    logger.debug('Available methods:', { 
      methods: window.electronAPI ? Object.keys(window.electronAPI) : 'No electronAPI' 
    });
    
    if (window.electronAPI?.testIpc) {
      try {
        const result = await window.electronAPI.testIpc();
        logger.info('Test IPC result:', { result });
        alert('Electron API is working!');
      } catch (error) {
        logger.error('Test IPC failed:', { error: String(error) });
        alert('Electron API test failed: ' + error);
      }
    } else {
      logger.error('testIpc not available');
      alert('testIpc not available');
    }
  };
  const handleEditClick = (workflow: Workflow) => {
    onWorkflowEdit(workflow);
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
      {/* Sidebar Tabs */}
      <div className={`flex border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex-1 flex">
          <button
            onClick={() => setActiveTab('workflows')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors duration-200 ${
              activeTab === 'workflows'
                ? isDarkMode
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-blue-600 border-b-2 border-blue-600'
                : isDarkMode
                  ? 'text-gray-400 hover:text-gray-300'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Workflows
          </button>
          <button
            onClick={() => setActiveTab('chatbot')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors duration-200 ${
              activeTab === 'chatbot'
                ? isDarkMode
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-blue-600 border-b-2 border-blue-600'
                : isDarkMode
                  ? 'text-gray-400 hover:text-gray-300'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            AI Assistant
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors duration-200 ${
              activeTab === 'tests'
                ? isDarkMode
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-blue-600 border-b-2 border-blue-600'
                : isDarkMode
                  ? 'text-gray-400 hover:text-gray-300'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tests
          </button>
        </div>
        {activeTab === 'workflows' && (
          <div className="flex items-center px-4">
            <button
              onClick={onWorkflowCreate}
              className={`p-2 rounded-md transition-colors duration-200 ${
                isDarkMode
                  ? 'hover:bg-gray-700 text-gray-300 hover:text-white'
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
              title="Create New Workflow"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'workflows' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
            {currentWorkflows.length === 0 ? (
              <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm">No workflows yet</p>
                <p className="text-xs mt-1">Create your first workflow to get started</p>
              </div>
            ) : (
              currentWorkflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className={`rounded-lg border transition-all duration-200 ${
                    isDarkMode
                      ? workflow.isRunning
                        ? 'border-green-500 bg-gray-700'
                        : 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                      : workflow.isRunning
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="p-4">
                    {/* Workflow Header */}
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`text-sm font-medium truncate ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {workflow.name}
                      </h3>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center space-x-1">
                        {workflow.isRunning ? (
                          <button
                            onClick={() => onWorkflowActivate(workflow.id)}
                            className={`p-1 rounded transition-colors duration-200 ${
                              isDarkMode
                                ? 'hover:bg-gray-600 text-red-400 hover:text-red-300'
                                : 'hover:bg-gray-100 text-red-600 hover:text-red-700'
                            }`}
                            title="Stop Workflow"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => onWorkflowActivate(workflow.id)}
                            className={`p-1 rounded transition-colors duration-200 ${
                              isDarkMode
                                ? 'hover:bg-gray-600 text-green-400 hover:text-green-300'
                                : 'hover:bg-gray-100 text-green-600 hover:text-green-700'
                            }`}
                            title="Run Workflow"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleEditClick(workflow)}
                          className={`p-1 rounded transition-colors duration-200 ${
                            isDarkMode
                              ? 'hover:bg-gray-600 text-gray-400 hover:text-white'
                              : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                          }`}
                          title="Edit Workflow"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onWorkflowDelete(workflow.id)}
                          className={`p-1 rounded transition-colors duration-200 ${
                            isDarkMode
                              ? 'hover:bg-gray-600 text-gray-400 hover:text-red-400'
                              : 'hover:bg-gray-100 text-gray-500 hover:text-red-600'
                          }`}
                          title="Delete Workflow"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Workflow Description */}
                    <p className={`text-xs mb-3 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {workflow.description}
                    </p>

                    {/* Workflow Status */}
                    {workflow.isRunning && (
                      <div className={`flex items-center space-x-1 text-xs mt-2 ${
                        isDarkMode ? 'text-green-400' : 'text-green-600'
                      }`}>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Running</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : activeTab === 'chatbot' ? (
          <div className="flex-1 min-h-0">
            <Chatbot isDarkMode={isDarkMode} />
          </div>
        ) : (
          <div className="flex-1 min-h-0 p-4 space-y-4">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              System Tests & Recovery
            </h3>
            
            {/* Browser Recovery Section */}
            <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <h4 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Browser Recovery
              </h4>
              
              <button
                onClick={async () => {
                  try {
                    if (window.electronAPI?.manualBrowserViewRecovery) {
                      const result = await window.electronAPI.manualBrowserViewRecovery();
                      if (result.success) {
                        alert('Browser recovery completed successfully!');
                      } else {
                        alert(`Browser recovery failed: ${result.error}`);
                      }
                    }
                  } catch (error) {
                    console.error('Browser recovery failed:', error);
                    alert('Browser recovery failed');
                  }
                }}
                className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isDarkMode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                title="Manual coordinated recovery (BrowserView + Python session)"
              >
                Recover Browser
              </button>
            </div>
            
            {/* Python Session Health Section */}
            <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <h4 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Python Session Health
              </h4>
              
              <button
                onClick={async () => {
                  try {
                    if (window.electronAPI?.checkPythonSessionHealth) {
                      const result = await window.electronAPI.checkPythonSessionHealth();
                      if (result.success) {
                        let output = JSON.parse(result.health.output);
                        console.log('Python session health:', output);

                        alert(`Python Session Health:\nReady: ${output.health.is_ready}\nHealthy: ${output.health.is_healthy}`);
                      } else {
                        alert(`Python session health check failed: ${result.error}`);
                      }
                    }
                  } catch (error) {
                    console.error('Health check failed:', error);
                    alert('Health check failed');
                  }
                }}
                className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isDarkMode
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                title="Check Python session health"
              >
                Check Health
              </button>
            </div>
            
            {/* Python Session Restart Section */}
            <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <h4 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Python Session Management
              </h4>
              
              <button
                onClick={async () => {
                  try {
                    if (window.electronAPI?.restartPythonBrowserSession) {
                      const result = await window.electronAPI.restartPythonBrowserSession();
                      if (result.success) {
                        alert('Python browser session restarted successfully!');
                      } else {
                        alert(`Python session restart failed: ${result.error}`);
                      }
                    }
                  } catch (error) {
                    console.error('Python session restart failed:', error);
                    alert('Python session restart failed');
                  }
                }}
                className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isDarkMode
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-orange-600 text-white hover:bg-orange-700'
                }`}
                title="Restart Python browser session"
              >
                Restart Python Session
              </button>
            </div>
            
            {/* System Info Section */}
            <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <h4 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                System Information
              </h4>
              
              <div className={`text-xs space-y-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <div>Platform: {navigator.platform}</div>
                <div>User Agent: {navigator.userAgent.substring(0, 50)}...</div>
                <div>Language: {navigator.language}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
