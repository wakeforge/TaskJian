// 标签 IPC handlers：list / saveAll。
// 标签定义存储在 settings.json#tags，整批读写。
import { ipcMain } from 'electron';
import { ulid } from 'ulid';
import type { IpcResult, TagDef } from '@taskjian/shared';
import { settingsRepo } from '../storage/repo';

function ok<T>(data: T): IpcResult<T> {
  return { code: 0, message: 'ok', data, reqId: ulid() };
}

function fail(err: unknown): IpcResult {
  const message = err instanceof Error ? err.message : String(err);
  return { code: 1, message, reqId: ulid() };
}

export function registerTagIpc(): void {
  // 从 settings 读取 tags。
  ipcMain.handle('tag:list', async () => {
    try {
      const settings = settingsRepo.load();
      if (!settings) {
        throw new Error('Settings not initialized');
      }
      return ok(settings.tags);
    } catch (err) {
      return fail(err);
    }
  });

  // 一次性写入 settings.tags。返回写入后的标签数组，便于渲染层同步本地缓存。
  ipcMain.handle('tag:saveAll', async (_e, tags: TagDef[]) => {
    try {
      const settings = settingsRepo.load();
      if (!settings) {
        throw new Error('Settings not initialized');
      }
      settings.tags = tags;
      settingsRepo.save(settings);
      return ok(tags);
    } catch (err) {
      return fail(err);
    }
  });
}
