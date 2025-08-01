export interface Tab {
  id: string;
  url: string;
  title: string;
  isActive: boolean;
  thumbnail?: string;
}

export interface TabSection {
  id: string;
  title: string;
  tabs: Tab[];
}

export interface BrowserInterfaceProps {
  activeTab: Tab;
  onTabUpdate: (tabId: string, updates: Partial<Tab>) => void;
  onNewTab: () => void;
}

export interface SidebarProps {
  currentTabs: Tab[];
  closedTabs: Tab[];
  onTabActivate: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabReopen: (tabId: string) => void;
}

export interface WebviewProps {
  url: string;
  onNavigate: (url: string) => void;
  onTitleChange: (title: string) => void;
  onContextMenu: (event: any) => void;
} 