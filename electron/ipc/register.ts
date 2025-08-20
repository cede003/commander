import { ipcMain, IpcMainInvokeEvent } from 'electron';
import logger from '../utils/logger';

type IpcHandler = (event: IpcMainInvokeEvent, ...args: any[]) => any | Promise<any>;

export function registerIpcHandlers(namespace: string, handlers: Record<string, IpcHandler>): void {
  const guardKey = `__${namespace}Registered` as keyof typeof globalThis;
  const g = global as any;

  if (g[guardKey]) {
    logger.debug(`[IPC] ${namespace} handlers already registered, skipping`);
    return;
  }

  Object.entries(handlers).forEach(([channel, handler]) => {
    ipcMain.handle(channel, async (event, ...args) => {
      try {
        return await handler(event, ...args);
      } catch (error) {
        logger.error(`[IPC:${namespace}] Handler '${channel}' failed`, { error: String(error) });
        throw error;
      }
    });
  });

  g[guardKey] = true;
  logger.info(`[IPC] Registered ${Object.keys(handlers).length} '${namespace}' handler(s)`);
}

