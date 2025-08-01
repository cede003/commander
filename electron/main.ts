import { app, BrowserWindow, ipcMain, session, Menu } from 'electron';
import * as path from 'path';
import { initialize, enable } from '@electron/remote/main';

let mainWindow: BrowserWindow | null = null;

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
      webviewTag: true, // Enable webview tag
      sandbox: false, // Disable sandbox for webview compatibility
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
  });

  // Configure webview session
  const webviewSession = session.fromPartition('persist:commander');
  webviewSession.setPreloads([path.join(__dirname, 'webview-preload.js')]);
  
  // Allow all permissions for webview
  webviewSession.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log('Permission requested:', permission);
    callback(true);
  });
  
  // Set webview session permissions
  webviewSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    console.log('Permission check:', permission, 'from:', requestingOrigin);
    return true;
  });

  // Handle webview navigation
  webviewSession.webRequest.onBeforeRequest((details, callback) => {
    console.log('Webview navigation:', details.url);
    
    // Allow all requests but log them
    if (details.url.includes('google.com')) {
      console.log('Google request detected - may be blocked by X-Frame-Options');
    }
    
    callback({});
  });

  // Handle webview navigation errors
  webviewSession.webRequest.onErrorOccurred((details) => {
    if (details.error === 'ERR_ABORTED') {
      console.log('Navigation aborted (common for embedded content):', details.url);
    } else {
      console.log('Webview navigation error:', details.error, 'for URL:', details.url);
    }
  });
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

ipcMain.handle('show-context-menu', async (event, x: number, y: number, params: any) => {
  console.log('Context menu requested:', { x, y, params });
  const template: any[] = [
    {
      label: 'Back',
      enabled: event.sender.canGoBack(),
      click: () => event.sender.goBack()
    },
    {
      label: 'Forward',
      enabled: event.sender.canGoForward(),
      click: () => event.sender.goForward()
    },
    { type: 'separator' as const },
    {
      label: 'Reload',
      click: () => event.sender.reload()
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
          event.sender.loadURL(params.linkURL);
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

// Webview session management
ipcMain.handle('create-webview-session', () => {
  const partition = 'persist:commander';
  return session.fromPartition(partition);
});

// Handle new window requests from webview
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event: any, navigationUrl: string) => {
    // Handle navigation requests
    console.log('Navigation requested:', navigationUrl);
  });

  // Handle context menu for webview
  contents.on('contextmenu' as any, (event: any, params: any) => {
    event.preventDefault();
    
    const template: any[] = [
      {
        label: 'Back',
        enabled: contents.canGoBack(),
        click: () => contents.goBack()
      },
      {
        label: 'Forward',
        enabled: contents.canGoForward(),
        click: () => contents.goForward()
      },
      { type: 'separator' as const },
      {
        label: 'Reload',
        click: () => contents.reload()
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
            contents.loadURL(params.linkURL);
          }
        },
        {
          label: 'Copy Link Address',
          click: () => {
            require('electron').clipboard.writeText(params.linkURL);
          }
        },
        { type: 'separator' }
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
        { type: 'separator' }
      );
    }

    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: mainWindow! });
  });

  // Handle webview-specific context menu events
  contents.on('ipc-message', (event: any, channel: string, ...args: any[]) => {
    if (channel === 'webview-context-menu') {
      const { x, y, params } = args[0];
      
      const template: any[] = [
        {
          label: 'Back',
          enabled: contents.canGoBack(),
          click: () => contents.goBack()
        },
        {
          label: 'Forward',
          enabled: contents.canGoForward(),
          click: () => contents.goForward()
        },
        { type: 'separator' as const },
        {
          label: 'Reload',
          click: () => contents.reload()
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
      if (params && params.linkURL) {
        template.unshift(
          {
            label: 'Open Link in Current Tab',
            click: () => {
              contents.loadURL(params.linkURL);
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
      menu.popup({ window: mainWindow!, x, y });
    }
  });
}); 