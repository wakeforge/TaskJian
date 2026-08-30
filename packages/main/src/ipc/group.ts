import { ipcMain } from 'electron';
import { generateId, type IpcResult, WorkspaceGroup } from '@taskjian/shared';
import { workspaceRepo } from '../storage/repo';

function ok<T>(data: T): IpcResult<T> {
  return { code: 0, message: 'ok', data, reqId: generateId() };
}
function fail(err: unknown): IpcResult {
  const message = err instanceof Error ? err.message : String(err);
  return { code: 1, message, reqId: generateId() };
}

export function registerGroupIpc() {
  // 新建分组
  ipcMain.handle(
    'group:create',
    async (_e, workspaceId: string, name: string): Promise<any> => {
      try {
        const file = workspaceRepo.load(workspaceId);
        if (!file) throw new Error(`Workspace not found: ${workspaceId}`);
        const trimmed = name.trim();
        if (!trimmed) throw new Error('分组名称不能为空');
        // 同工作区分组名唯一
        if (file.workspace.groups.some((g) => g.name === trimmed)) {
          throw new Error(`分组「${trimmed}」已存在`);
        }
        const group: WorkspaceGroup = {
          id: generateId(),
          name: trimmed,
          order: file.workspace.groups.length,
        };
        file.workspace.groups.push(group);
        file.workspace.updatedAt = Date.now();
        workspaceRepo.save(workspaceId, file);
        return ok(group);
      } catch (err) {
        return fail(err);
      }
    },
  );

  // 重命名分组
  ipcMain.handle(
    'group:update',
    async (_e, workspaceId: string, groupId: string, patch: Partial<WorkspaceGroup>): Promise<any> => {
      try {
        const file = workspaceRepo.load(workspaceId);
        if (!file) throw new Error(`Workspace not found: ${workspaceId}`);
        const g = file.workspace.groups.find((x) => x.id === groupId);
        if (!g) throw new Error(`Group not found: ${groupId}`);
        if (patch.name !== undefined) {
          const trimmed = patch.name.trim();
          if (!trimmed) throw new Error('分组名称不能为空');
          if (trimmed !== g.name && file.workspace.groups.some((x) => x.name === trimmed && x.id !== groupId)) {
            throw new Error(`分组「${trimmed}」已存在`);
          }
          g.name = trimmed;
        }
        if (patch.order !== undefined) g.order = patch.order;
        if (patch.collapsed !== undefined) g.collapsed = patch.collapsed;
        file.workspace.updatedAt = Date.now();
        workspaceRepo.save(workspaceId, file);
        return ok(g);
      } catch (err) {
        return fail(err);
      }
    },
  );

  // 删除分组：同时把该分组下所有任务的 groupId 置空（归为未分组）
  ipcMain.handle(
    'group:delete',
    async (_e, workspaceId: string, groupId: string): Promise<any> => {
      try {
        const file = workspaceRepo.load(workspaceId);
        if (!file) throw new Error(`Workspace not found: ${workspaceId}`);
        const exists = file.workspace.groups.some((g) => g.id === groupId);
        if (!exists) throw new Error(`Group not found: ${groupId}`);
        file.workspace.groups = file.workspace.groups.filter((g) => g.id !== groupId);
        // 所有被归到该分组的根任务 groupId → null
        for (const task of Object.values(file.tasks)) {
          if (task.groupId === groupId) task.groupId = null;
        }
        // 按 order 重排剩余分组
        file.workspace.groups
          .sort((a, b) => a.order - b.order)
          .forEach((g, i) => (g.order = i));
        file.workspace.updatedAt = Date.now();
        workspaceRepo.save(workspaceId, file);
        return ok<void>(undefined);
      } catch (err) {
        return fail(err);
      }
    },
  );
}
