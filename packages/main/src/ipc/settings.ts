// 设置 IPC handlers：get / update。
// settings.json 包含 tags / activeWorkspaceId / theme / sidebarCollapsed 等。
import { ipcMain } from 'electron';
import { generateId, type IpcResult, SettingsFile } from '@taskjian/shared';
import { settingsRepo } from '../storage/repo';

function ok<T>(data: T): IpcResult<T> {
  return { code: 0, message: 'ok', data, reqId: generateId() };
}

function fail(err: unknown): IpcResult {
  const message = err instanceof Error ? err.message : String(err);
  return { code: 1, message, reqId: generateId() };
}

export function registerSettingsIpc(): void {
  // 返回 SettingsFile。
  ipcMain.handle('settings:get', async () => {
    try {
      const settings = settingsRepo.load();
      if (!settings) {
        throw new Error('Settings not initialized');
      }
      return ok(settings);
    } catch (err) {
      return fail(err);
    }
  });

  // 合并更新 settings（浅合并，patch 中的顶层字段覆盖现有值）。
  ipcMain.handle(
    'settings:update',
    async (_e, patch: Partial<SettingsFile>) => {
      try {
        const existing = settingsRepo.load();
        if (!existing) {
          throw new Error('Settings not initialized');
        }
        const merged: SettingsFile = { ...existing, ...patch };
        settingsRepo.save(merged);
        return ok(merged);
      } catch (err) {
        return fail(err);
      }
    },
  );
}
