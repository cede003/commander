import { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import BrowserPane from './components/BrowserPane';
import URLBar from './components/URLBar';
import { Workflow } from './types';
import logger from './utils/logger';

function App() {
  const [currentWorkflows, setCurrentWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Helper function to generate unique IDs
  const generateUniqueId = (prefix: string = 'workflow') => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Auto-detect dark mode based on system preferences and time
  useEffect(() => {
    const detectDarkMode = () => {
      // Check system preference
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Check time-based preference (dark mode from 6 PM to 6 AM)
      const now = new Date();
      const hour = now.getHours();
      const isNightTime = hour >= 18 || hour < 6;
      
      // Use system preference as primary, time as secondary
      const shouldBeDark = systemPrefersDark || isNightTime;
      
      logger.debug('Dark mode detection', {
        systemPrefersDark,
        isNightTime,
        currentHour: hour,
        shouldBeDark
      });
      
      setIsDarkMode(shouldBeDark);
    };

    // Initial detection
    detectDarkMode();

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => detectDarkMode();
    
    mediaQuery.addEventListener('change', handleChange);

    // Check every minute for time-based changes
    const interval = setInterval(detectDarkMode, 60000);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      clearInterval(interval);
    };
  }, []);

  // Load workflows from files on component mount
  const workflowsLoadedRef = useRef(false);
  
  useEffect(() => {
    if (workflowsLoadedRef.current) return;
    
    const loadWorkflows = async () => {
      try {
        // Try to load workflow list from index file first
        let workflowFiles: string[] = [];
        
        try {
          const indexResponse = await fetch('/workflows.json');
          if (indexResponse.ok) {
            const indexData = await indexResponse.json();
            workflowFiles = indexData.workflows.map((w: any) => w.filename);
            logger.info('Loaded workflow list from index file');
          }
        } catch (error) {
          logger.warn('Could not load workflows index');
        }

        const loadedWorkflows: Workflow[] = [];
        let loadedCount = 0;

        // Load each workflow file
        for (const filename of workflowFiles) {
          try {
            const response = await fetch(`/${filename}`);
            if (response.ok) {
              const workflowJson = await response.text();
              const workflowData = JSON.parse(workflowJson);
              
              // Generate unique ID based on filename and timestamp
              const uniqueId = generateUniqueId(filename.replace('.json', ''));
              
              loadedWorkflows.push({
                id: uniqueId,
                name: workflowData.metadata.name,
                description: workflowData.metadata.description,
                url: workflowData.inputs?.search_url || 'https://www.google.com',
                workflowData: workflowJson,
                isRunning: false,
                createdAt: new Date(),
                lastAccessed: new Date()
              });
              
              loadedCount++;
              logger.info('Loaded workflow:', { name: workflowData.metadata.name });
            } else {
              console.warn(`Workflow file not found: ${filename}`);
            }
          } catch (error) {
            console.warn(`Failed to load workflow file: ${filename}`, error);
            // Continue loading other files even if one fails
          }
        }

        if (loadedCount === 0) {
          console.warn('No workflow files were loaded successfully');
        } else {
          logger.info('Successfully loaded workflows:', { count: loadedCount });
        }

        setCurrentWorkflows(loadedWorkflows);
        workflowsLoadedRef.current = true;
      } catch (error) {
        console.error('Failed to load workflows from files:', error);
        setCurrentWorkflows([]);
        workflowsLoadedRef.current = true;
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkflows();
  }, []);

  // Focus browser view when app loads
  useEffect(() => {
    if (window.electronAPI?.focusBrowserView) {
      // Focus after a delay to ensure the browser view is ready
      const timer = setTimeout(() => {
        window.electronAPI!.focusBrowserView!();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const [currentURL, setCurrentURL] = useState<string>('');
  const [canGoBack, setCanGoBack] = useState<boolean>(false);
  const [canGoForward, setCanGoForward] = useState<boolean>(false);
  // Use a renderer-safe default; main process handles actual BrowserView layout
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(true);
  const workflowListenerRef = useRef<boolean>(false);

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
    if (window.electronAPI?.updateSidebarVisibility) {
      window.electronAPI.updateSidebarVisibility(!isSidebarVisible);
    }
  };

  const handleGoBack = async () => {
    if (window.electronAPI?.navigate) {
      await window.electronAPI.navigate('back');
    }
  };

  const handleGoForward = async () => {
    if (window.electronAPI?.navigate) {
      await window.electronAPI.navigate('forward');
    }
  };

  const handleReload = async () => {
    if (window.electronAPI?.loadURL && currentURL) {
      await window.electronAPI.loadURL(currentURL);
    }
  };

  const handleGoHome = () => {
    setCurrentURL('https://www.google.com');
    if (window.electronAPI?.loadURLInBrowserView) {
      window.electronAPI.loadURLInBrowserView('https://www.google.com');
    }
    // Focus the browser view after loading
    if (window.electronAPI?.focusBrowserView) {
      setTimeout(() => {
        window.electronAPI!.focusBrowserView!();
      }, 500);
    }
  };

  const handleURLChange = (url: string) => {
    setCurrentURL(url);
  };

  const handleNavigationStateChange = (canGoBack: boolean, canGoForward: boolean) => {
    setCanGoBack(canGoBack);
    setCanGoForward(canGoForward);
  };

  const handleWorkflowActivate = async (workflowId: string) => {
    const workflow = currentWorkflows.find(w => w.id === workflowId);
    
    if (workflow) {
      // If the workflow is currently running, stop it
      if (workflow.isRunning) {
        setCurrentWorkflows(prev => prev.map(w => 
          w.id === workflowId ? { ...w, isRunning: false } : w
        ));
        return;
      }
      
      // If the workflow is being activated (not deactivated)
      try {
        // Set the workflow as running
        setCurrentWorkflows(prev => prev.map(w => 
          w.id === workflowId ? { ...w, isRunning: true } : w
        ));
        
        // Test IPC bridge first
        logger.debug('Testing IPC bridge...');
        logger.debug('Checking if executeWorkflow is available', { available: !!window.electronAPI?.executeWorkflow });
        logger.debug('Available electronAPI methods', { methods: Object.keys(window.electronAPI || {}) });
        
        // Test a simple IPC call first
        if (window.electronAPI?.testIpc) {
          try {
            const testResult = await window.electronAPI.testIpc();
            logger.info('Test IPC call successful', { result: testResult });
          } catch (error) {
            console.error('Test IPC call failed:', error);
          }
        }
        
        // Debug: Check what's available
        logger.debug('Debugging electronAPI availability', {
          hasElectronAPI: !!window.electronAPI,
          electronAPIType: typeof window.electronAPI,
          availableKeys: window.electronAPI ? Object.keys(window.electronAPI) : [],
          hasExecuteWorkflow: !!(window.electronAPI?.executeWorkflow),
          executeWorkflowType: typeof window.electronAPI?.executeWorkflow
        });
        
        if (window.electronAPI?.executeWorkflow) {
          logger.info('Executing workflow', { workflowName: workflow.name });
          const result = await window.electronAPI.executeWorkflow(workflow.workflowData);
          logger.info('Workflow execution result', { result });
        } else {
          throw new Error('executeWorkflow API not available');
        }
        
        // Set the workflow as no longer running
        setCurrentWorkflows(prev => prev.map(w => 
          w.id === workflowId ? { ...w, isRunning: false } : w
        ));
      } catch (error) {
        logger.error('Failed to execute workflow', { 
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          workflow: workflow.name
        });
        
        // Set the workflow as no longer running on error
        setCurrentWorkflows(prev => prev.map(w => 
          w.id === workflowId ? { ...w, isRunning: false } : w
        ));
        
        // Show error to user (you could add a toast notification here)
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert(`Failed to execute workflow: ${errorMessage}`);
      }
    }
  };

  const handleWorkflowCreate = () => {
    if (window.electronAPI?.openCreateWorkflowModal) {
      window.electronAPI.openCreateWorkflowModal();
    }
  };

  const testElectronAPI = async () => {
    logger.debug('Testing Electron API availability...');
    logger.debug('window.electronAPI', { electronAPI: window.electronAPI });
    logger.debug('Available methods', { methods: window.electronAPI ? Object.keys(window.electronAPI) : 'No electronAPI' });
    
    if (window.electronAPI?.testIpc) {
      try {
        const result = await window.electronAPI.testIpc();
        logger.info('Test IPC result', { result });
        alert('Electron API is working!');
      } catch (error) {
        console.error('Test IPC failed:', error);
        alert('Electron API test failed: ' + error);
      }
    } else {
      console.error('testIpc not available');
      alert('testIpc not available');
    }
  };

  // Expose test function globally for debugging
  (window as any).testElectronAPI = testElectronAPI;

  const handleWorkflowEdit = (workflow: Workflow) => {
    if (window.electronAPI?.openCreateWorkflowModal) {
      // Store the workflow data to be edited
      localStorage.setItem('editingWorkflow', JSON.stringify(workflow));
      window.electronAPI.openCreateWorkflowModal();
    }
  };

  // Listen for workflow creation from modal
  useEffect(() => {
    // Clean up any existing listeners first
    if (window.electronAPI?.removeWorkflowCreatedListener) {
      window.electronAPI.removeWorkflowCreatedListener();
    }

    const handleWorkflowCreated = (workflow: { id?: string; name: string; description: string; workflowData: string; isEditing?: boolean }) => {
      if (workflow.isEditing && workflow.id) {
        // Update existing workflow
        setCurrentWorkflows(prev => prev.map(w => 
          w.id === workflow.id ? {
            ...w,
            name: workflow.name,
            description: workflow.description,
            workflowData: workflow.workflowData,
            lastAccessed: new Date()
          } : w
        ));
      } else {
        // Create new workflow with unique ID
        const uniqueId = generateUniqueId('manual');
        
        const newWorkflow: Workflow = {
          id: uniqueId,
          name: workflow.name,
          description: workflow.description,
          url: 'https://www.google.com',
          workflowData: workflow.workflowData,
          isRunning: false,
          createdAt: new Date(),
          lastAccessed: new Date()
        };
        
        setCurrentWorkflows(prev => {
          // Check if this workflow already exists (by name and description)
          const existingWorkflow = prev.find(w => 
            w.name === newWorkflow.name && 
            w.description === newWorkflow.description
          );
          
          if (existingWorkflow) {
            return prev;
          }
          
          return [...prev, newWorkflow];
        });
      }
    };

    // Listen for workflow-created event
    if (window.electronAPI?.onWorkflowCreated) {
      window.electronAPI.onWorkflowCreated(handleWorkflowCreated);
      workflowListenerRef.current = true;
    }

    return () => {
      // Clean up the event listener when component unmounts
      if (window.electronAPI?.removeWorkflowCreatedListener) {
        window.electronAPI.removeWorkflowCreatedListener();
      }
      workflowListenerRef.current = false;
    };
  }, []);

  const handleWorkflowDelete = (workflowId: string) => {
    setCurrentWorkflows(prev => prev.filter(w => w.id !== workflowId));
  };

  const handleWorkflowRename = (workflowId: string, newName: string) => {
    setCurrentWorkflows(prev => prev.map(workflow => 
      workflow.id === workflowId ? { ...workflow, name: newName } : workflow
    ));
  };

  return (
    <div className={`flex flex-col h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>
      {/* URL Bar - Top level component */}
      <URLBar
        currentURL={currentURL}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onReload={handleReload}
        onGoHome={handleGoHome}
        onToggleSidebar={toggleSidebar}
        isSidebarVisible={isSidebarVisible}
        isDarkMode={isDarkMode}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className={`shadow-lg transition-all duration-300 ease-in-out ${
          isSidebarVisible ? 'w-80 border-r' : 'w-0'
        } ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {isSidebarVisible && (
            <div className="relative h-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading workflows...</div>
                </div>
              ) : (
                <Sidebar
                  currentWorkflows={currentWorkflows}
                  onWorkflowActivate={handleWorkflowActivate}
                  onWorkflowCreate={handleWorkflowCreate}
                  onWorkflowDelete={handleWorkflowDelete}
                  onWorkflowRename={handleWorkflowRename}
                  onWorkflowEdit={handleWorkflowEdit}
                  isDarkMode={isDarkMode}
                />
              )}
            </div>
          )}
        </div>

        {/* Browser Pane */}
        <div className="flex-1 min-h-0">
          <BrowserPane
            className="h-full"
            isSidebarVisible={isSidebarVisible}
            onURLChange={handleURLChange}
            onNavigationStateChange={handleNavigationStateChange}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>
    </div>
  );
}

export default App; 