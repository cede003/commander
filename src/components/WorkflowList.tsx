import React, { useState } from 'react';
import { Workflow } from '../types';

interface WorkflowListProps {
  workflows: Workflow[];
  onWorkflowActivate: (workflowId: string) => void;
  onWorkflowDelete: (workflowId: string) => void;
  onWorkflowRename: (workflowId: string, newName: string) => void;
  onWorkflowEdit: (workflow: Workflow) => void;
}

const WorkflowList: React.FC<WorkflowListProps> = ({
  workflows,
  onWorkflowActivate,
  onWorkflowDelete,
  onWorkflowRename,
  onWorkflowEdit
}) => {
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  const handleEditStart = (workflow: Workflow) => {
    setEditingWorkflowId(workflow.id);
    setEditName(workflow.name);
  };

  const handleEditSave = () => {
    if (editingWorkflowId && editName.trim()) {
      onWorkflowRename(editingWorkflowId, editName.trim());
      setEditingWorkflowId(null);
      setEditName('');
    }
  };

  const handleEditCancel = () => {
    setEditingWorkflowId(null);
    setEditName('');
  };

  const handleRunWorkflow = (workflowId: string) => {
    onWorkflowActivate(workflowId);
  };

  const handleToggleWorkflow = (workflowId: string) => {
    onWorkflowActivate(workflowId);
  };

  const handleDeleteClick = (workflow: Workflow) => {
    setDeleteConfirmationId(workflow.id);
  };

  const handleDeleteConfirm = (workflowId: string) => {
    onWorkflowDelete(workflowId);
    setDeleteConfirmationId(null);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationId(null);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="p-4">
      {workflows.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm">No workflows yet</p>
          <p className="text-xs text-gray-400 mt-1">Create your first workflow to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className={`group relative rounded-lg border transition-all h-24 ${
                workflow.isActive
                  ? 'bg-blue-50 border-blue-200 shadow-sm'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              {deleteConfirmationId === workflow.id ? (
                // Delete Confirmation UI
                <div className="flex flex-col justify-center items-center h-full p-3">
                  <div className="text-center">
                    <h3 className="font-medium text-gray-900 mb-1">Delete Workflow</h3>
                    <p className="text-xs text-gray-500 mb-1">
                      Deleting <span className="font-semibold" style={{ maxWidth: '120px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'text-bottom' }}>{workflow.name}</span> cannot be undone, are you sure?
                    </p>
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        onClick={handleDeleteCancel}
                        className="px-2 py-1 text-xs text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDeleteConfirm(workflow.id)}
                        className="px-2 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // Normal Workflow Content
                <div className="p-3 h-full">
                  {/* Workflow Content */}
                  <div className="flex items-start justify-between h-full">
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      {editingWorkflowId === workflow.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditSave();
                              if (e.key === 'Escape') handleEditCancel();
                            }}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                          <button
                            onClick={handleEditSave}
                            className="p-1 text-green-600 hover:text-green-700"
                            title="Save"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={handleEditCancel}
                            className="p-1 text-gray-600 hover:text-gray-700"
                            title="Cancel"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 truncate">{workflow.name}</h3>
                            <p className="text-xs text-gray-500 mt-1 truncate">{workflow.description}</p>
                          </div>
                          <div className="flex items-center justify-between mt-auto">
                            <span className="text-xs text-gray-400">
                              Last accessed: {formatDate(workflow.lastAccessed)}
                            </span>
                          </div>
                          {workflow.isActive && (
                            <div className="absolute bottom-2 right-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Active
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {editingWorkflowId !== workflow.id && (
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity self-start">
                        <button
                          onClick={() => handleToggleWorkflow(workflow.id)}
                          className={`p-1 ${
                            workflow.isActive 
                              ? 'text-red-400 hover:text-red-600' 
                              : 'text-gray-400 hover:text-green-600'
                          }`}
                          title={workflow.isActive ? 'Stop Workflow' : 'Run Workflow'}
                        >
                          {workflow.isActive ? (
                            // Stop icon - solid square
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <rect x="6" y="6" width="12" height="12" />
                            </svg>
                          ) : (
                            // Play icon
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => onWorkflowEdit(workflow)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Settings"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEditStart(workflow)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Rename"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(workflow)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkflowList; 