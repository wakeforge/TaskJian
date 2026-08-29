// 工作区相关 IPC handlers：list / get / create / rename / delete / setActive。
// 所有 handler 用 try/catch 包装，返回 IpcResult<T>。
import { ipcMain } from 'electron';
import { ulid } from 'ulid';
import type { IpcResult, Workspace, WorkspaceFile } from '@taskjian/shared';
import { archiveRepo, settingsRepo, workspaceRepo } from '../storage/repo';

function ok<T>(data: T): IpcResult<T> {
  return { code: 0, message: 'ok', data, reqId: ulid() };
}

function fail(err: unknown): IpcResult {
  const message = err instanceof Error ? err.message : String(err);
  return { code: 1, message, reqId: ulid() };
}

export function registerWorkspaceIpc(): void {
  // 返回所有工作区列表（含 groups）+ 当前 activeWorkspaceId，按 order 升序。
  ipcMain.handle('workspace:list', async () => {
    try {
      const ids = workspaceRepo.listIds();
      const workspaces: Workspace[] = [];
      for (const id of ids) {
        const file = workspaceRepo.load(id);
        if (!file) continue;
        workspaces.push(file.workspace);
      }
      workspaces.sort((a, b) => a.order - b.order);
      const settings = settingsRepo.load();
      const activeWorkspaceId = settings?.activeWorkspaceId ?? null;
      return ok({ workspaces, activeWorkspaceId });
    } catch (err) {
      return fail(err);
    }
  });

  // 返回完整 WorkspaceFile（workspace + tasks + rootOrder）。
  ipcMain.handle('workspace:get', async (_e, id: string) => {
    try {
      const file = workspaceRepo.load(id);
      if (!file) {
        throw new Error(`Workspace not found: ${id}`);
      }
      return ok(file);
    } catch (err) {
      return fail(err);
    }
  });

  // 创建新工作区：ulid 生成 id，order 取当前数量，写入空 WorkspaceFile。
  // 返回完整 Workspace 对象（含空 groups），便于渲染层直接 push 到列表。
  ipcMain.handle('workspace:create', async (_e, name: string) => {
    try {
      const now = Date.now();
      const existingIds = workspaceRepo.listIds();
      const id = ulid();
      const workspace: Workspace = {
        id,
        name,
        order: existingIds.length,
        groups: [],
        createdAt: now,
        updatedAt: now,
      };
      const file: WorkspaceFile = {
        version: 1,
        workspace,
        tasks: {},
        rootOrder: [],
      };
      workspaceRepo.save(id, file);
      return ok(workspace);
    } catch (err) {
      return fail(err);
    }
  });

  // 重命名工作区。返回更新后的 Workspace 对象，便于渲染层同步本地列表。
  ipcMain.handle('workspace:rename', async (_e, id: string, name: string) => {
    try {
      const file = workspaceRepo.load(id);
      if (!file) {
        throw new Error(`Workspace not found: ${id}`);
      }
      file.workspace.name = name;
      file.workspace.updatedAt = Date.now();
      workspaceRepo.save(id, file);
      return ok(file.workspace);
    } catch (err) {
      return fail(err);
    }
  });

  // 删除工作区：先把所有 tasks 打上 archivedAt + workspaceId 追加到 archive.json，
  // 再删工作区目录；若 settings.activeWorkspaceId == id 则置 null。
  ipcMain.handle('workspace:delete', async (_e, id: string) => {
    try {
      const file = workspaceRepo.load(id);
      if (file) {
        const now = Date.now();
        const archive = archiveRepo.load();
        for (const taskId of Object.keys(file.tasks)) {
          const task = file.tasks[taskId];
          task.archivedAt = now;
          task.workspaceId = id;
          archive.tasks.push(task);
        }
        archiveRepo.save(archive);
        workspaceRepo.remove(id);
      }
      const settings = settingsRepo.load();
      if (settings && settings.activeWorkspaceId === id) {
        settings.activeWorkspaceId = null;
        settingsRepo.save(settings);
      }
      return ok(undefined);
    } catch (err) {
      return fail(err);
    }
  });

  // 更新 settings.activeWorkspaceId。
  ipcMain.handle('workspace:setActive', async (_e, id: string) => {
    try {
      const settings = settingsRepo.load();
      if (!settings) {
        throw new Error('Settings not initialized');
      }
      settings.activeWorkspaceId = id;
      settingsRepo.save(settings);
      return ok(undefined);
    } catch (err) {
      return fail(err);
    }
  });
}
