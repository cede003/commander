import React, { useState, useEffect } from 'react';

const ModalApp: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workflowData, setWorkflowData] = useState('{\n  "steps": []\n}');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string>('');
  const [jsonError, setJsonError] = useState<string>('');

  // Validate JSON whenever workflowData changes
  useEffect(() => {
    if (workflowData.trim()) {
      try {
        JSON.parse(workflowData);
        setJsonError('');
      } catch (error) {
        setJsonError('Invalid JSON format');
      }
    } else {
      setJsonError('');
    }
  }, [workflowData]);

  // Check if we're editing an existing workflow
  useEffect(() => {
    const storedWorkflow = localStorage.getItem('editingWorkflow');
    if (storedWorkflow) {
      try {
        const workflow = JSON.parse(storedWorkflow);
        setTitle(workflow.name);
        setDescription(workflow.description);
        setWorkflowData(workflow.workflowData);
        setIsEditing(true);
        setEditingWorkflowId(workflow.id);
        // Clear the stored workflow
        localStorage.removeItem('editingWorkflow');
      } catch (error) {
        console.error('Error parsing stored workflow:', error);
      }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) {
      return;
    }
    
    // Validate JSON before submission
    if (jsonError) {
      return;
    }
    
    if (title.trim() && description.trim()) {
      setIsSubmitting(true);
      
      // Send the workflow data back to the main window
      if (window.electronAPI?.createWorkflow) {
        window.electronAPI.createWorkflow({
          id: isEditing ? editingWorkflowId : undefined,
          name: title.trim(),
          description: description.trim(),
          workflowData: workflowData,
          isEditing: isEditing
        });
      }
      
      // Close the modal window
      window.close();
    }
  };

  const handleCancel = () => {
    window.close();
  };

  return (
    <div className="h-screen bg-white flex items-center justify-center p-4">
              <div className="bg-white w-full h-full flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Workflow' : 'Create a New Workflow'}
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-6">
          <div className="flex-1 space-y-4">
            {/* Title Input */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter workflow title"
                required
              />
            </div>

            {/* Description Input */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Enter workflow description"
                required
              />
            </div>

            {/* Workflow JSON Input */}
            <div className="flex-1 flex flex-col">
              <label htmlFor="workflowData" className="block text-sm font-medium text-gray-700 mb-2">
                Workflow (JSON)
              </label>
              <textarea
                id="workflowData"
                value={workflowData}
                onChange={(e) => setWorkflowData(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-none ${
                  jsonError ? 'border-red-300' : 'border-gray-300'
                }`}
                style={{ height: '30vh' }}
                placeholder='{"steps": []}'
                required
              />
              {jsonError && (
                <p className="text-red-500 text-xs mt-1">{jsonError}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 mt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !!jsonError}
              className={`px-4 py-2 rounded-md transition-colors ${
                isSubmitting || jsonError
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isEditing ? 'Update Workflow' : 'Create Workflow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalApp; 