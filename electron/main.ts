import { app, BrowserWindow, BrowserView, ipcMain, session, Menu } from 'electron';
import * as path from 'path';
import { initialize, enable } from '@electron/remote/main';
import * as fs from 'fs';

// Set consistent userData path for development
if (!app.isPackaged) {
  const userDataPath = path.join(__dirname, '../userData');
  app.setPath('userData', userDataPath);
  console.log('User data path set to:', userDataPath);
}

// Enable remote debugging for workflow executor
app.commandLine.appendSwitch('remote-debugging-port', '9222');
app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1');

let mainWindow: BrowserWindow | null = null;
let browserView: BrowserView | null = null;
let modalWindow: BrowserWindow | undefined = undefined;
let currentURL: string = 'https://www.google.com';
let isSidebarVisible: boolean = true;
let dynamicBounds: { x: number; y: number; width: number; height: number } | null = null;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // Allow external content
      allowRunningInsecureContent: true, // Allow mixed content
      sandbox: false, // Disable sandbox for compatibility
      experimentalFeatures: true, // Enable experimental features
    },
    titleBarStyle: 'default', // Show default window controls
    show: false, // Don't show until ready
  });

  // Load the app
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  console.log('Loading app in development mode:', isDev);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('app.isPackaged:', app.isPackaged);
  
  if (isDev) {
    console.log('Loading URL: http://localhost:5174');
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    console.log('Loading file:', path.join(__dirname, '../renderer/index.html'));
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Enable @electron/remote for this window
  enable(mainWindow.webContents);

  // Set up context menu for the BrowserView
  setupBrowserViewContextMenu();

  // Set Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ['default-src \'self\' \'unsafe-inline\' \'unsafe-eval\' data: https: http:']
      }
    });
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    browserView = null;
  });

  // Handle window resize to update BrowserView bounds
  mainWindow.on('resize', () => {
    if (browserView) {
      updateBrowserViewBounds();
    }
  });

  // Handle DevTools toggle events
  mainWindow.webContents.on('devtools-opened', () => {
    console.log('[DEBUG] DevTools opened');
    // Small delay to ensure DevTools state is updated
    setTimeout(() => {
      updateBrowserViewBounds();
      mainWindow?.webContents.send('dev-tools-toggle');
    }, 100);
  });

  mainWindow.webContents.on('devtools-closed', () => {
    console.log('[DEBUG] DevTools closed');
    // Small delay to ensure DevTools state is updated
    setTimeout(() => {
      updateBrowserViewBounds();
      mainWindow?.webContents.send('dev-tools-toggle');
    }, 100);
  });

  // Handle window focus to refresh BrowserView
  mainWindow.on('focus', () => {
    if (browserView) {
      console.log('[DEBUG] Window focused, refreshing BrowserView bounds');
      setTimeout(() => {
        updateBrowserViewBounds();
      }, 100);
    }
  });

  // Configure session for BrowserView
  const browserViewSession = session.fromPartition('persist:commander');
  
  // Configure session to persist data and avoid clearing
  browserViewSession.webRequest.onBeforeSendHeaders((details, callback) => {
    // Ensure cookies and session data are preserved
    callback({ requestHeaders: details.requestHeaders });
  });

  // Configure session to persist cookies and cache
  browserViewSession.setPreloads([]);
  
  // Ensure session data persists between app launches
  browserViewSession.clearStorageData({
    storages: ['filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage'],
  }).then(() => {
    console.log('Session storage cleared, but cookies and session data preserved');
  }).catch((error) => {
    console.log('Session storage clear error (expected):', error.message);
  });

  // Allow all permissions for BrowserView
  browserViewSession.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log('Permission requested:', permission);
    callback(true);
  });
  
  // Set BrowserView session permissions
  browserViewSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    console.log('Permission check:', permission, 'from:', requestingOrigin);
    return true;
  });

  // Set up IPC handlers
  setupIpcHandlers();
}

