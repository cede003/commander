import { BrowserWindow } from 'electron';
import { CONFIG } from '../constants/config';
import logger from '../utils/logger';
import path from 'path';

let modalWindow: BrowserWindow | undefined;

export function createModalWindow(parentWindow: BrowserWindow): BrowserWindow {
  if (modalWindow) {
    modalWindow.focus();
    return modalWindow;
  }

  // Create the modal window
  modalWindow = new BrowserWindow({
    ...CONFIG.modalWindow,
    parent: parentWindow,
    modal: true,
  });

  // Load the modal content
  if (CONFIG.isDev) {
    logger.debug('Loading modal URL:', CONFIG.modalUrl);
    modalWindow.loadURL(CONFIG.modalUrl);
  } else {
    logger.debug('Loading modal file with hash');
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

  return modalWindow;
}

export function getModalWindow(): BrowserWindow | undefined {
  return modalWindow;
}

export function closeModalWindow(): void {
  if (modalWindow) {
    modalWindow.close();
    modalWindow = undefined;
  }
} 