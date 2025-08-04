import { app, BrowserWindow, BrowserView, ipcMain, session, Menu } from 'electron';
import * as path from 'path';
import { initialize, enable } from '@electron/remote/main';

let mainWindow: BrowserWindow | null = null;
let browserView: BrowserView | null = null;
let currentURL: string = 'https://www.google.com';

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
    titleBarStyle: 'hiddenInset', // macOS style
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

  // Configure session for BrowserView
  const browserViewSession = session.fromPartition('persist:commander');
  
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

  // Set up context menu for the BrowserView
  setupBrowserViewContextMenu();

  console.log(`[DEBUG] BrowserView created and added to main window`);
}

function loadURLInBrowserView(url: string) {
  if (!browserView) {
    console.error('BrowserView not available');
    return;
  }

  console.log(`[DEBUG] Loading URL in BrowserView: ${url}`);
  browserView.webContents.loadURL(url);
}

function updateBrowserViewBounds() {
  if (!mainWindow || !browserView) {
    return;
  }

  const [width, height] = mainWindow.getSize();
  
  // Check if DevTools is open
  const isDevToolsOpen = mainWindow.webContents.isDevToolsOpened();
  
  // BrowserView takes up the right side of the window
  // Sidebar is 320px, so BrowserView starts at x=320
  // URL bar is 80px, so BrowserView starts at y=80
  let bounds = {
    x: 320,
    y: 80,
    width: width - 320,
    height: height - 80
  };

  // If DevTools is open, adjust bounds to account for DevTools panel
  if (isDevToolsOpen) {
    // DevTools typically takes up about 1/3 of the window width
    // Adjust the BrowserView width accordingly
    const devToolsWidth = Math.min(400, width * 0.4); // Cap at 400px or 40% of window
    bounds.width = width - 320 - devToolsWidth;
  }

  console.log(`[DEBUG] Setting BrowserView bounds:`, bounds, `DevTools open: ${isDevToolsOpen}`);
  browserView.setBounds(bounds);
  browserView.setAutoResize({ width: true, height: true });
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
    if (browserView) {
      return browserView.webContents.getURL();
    }
    return currentURL;
  });

  ipcMain.handle('update-layout', async () => {
    console.log(`[IPC] Updating layout`);
    updateBrowserViewBounds();
  });
}

// App event handlers
app.whenReady().then(() => {
  initialize();
  createWindow();

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