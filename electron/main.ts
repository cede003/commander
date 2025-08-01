import { app, BrowserWindow, BrowserView, ipcMain, session, Menu } from 'electron';
import * as path from 'path';
import { initialize, enable } from '@electron/remote/main';

let mainWindow: BrowserWindow | null = null;
let browserView: BrowserView | null = null;

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
      // Remove webviewTag since we're using BrowserView instead
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



  // Configure session for BrowserView (replaces webview session)
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

  // Handle BrowserView navigation
  browserViewSession.webRequest.onBeforeRequest((details, callback) => {
    console.log('BrowserView navigation:', details.url);
    callback({});
  });

  // Handle BrowserView navigation errors
  browserViewSession.webRequest.onErrorOccurred((details) => {
    if (details.error === 'ERR_ABORTED') {
      console.log('Navigation aborted (common for embedded content):', details.url);
    } else {
      console.log('BrowserView navigation error:', details.error, 'for URL:', details.url);
    }
  });
}

// Function to create and manage BrowserView
function createBrowserView(url: string) {
  if (!mainWindow) return;

  // Remove existing BrowserView if any
  if (browserView) {
    mainWindow.removeBrowserView(browserView);
    browserView = null;
  }

  // Create new BrowserView
  browserView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false, // Required for context menu to work
      webSecurity: false,
      allowRunningInsecureContent: true,
      session: session.fromPartition('persist:commander'),
    }
  });

  // Set up BrowserView event listeners
  browserView.webContents.on('did-navigate', (event, navigationUrl) => {
    console.log('BrowserView navigated to:', navigationUrl);
    // Notify renderer process of navigation
    mainWindow?.webContents.send('browser-view-navigated', navigationUrl);
  });

  browserView.webContents.on('page-title-updated', (event, title) => {
    console.log('BrowserView title updated:', title);
    // Notify renderer process of title change
    mainWindow?.webContents.send('browser-view-title-changed', title);
  });

  browserView.webContents.on('did-finish-load', () => {
    console.log('BrowserView finished loading');
    // Notify renderer process that loading is complete
    mainWindow?.webContents.send('browser-view-loaded');
  });

  browserView.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('BrowserView failed to load:', validatedURL, 'Error code:', errorCode);
    // Notify renderer process of load failure
    mainWindow?.webContents.send('browser-view-load-failed', { errorCode, errorDescription, validatedURL });
  });

  // Handle context menu for BrowserView
  browserView.webContents.on('contextmenu' as any, (event: any, params: any) => {
    event.preventDefault();
    
    const template: any[] = [
      {
        label: 'Back',
        enabled: browserView?.webContents.canGoBack(),
        click: () => browserView?.webContents.goBack()
      },
      {
        label: 'Forward',
        enabled: browserView?.webContents.canGoForward(),
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
        role: 'copy',
        accelerator: 'CmdOrCtrl+C'
      },
      {
        label: 'Paste',
        role: 'paste',
        accelerator: 'CmdOrCtrl+V'
      },
      {
        label: 'Select All',
        role: 'selectall',
        accelerator: 'CmdOrCtrl+A'
      }
    ];

    // Add link-specific menu items
    if (params.linkURL) {
      template.unshift(
        {
          label: 'Open Link in Current Tab',
          click: () => {
            browserView?.webContents.loadURL(params.linkURL);
          }
        },
        {
          label: 'Copy Link Address',
          click: () => {
            require('electron').clipboard.writeText(params.linkURL);
          }
        },
        { type: 'separator' as const }
      );
    }

    // Add image-specific menu items
    if (params.srcURL) {
      template.unshift(
        {
          label: 'Copy Image',
          click: () => {
            require('electron').clipboard.writeImage(params.srcURL);
          }
        },
        {
          label: 'Copy Image Address',
          click: () => {
            require('electron').clipboard.writeText(params.srcURL);
          }
        },
        { type: 'separator' as const }
      );
    }

    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: mainWindow! });
  });

  // Add BrowserView to main window
  mainWindow.addBrowserView(browserView);

  // Set BrowserView bounds (this will be updated by renderer)
  const bounds = mainWindow.getBounds();
  browserView.setBounds({ x: 0, y: 100, width: bounds.width, height: bounds.height - 100 });
  browserView.setAutoResize({ width: true, height: true });

  // Load the URL
  console.log('Loading URL in BrowserView:', url);
  browserView.webContents.loadURL(url, {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
}

// Function to update BrowserView bounds
function updateBrowserViewBounds() {
  if (!mainWindow || !browserView) return;

  const bounds = mainWindow.getBounds();
  // Account for URL bar height (approximately 100px)
  browserView.setBounds({ x: 0, y: 100, width: bounds.width, height: bounds.height - 100 });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Initialize @electron/remote
  initialize();
  
  // Initialize electron-context-menu
  try {
    const contextMenu = await import('electron-context-menu');
    contextMenu.default({
      showCopyImageAddress: true,
      showSaveImageAs: true,
      prepend: (defaultActions: any, params: any, browserWindow: any) => [
        {
          label: 'Open Link in Current Tab',
          visible: params.linkURL ? params.linkURL.length > 0 : false,
          click: () => {
            if (browserWindow && params.linkURL) {
              browserWindow.webContents.loadURL(params.linkURL);
            }
          }
        }
      ]
    });
    console.log('electron-context-menu initialized successfully');
  } catch (error) {
    console.log('Failed to initialize electron-context-menu:', error);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

// New IPC handlers for BrowserView management
ipcMain.handle('create-browser-view', (event, url: string) => {
  console.log('Creating BrowserView for URL:', url);
  createBrowserView(url);
});

ipcMain.handle('load-url-in-browser-view', (event, url: string) => {
  if (browserView) {
    console.log('Loading URL in BrowserView:', url);
    browserView.webContents.loadURL(url, {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
  }
});

ipcMain.handle('go-back-in-browser-view', () => {
  if (browserView && browserView.webContents.canGoBack()) {
    browserView.webContents.goBack();
    return true;
  }
  return false;
});

ipcMain.handle('go-forward-in-browser-view', () => {
  if (browserView && browserView.webContents.canGoForward()) {
    browserView.webContents.goForward();
    return true;
  }
  return false;
});

ipcMain.handle('reload-browser-view', () => {
  if (browserView) {
    browserView.webContents.reload();
  }
});

ipcMain.handle('get-browser-view-can-go-back', () => {
  return browserView ? browserView.webContents.canGoBack() : false;
});

ipcMain.handle('get-browser-view-can-go-forward', () => {
  return browserView ? browserView.webContents.canGoForward() : false;
});

ipcMain.handle('update-browser-view-bounds', () => {
  updateBrowserViewBounds();
});



// Handle context menu for main window (legacy support)
ipcMain.handle('show-context-menu', async (event, x: number, y: number, params: any) => {
  console.log('Context menu requested:', { x, y, params });
  const template: any[] = [
    {
      label: 'Back',
      enabled: browserView?.webContents.canGoBack(),
      click: () => browserView?.webContents.goBack()
    },
    {
      label: 'Forward',
      enabled: browserView?.webContents.canGoForward(),
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
      role: 'copy',
      accelerator: 'CmdOrCtrl+C'
    },
    {
      label: 'Paste',
      role: 'paste',
      accelerator: 'CmdOrCtrl+V'
    },
    {
      label: 'Select All',
      role: 'selectall',
      accelerator: 'CmdOrCtrl+A'
    },
    { type: 'separator' as const },
    {
      label: 'Inspect Element',
      click: () => event.sender.inspectElement(x, y)
    }
  ];

  // Add link-specific menu items
  if (params && params.linkURL) {
    template.unshift(
      {
        label: 'Open Link in Current Tab',
        click: () => {
          browserView?.webContents.loadURL(params.linkURL);
        }
      },
      {
        label: 'Copy Link Address',
        click: () => {
          require('electron').clipboard.writeText(params.linkURL);
        }
      },
      { type: 'separator' as const }
    );
  }

  // Add image-specific menu items
  if (params && params.srcURL) {
    template.unshift(
      {
        label: 'Copy Image',
        click: () => {
          require('electron').clipboard.writeImage(params.srcURL);
        }
      },
      {
        label: 'Copy Image Address',
        click: () => {
          require('electron').clipboard.writeText(params.srcURL);
        }
      },
      { type: 'separator' as const }
    );
  }

  const menu = Menu.buildFromTemplate(template);
  console.log('Showing context menu at:', { x, y });
  menu.popup({ window: mainWindow!, x, y });
});

// Remove webview-specific handlers since we're using BrowserView now
// The BrowserView event handlers are set up in the createBrowserView function 