function createBrowserView(url: string) {
  if (!mainWindow) {
    console.error('Main window not available');
    return;
  }

  console.log(`[DEBUG] Creating new BrowserView with URL: ${url}`);

  // Remove existing BrowserView if any
  if (browserView) {
    mainWindow.removeBrowserView(browserView);
    browserView = null;
  }

  // Create new BrowserView
  browserView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      session: session.fromPartition('persist:commander')
    }
  });

  // Set up event listeners for the BrowserView
  browserView.webContents.on('did-start-loading', () => {
    console.log(`[DEBUG] BrowserView started loading: ${url}`);
    mainWindow?.webContents.send('browser-view-loading-state-changed', { isLoading: true });
  });

  browserView.webContents.on('did-finish-load', () => {
    console.log(`[DEBUG] BrowserView finished loading: ${url}`);
    
    // Inject JavaScript to set window.name for identification
    if (browserView) {
      browserView.webContents.executeJavaScript(`
        window.name = "main-browser";
        console.log("🔧 Set window.name = 'main-browser' in BrowserView");
      `).catch(error => {
        console.error("Failed to set window.name in BrowserView:", error);
      });
    }
    
    mainWindow?.webContents.send('browser-view-loading-state-changed', { isLoading: false });
    mainWindow?.webContents.send('browser-view-loaded', {});
  });

  browserView.webContents.on('did-navigate', (event, navigationUrl) => {
    console.log(`[DEBUG] BrowserView navigated to: ${navigationUrl}`);
    mainWindow?.webContents.send('browser-view-navigated', { url: navigationUrl });
  });

  browserView.webContents.on('page-title-updated', (event, title) => {
    console.log(`[DEBUG] BrowserView title changed: ${title}`);
    mainWindow?.webContents.send('browser-view-title-changed', { title });
  });

  browserView.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[DEBUG] BrowserView failed to load: ${validatedURL}, Error: ${errorDescription} (${errorCode})`);
    mainWindow?.webContents.send('browser-view-load-failed', { 
      error: { 
        errorCode, 
        errorDescription, 
        validatedURL 
      } 
    });
  });

  // Load the URL
  browserView.webContents.loadURL(url);

  // Add the BrowserView to the main window
  mainWindow.addBrowserView(browserView);

  // Set initial bounds
  updateBrowserViewBounds();

  // Force refresh the BrowserView to ensure proper rendering
  setTimeout(() => {
    updateBrowserViewBounds();
  }, 200);

  // Set up context menu for the BrowserView
  setupBrowserViewContextMenu();

  console.log(`[DEBUG] BrowserView created and added to main window`);
}

function createModalWindow() {
  if (!mainWindow) {
    console.error('Main window not available for modal');
    return;
  }

  if (modalWindow) {
    modalWindow.focus();
    return;
  }

  // Create the modal window
  modalWindow = new BrowserWindow({
    width: 900,
    height: 800,
    parent: mainWindow,
    modal: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      allowRunningInsecureContent: true,
      sandbox: false,
      experimentalFeatures: true,
    },
    titleBarStyle: 'default',
    show: false,
  });

  // Load the modal content
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    console.log('Loading modal URL: http://localhost:5174/#/modal');
    modalWindow.loadURL('http://localhost:5174/#/modal');
  } else {
    console.log('Loading modal file with hash');
    modalWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
      hash: '/modal'
    });
  }

  // Show window when ready
  modalWindow.once('ready-to-show', () => {
    modalWindow?.show();
  });

  // Handle modal window closed
  modalWindow.on('closed', () => {
    modalWindow = undefined;
  });

  console.log('[Modal] Created modal window');
}

function loadURLInBrowserView(url: string) {
  if (!browserView) {
    console.error('BrowserView not available');
    return;
  }

  console.log(`[DEBUG] Loading URL in BrowserView: ${url}`);
  browserView.webContents.loadURL(url);
  
  // Inject JavaScript to set window.name after navigation
  browserView.webContents.once('did-finish-load', () => {
    if (browserView) {
      browserView.webContents.executeJavaScript(`
        window.name = "main-browser";
        console.log("🔧 Set window.name = 'main-browser' in BrowserView after navigation");
      `).catch(error => {
        console.error("Failed to set window.name in BrowserView after navigation:", error);
      });
      
      // Force refresh the BrowserView bounds to ensure proper rendering
      setTimeout(() => {
        updateBrowserViewBounds();
        // Focus the BrowserView to ensure it's active and visible
        if (browserView && mainWindow) {
          browserView.webContents.focus();
          mainWindow.focus();
        }
      }, 100);
    }
  });
}

function updateBrowserViewBounds() {
  if (!mainWindow || !browserView) {
    return;
  }

  try {
    // If we have dynamic bounds from React, use those
    if (dynamicBounds) {
      console.log(`[DEBUG] Using dynamic bounds from React:`, dynamicBounds);
      browserView.setBounds(dynamicBounds);
      browserView.setAutoResize({ width: true, height: true });
      return;
    }

    // Fallback to hardcoded bounds
    const [width, height] = mainWindow.getSize();
    
    // Check if DevTools is open
    const isDevToolsOpen = mainWindow.webContents.isDevToolsOpened();
    
    // Calculate sidebar width based on visibility
    const sidebarWidth = isSidebarVisible ? 320 : 0;
    
    // BrowserView takes up the right side of the window
    // Sidebar is 320px when visible, 0px when hidden
    // URL bar is h-20 (80px) + py-3 (24px) = 104px total
    let bounds = {
      x: sidebarWidth,
      y: 104,
      width: width - sidebarWidth,
      height: height - 104
    };

    // If DevTools is open, adjust bounds to account for DevTools panel
    if (isDevToolsOpen) {
      // DevTools typically takes up about 1/3 of the window width
      // Adjust the BrowserView width accordingly
      const devToolsWidth = Math.min(400, width * 0.4); // Cap at 400px or 40% of window
      bounds.width = width - sidebarWidth - devToolsWidth;
    }

    // Ensure bounds are valid
    if (bounds.width <= 0 || bounds.height <= 0) {
      console.warn('[DEBUG] Invalid bounds calculated, using fallback:', bounds);
      bounds = { x: 0, y: 104, width: 800, height: 600 };
    }

    console.log(`[DEBUG] Setting BrowserView bounds (fallback):`, bounds, `DevTools open: ${isDevToolsOpen}, Sidebar visible: ${isSidebarVisible}`);
    browserView.setBounds(bounds);
    browserView.setAutoResize({ width: true, height: true });
  } catch (error) {
    console.error('[DEBUG] Error in updateBrowserViewBounds:', error);
    // Set safe fallback bounds
    if (browserView) {
      browserView.setBounds({ x: 0, y: 104, width: 800, height: 600 });
      browserView.setAutoResize({ width: true, height: true });
    }
  }
}

function setupBrowserViewContextMenu() {
  if (!browserView) return;

  browserView.webContents.on('context-menu', (event, params) => {
    const template: any[] = [
      {
        label: 'Back',
        enabled: browserView?.webContents.canGoBack() || false,
        click: () => browserView?.webContents.goBack()
      },
      {
        label: 'Forward',
        enabled: browserView?.webContents.canGoForward() || false,
        click: () => browserView?.webContents.goForward()
      },
      { type: 'separator' as const },
      {
        label: 'Reload',
        click: () => browserView?.webContents.reload()
      },
      { type: 'separator' as const },
      {
        label: 'Copy',
        click: () => browserView?.webContents.copy()
      },
      {
        label: 'Cut',
        click: () => browserView?.webContents.cut()
      },
      {
        label: 'Paste',
        click: () => browserView?.webContents.paste()
      },
      { type: 'separator' as const },
      {
        label: 'Select All',
        click: () => browserView?.webContents.selectAll()
      },
      { type: 'separator' as const },
      {
        label: 'Inspect Element',
        click: () => browserView?.webContents.inspectElement(params.x, params.y)
      }
    ];

    // Add link-specific options if clicking on a link
    if (params.linkURL) {
      template.unshift(
        { type: 'separator' as const },
        {
          label: 'Copy Link Address',
          click: () => {
            require('electron').clipboard.writeText(params.linkURL);
          }
        }
      );
    }

    // Add image-specific options if clicking on an image
    if (params.srcURL) {
      template.unshift(
        { type: 'separator' as const },
        {
          label: 'Copy Image Address',
          click: () => {
            require('electron').clipboard.writeText(params.srcURL);
          }
        }
      );
    }

    const menu = Menu.buildFromTemplate(template);
    
    // Get the BrowserView bounds to adjust menu position
    const bounds = browserView?.getBounds();
    if (bounds) {
      // Adjust coordinates to account for BrowserView position within main window
      const adjustedX = params.x + bounds.x;
      const adjustedY = params.y + bounds.y;
      menu.popup({ x: adjustedX, y: adjustedY });
    } else {
      menu.popup({ x: params.x, y: params.y });
    }
  });
}

function setupIpcHandlers() {
  console.log('[DEBUG] Setting up IPC handlers');
  
  // Create BrowserView
  ipcMain.handle('create-browser-view', async (event, url: string) => {
    console.log(`[IPC] Creating BrowserView for URL: ${url}`);
    createBrowserView(url);
  });

  // Load URL in existing BrowserView
  ipcMain.handle('load-url-in-browser-view', async (event, url: string) => {
    console.log(`[IPC] Loading URL in BrowserView: ${url}`);
    loadURLInBrowserView(url);
  });

  // Force focus BrowserView
  ipcMain.handle('focus-browser-view', async () => {
    if (browserView && mainWindow) {
      console.log('[IPC] Forcing focus on BrowserView');
      browserView.webContents.focus();
      mainWindow.focus();
      // Force refresh bounds
      updateBrowserViewBounds();
    }
  });

  // Navigation methods
  ipcMain.handle('go-back-in-browser-view', async () => {
    if (!browserView) return false;
    const canGoBack = browserView.webContents.canGoBack();
    if (canGoBack) {
      browserView.webContents.goBack();
      return true;
    }
    return false;
  });

  ipcMain.handle('go-forward-in-browser-view', async () => {
    if (!browserView) return false;
    const canGoForward = browserView.webContents.canGoForward();
    if (canGoForward) {
      browserView.webContents.goForward();
      return true;
    }
    return false;
  });

  ipcMain.handle('reload-browser-view', async () => {
    if (!browserView) return;
    browserView.webContents.reload();
  });

  // Get navigation state
  ipcMain.handle('get-browser-view-can-go-back', async () => {
    if (!browserView) return false;
    return browserView.webContents.canGoBack();
  });

  ipcMain.handle('get-browser-view-can-go-forward', async () => {
    if (!browserView) return false;
    return browserView.webContents.canGoForward();
  });

  // Update bounds
  ipcMain.handle('update-browser-view-bounds', async () => {
    updateBrowserViewBounds();
  });

  // Update bounds from client (React component)
  ipcMain.handle('update-browser-view-bounds-from-client', async (event, bounds) => {
    try {
      if (browserView && bounds) {
        // Validate bounds - ensure all values are numbers and positive
        const { x, y, width, height } = bounds;
        if (typeof x !== 'number' || typeof y !== 'number' || 
            typeof width !== 'number' || typeof height !== 'number' ||
            width <= 0 || height <= 0) {
          console.warn('[IPC] Invalid bounds received from client:', bounds);
          return;
        }
        
        console.log('[IPC] Updating BrowserView bounds from client:', bounds);
        dynamicBounds = bounds; // Store the dynamic bounds
        browserView.setBounds(bounds);
        browserView.setAutoResize({ width: true, height: true });
      }
    } catch (error) {
      console.error('[IPC] Error updating bounds from client:', error);
    }
  });

  // Update sidebar visibility
  ipcMain.handle('update-sidebar-visibility', async (event, visible: boolean) => {
    isSidebarVisible = visible;
    updateBrowserViewBounds();
  });

  // Open modal window
  ipcMain.handle('open-create-workflow-modal', async () => {
    console.log('[IPC] Opening create workflow modal');
    createModalWindow();
  });

  // Create workflow from modal
  ipcMain.handle('create-workflow', async (event, workflow: { id?: string; name: string; description: string; workflowData: string; isEditing?: boolean }) => {
    // Send the workflow data to the main window
    if (mainWindow?.webContents) {
      mainWindow.webContents.send('workflow-created', workflow);
    }
  });

  // Handle control+click context menu
  ipcMain.handle('show-context-menu-at-position', async (event, x: number, y: number) => {
    if (!browserView) return;
    
    // Get the current context menu parameters by simulating a context menu event
    const template: any[] = [
      {
        label: 'Back',
        enabled: browserView?.webContents.canGoBack() || false,
        click: () => browserView?.webContents.goBack()
      },
      {
        label: 'Forward',
        enabled: browserView?.webContents.canGoForward() || false,
        click: () => browserView?.webContents.goForward()
      },
      { type: 'separator' as const },
      {
        label: 'Reload',
        click: () => browserView?.webContents.reload()
      },
      { type: 'separator' as const },
      {
        label: 'Copy',
        click: () => browserView?.webContents.copy()
      },
      {
        label: 'Cut',
        click: () => browserView?.webContents.cut()
      },
      {
        label: 'Paste',
        click: () => browserView?.webContents.paste()
      },
      { type: 'separator' as const },
      {
        label: 'Select All',
        click: () => browserView?.webContents.selectAll()
      },
      { type: 'separator' as const },
      {
        label: 'Inspect Element',
        click: () => browserView?.webContents.inspectElement(x, y)
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    
    // Get the BrowserView bounds to adjust menu position
    const bounds = browserView?.getBounds();
    if (bounds) {
      // Adjust coordinates to account for BrowserView position within main window
      const adjustedX = x + bounds.x;
      const adjustedY = y + bounds.y;
      menu.popup({ x: adjustedX, y: adjustedY });
    } else {
      menu.popup({ x, y });
    }
  });

  // Get app version
  ipcMain.handle('get-app-version', async () => {
    return app.getVersion();
  });

  // Get platform
  ipcMain.handle('get-platform', async () => {
    return process.platform;
  });

  // BrowserPane API handlers
  ipcMain.handle('initialize-browser-view', async () => {
    console.log(`[IPC] Initializing BrowserView with default URL`);
    if (!browserView) {
      createBrowserView('https://www.google.com');
    }
  });

  ipcMain.handle('load-url', async (event, url: string) => {
    console.log(`[IPC] Loading URL: ${url}`);
    currentURL = url;
    
    if (browserView) {
      browserView.webContents.loadURL(url);
    } else {
      createBrowserView(url);
    }
  });

  ipcMain.handle('navigate', async (event, direction: 'back' | 'forward') => {
    console.log(`[IPC] Navigating ${direction}`);
    
    if (!browserView) return;
    
    if (direction === 'back' && browserView.webContents.canGoBack()) {
      browserView.webContents.goBack();
    } else if (direction === 'forward' && browserView.webContents.canGoForward()) {
      browserView.webContents.goForward();
    }
  });

  ipcMain.handle('get-current-url', async () => {
    console.log(`[IPC] Getting current URL`);
    if (browserView) {
      const url = browserView.webContents.getURL();
      console.log(`[IPC] Current URL from BrowserView: ${url}`);
      return url;
    }
    console.log(`[IPC] Current URL from fallback: ${currentURL}`);
    return currentURL;
  });

  ipcMain.handle('update-layout', async () => {
    console.log(`[IPC] Updating layout`);
    updateBrowserViewBounds();
  });

  // Test handler to verify IPC setup
  ipcMain.handle('test-ipc', async () => {
    console.log(`[IPC] Test handler called successfully`);
    return 'IPC handlers are working';
  });

  // Execute workflow with Python
  ipcMain.handle('execute-workflow', async (event, workflowData: string) => {
    console.log(`[IPC] Executing workflow with data:`, workflowData.substring(0, 100) + '...');
    
    try {
      const { spawn } = require('child_process');
      const path = require('path');
      
      // Spawn the Python process with the new dynamic function calling method
      const pythonProcess = spawn(
        'python',
        ['runner.py', workflowData],
        {
          cwd: path.join(__dirname, '../engine'),
          stdio: ['pipe', 'pipe', 'pipe']
        }
      );
      
      // Collect output
      let output = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data: Buffer) => {
        output += data.toString();
        console.log(`[Python] ${data.toString()}`);
      });
      
      pythonProcess.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
        console.error(`[Python Error] ${data.toString()}`);
      });
      
      // Wait for completion
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pythonProcess.kill();
          reject(new Error('Workflow execution timed out after 60 seconds'));
        }, 60000); // 60 second timeout
        
        pythonProcess.on('close', (code: number) => {
          clearTimeout(timeout);
          if (code === 0) {
            console.log(`[IPC] Workflow executed successfully using new dynamic method`);
            resolve({ success: true, output });
          } else {
            console.error(`[IPC] Workflow execution failed with code ${code}`);
            reject(new Error(`Workflow execution failed: ${errorOutput}`));
          }
        });
        
        pythonProcess.on('error', (error: Error) => {
          clearTimeout(timeout);
          console.error(`[IPC] Failed to start Python process:`, error);
          reject(error);
        });
      });
    } catch (error) {
      console.error(`[IPC] Error executing workflow:`, error);
      throw error;
    }
  });

  // Execute workflow command in BrowserView
  ipcMain.handle('execute-workflow-command', async (event, command: string, data: any) => {
    console.log(`[IPC] Executing workflow command: ${command}`);
    
    if (!browserView) {
      throw new Error('BrowserView not available');
    }
    
    try {
      switch (command) {
        case 'navigate':
          await browserView.webContents.loadURL(data.url);
          return { success: true };
          
        case 'fill-form':
          // Execute JavaScript to fill form fields
          const script = `
            (async () => {
              const fields = ${JSON.stringify(data.fields)};
              const results = {};
              
              for (const [selector, value] of Object.entries(fields)) {
                try {
                  const element = document.querySelector(selector);
                  if (element) {
                    element.value = value;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    results[selector] = { success: true, value };
                  } else {
                    results[selector] = { success: false, error: 'Element not found' };
                  }
                } catch (error) {
                  results[selector] = { success: false, error: error.message };
                }
              }
              
              return results;
            })();
          `;
          
          const result = await browserView.webContents.executeJavaScript(script);
          return { success: true, results: result };
          
        default:
          throw new Error(`Unknown command: ${command}`);
      }
    } catch (error) {
      console.error(`[IPC] Error executing workflow command:`, error);
      throw error;
    }
  });

  // Handle workflow file loading
  ipcMain.handle('load-workflow-file', async (event, filePath: string) => {
    try {
      const fullPath = path.join(__dirname, '..', filePath);
      const workflowData = fs.readFileSync(fullPath, 'utf8');
      return { success: true, data: workflowData };
    } catch (error) {
      console.error('Error loading workflow file:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}

// App event handlers
app.whenReady().then(() => {
  console.log('[DEBUG] App is ready, initializing...');
  initialize();
  createWindow();
  console.log('[DEBUG] Window created, IPC handlers should be set up');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app quit
app.on('before-quit', () => {
  if (browserView) {
    mainWindow?.removeBrowserView(browserView);
    browserView = null;
  }
}); 