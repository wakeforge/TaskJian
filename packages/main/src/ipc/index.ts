// IPC handler 注册聚合：调用所有模块的注册函数。
// 在 app.whenReady() 后由 main/src/index.ts 调用。
import { registerArchiveIpc } from './archive';
import { registerSettingsIpc } from './settings';
import { registerTagIpc } from './tag';
import { registerTaskIpc } from './task';
import { registerWindowIpc } from './window';
import { registerWorkspaceIpc } from './workspace';

export function registerAllIpcHandlers(): void {
  registerWorkspaceIpc();
  registerTaskIpc();
  registerTagIpc();
  registerArchiveIpc();
  registerSettingsIpc();
  registerWindowIpc();
}

export {
  registerArchiveIpc,
  registerSettingsIpc,
  registerTagIpc,
  registerTaskIpc,
  registerWindowIpc,
  registerWorkspaceIpc,
};
