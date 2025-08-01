import React from 'react';
import { Tab } from '../types';

interface TabListProps {
  title: string;
  tabs: Tab[];
  onTabActivate?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onTabReopen?: (tabId: string) => void;
  isActiveSection: boolean;
}

const TabList: React.FC<TabListProps> = ({
  title,
  tabs,
  onTabActivate,
  onTabClose,
  onTabReopen,
  isActiveSection
}) => {
  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <div className="space-y-2">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
              tab.isActive && isActiveSection
                ? 'bg-blue-50 border-blue-200'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
            onClick={() => {
              if (isActiveSection && onTabActivate) {
                onTabActivate(tab.id);
              } else if (!isActiveSection && onTabReopen) {
                onTabReopen(tab.id);
              }
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {tab.title}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {tab.url}
                </div>
              </div>
              
              {isActiveSection && onTabClose && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                  className="ml-2 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                  title="Close tab"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TabList; 