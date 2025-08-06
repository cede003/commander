export interface Tab {
  id: string;
  title: string;
  url: string;
  isActive: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  url: string;
  workflowData: string;
  isRunning: boolean;
  createdAt: Date;
  lastAccessed: Date;
}

export interface BrowserState {
  url: string;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  history: string[];
  currentHistoryIndex: number;
}

export interface WorkflowSection {
  id: string;
  title: string;
  workflows: Workflow[];
}

export interface BrowserInterfaceProps {
  browserState: BrowserState;
  onNavigate: (url: string) => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
}

export interface URLBarProps {
  currentURL: string;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onGoHome: () => void;
  onToggleSidebar: () => void;
  isSidebarVisible: boolean;
  isDarkMode?: boolean;
}

export interface SidebarProps {
  currentWorkflows: Workflow[];
  onWorkflowActivate: (workflowId: string) => void;
  onWorkflowCreate: () => void;
  onWorkflowDelete: (workflowId: string) => void;
  onWorkflowRename: (workflowId: string, newName: string) => void;
  onWorkflowEdit: (workflow: Workflow) => void;
  isDarkMode?: boolean;
}

export interface BrowserPaneProps {
  className?: string;
  isSidebarVisible?: boolean;
  onURLChange?: (url: string) => void;
  onNavigationStateChange?: (canGoBack: boolean, canGoForward: boolean) => void;
  isDarkMode?: boolean;
}

export interface BrowserViewProps {
  url: string;
  onNavigate: (url: string) => void;
  onTitleChange: (title: string) => void;
  onContextMenu: (event: any) => void;
  onLoad: (event: any) => void;
  onLoadingStateChange: (isLoading: boolean) => void;
}

// Global window interface for electronAPI
declare global {
  interface Window {
    electronAPI?: {
      // BrowserView management APIs
      createBrowserView?: (url: string) => Promise<any>;
      loadURLInBrowserView?: (url: string) => Promise<any>;
      focusBrowserView?: () => Promise<any>;
      goBackInBrowserView?: () => Promise<boolean>;
      goForwardInBrowserView?: () => Promise<boolean>;
      reloadBrowserView?: () => Promise<any>;
      getBrowserViewCanGoBack?: () => Promise<boolean>;
      getBrowserViewCanGoForward?: () => Promise<boolean>;
      updateBrowserViewBounds?: () => Promise<any>;
      updateBrowserViewBoundsFromClient?: (bounds: { x: number; y: number; width: number; height: number }) => Promise<any>;
      
      // BrowserView event listeners
      onBrowserViewNavigated?: (callback: (data: { url: string }) => void) => void;
      onBrowserViewTitleChanged?: (callback: (data: { title: string }) => void) => void;
      onBrowserViewLoaded?: (callback: (data: {}) => void) => void;
      onBrowserViewLoadFailed?: (callback: (data: { error: any }) => void) => void;
      onBrowserViewLoadingStateChanged?: (callback: (data: { isLoading: boolean }) => void) => void;
      
      // Context menu and workflow management
      openLinkInNewTab?: (url: string) => Promise<any>;
      showContextMenu?: (x: number, y: number, params: any) => Promise<void>;
      showContextMenuAtPosition?: (x: number, y: number) => Promise<void>;
      getAppVersion?: () => Promise<string>;
      getPlatform?: () => Promise<string>;
      
      // BrowserPane API
      loadURL?: (url: string) => Promise<void>;
      navigate?: (direction: 'back' | 'forward') => Promise<void>;
      getCurrentURL?: () => Promise<string>;
      updateLayout?: () => Promise<void>;
      updateSidebarVisibility?: (visible: boolean) => Promise<void>;
      initializeBrowserView?: () => Promise<void>;
      openCreateWorkflowModal?: () => Promise<void>;
      createWorkflow?: (workflow: { id?: string; name: string; description: string; workflowData: string; isEditing?: boolean }) => Promise<void>;
      onWorkflowCreated?: (callback: (workflow: { name: string; description: string; workflowData: string }) => void) => void;
      removeWorkflowCreatedListener?: () => void;
      onDevToolsToggle?: (callback: () => void) => void;
      executeWorkflow: (workflowData: string) => Promise<any>;
      testIpc?: () => Promise<string>;
    };
    browserViewTracker?: Map<string, any>;
  }
} 