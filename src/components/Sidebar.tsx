import React from "react";
import { SidebarProps } from "../types";
import WorkflowList from "./WorkflowList";
import Chatbot from "./Chatbot";

const Sidebar: React.FC<SidebarProps> = ({
  currentWorkflows,
  onWorkflowActivate,
  onWorkflowCreate,
  onWorkflowDelete,
  onWorkflowRename
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Upper Section - Workflow Management */}
      <div className="flex-1 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Workflows</h2>
          <button
            onClick={onWorkflowCreate}
            className="p-2 rounded hover:bg-gray-100 transition-colors"
            title="New Workflow"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <WorkflowList
            workflows={currentWorkflows}
            onWorkflowActivate={onWorkflowActivate}
            onWorkflowDelete={onWorkflowDelete}
            onWorkflowRename={onWorkflowRename}
          />
        </div>
      </div>

      {/* Lower Section - Chatbot */}
      <div className="h-80 border-t border-gray-200">
        <Chatbot />
      </div>
    </div>
  );
};

export default Sidebar;
