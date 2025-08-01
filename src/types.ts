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

export interface BrowserViewProps {
  url: string;
  onNavigate: (url: string) => void;
  onTitleChange: (title: string) => void;
  onContextMenu: (event: any) => void;
  onLoad: (event: any) => void;
}

// Global window interface for electronAPI
declare global {
  interface Window {
    electronAPI?: {
      // BrowserView management APIs
      createBrowserView?: (url: string) => Promise<any>;
      loadURLInBrowserView?: (url: string) => Promise<any>;
      goBackInBrowserView?: () => Promise<boolean>;
      goForwardInBrowserView?: () => Promise<boolean>;
      reloadBrowserView?: () => Promise<any>;
      getBrowserViewCanGoBack?: () => Promise<boolean>;
      getBrowserViewCanGoForward?: () => Promise<boolean>;
      updateBrowserViewBounds?: () => Promise<any>;
      
      // BrowserView event listeners
      onBrowserViewNavigated?: (callback: (url: string) => void) => void;
      onBrowserViewTitleChanged?: (callback: (title: string) => void) => void;
      onBrowserViewLoaded?: (callback: () => void) => void;
      onBrowserViewLoadFailed?: (callback: (error: any) => void) => void;
      
      // Legacy APIs
      showContextMenu?: (x: number, y: number, params: any) => Promise<void>;
      getAppVersion?: () => Promise<string>;
      getPlatform?: () => Promise<string>;
    };
  }
} 