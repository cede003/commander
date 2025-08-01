import React from 'react';
import { SidebarProps } from '../types';
import TabList from './TabList';
import Chatbot from './Chatbot';

const Sidebar: React.FC<SidebarProps> = ({
  currentTabs,
  closedTabs,
  onTabActivate,
  onTabClose,
  onTabReopen
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Upper Section - Tab Management */}
      <div className="flex-1 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Tabs</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {/* Current Tabs */}
          <TabList
            title="Current"
            tabs={currentTabs}
            onTabActivate={onTabActivate}
            onTabClose={onTabClose}
            isActiveSection={true}
          />
          
          {/* Closed Tabs */}
          {closedTabs.length > 0 && (
            <TabList
              title="Closed"
              tabs={closedTabs}
              onTabReopen={onTabReopen}
              isActiveSection={false}
            />
          )}
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