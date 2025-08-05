import { BrowserView, Menu, MenuItem } from 'electron';

export function setupBrowserViewContextMenu(browserView: BrowserView): void {
  if (!browserView) return;

  browserView.webContents.on('context-menu', (event, params) => {
    const menu = new Menu();

    // Add navigation items
    if (params.linkURL) {
      menu.append(new MenuItem({
        label: 'Open Link',
        click: () => {
          browserView.webContents.loadURL(params.linkURL);
        }
      }));
    }

    // Add copy/paste items
    if (params.selectionText) {
      menu.append(new MenuItem({
        label: 'Copy',
        role: 'copy'
      }));
    }

    if (params.isEditable) {
      menu.append(new MenuItem({
        label: 'Paste',
        role: 'paste'
      }));
    }

    // Add reload item
    menu.append(new MenuItem({
      label: 'Reload',
      click: () => {
        browserView.webContents.reload();
      }
    }));

    // Add back/forward navigation
    menu.append(new MenuItem({
      label: 'Go Back',
      enabled: browserView.webContents.canGoBack(),
      click: () => {
        browserView.webContents.goBack();
      }
    }));

    menu.append(new MenuItem({
      label: 'Go Forward',
      enabled: browserView.webContents.canGoForward(),
      click: () => {
        browserView.webContents.goForward();
      }
    }));

    // Add inspect element
    menu.append(new MenuItem({
      label: 'Inspect Element',
      click: () => {
        browserView.webContents.inspectElement(params.x, params.y);
      }
    }));

    menu.popup();
  });
} 