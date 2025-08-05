import React, { useState } from 'react';
import { SidebarProps, Workflow } from '../types';

const Sidebar: React.FC<SidebarProps> = ({
  currentWorkflows,
  onWorkflowActivate,
  onWorkflowCreate,
  onWorkflowDelete,
  onWorkflowRename,
  onWorkflowEdit,
  isDarkMode = false
}) => {
  const handleEditClick = (workflow: Workflow) => {
    onWorkflowEdit(workflow);
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Workflows
          </h2>
          <button
            onClick={onWorkflowCreate}
            className={`p-2 rounded-md transition-colors duration-200 ${
              isDarkMode
                ? 'hover:bg-gray-700 text-gray-300 hover:text-white'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
            title="Create New Workflow"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Workflow List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
    </div>
  );
};

export default Sidebar;
