import { app, Menu } from 'electron';
import { getMainWindow } from '../../windows/mainWindow';
import { getBrowserView } from '../../views/browserViewManager';
import logger from '../../utils/logger';
import { registerIpcHandlers } from '../register';

export function registerUiCommands(): void {
  registerIpcHandlers('uiCommands', {
    'show-context-menu-at-position': async (_event, x: number, y: number) => {
      const menu = Menu.buildFromTemplate([
        { label: 'Reload', click: () => getBrowserView()?.webContents.reload() },
        { type: 'separator' },
        { label: 'Back', enabled: !!getBrowserView()?.webContents.canGoBack(), click: () => getBrowserView()?.webContents.goBack() },
        { label: 'Forward', enabled: !!getBrowserView()?.webContents.canGoForward(), click: () => getBrowserView()?.webContents.goForward() },
        { type: 'separator' },
        { label: 'Inspect', click: () => getMainWindow()?.webContents.openDevTools({ mode: 'detach' }) },
      ]);
      const mainWindow = getMainWindow();
      if (mainWindow) {
        menu.popup({ window: mainWindow, x, y });
      }
      return { success: true };
    },

    'show-context-menu': async (_event, x: number, y: number, _params: any) => {
      // Fallback to same menu as above
      const menu = Menu.buildFromTemplate([
        { label: 'Reload', click: () => getBrowserView()?.webContents.reload() },
        { type: 'separator' },
        { label: 'Back', enabled: !!getBrowserView()?.webContents.canGoBack(), click: () => getBrowserView()?.webContents.goBack() },
        { label: 'Forward', enabled: !!getBrowserView()?.webContents.canGoForward(), click: () => getBrowserView()?.webContents.goForward() },
      ]);
      const mainWindow = getMainWindow();
      if (mainWindow) {
        menu.popup({ window: mainWindow, x, y });
      }
      return { success: true };
    },

    'get-app-version': async () => {
      return { version: app.getVersion() };
    },

    'get-platform': async () => {
      return { platform: process.platform };
    },
  });
}

