// 归档 IPC handlers：list / restore。
// archive.json#tasks 是一个扁平数组；归档时按子树整体写入。
import { ipcMain } from 'electron';
import { generateId, type IpcResult, TaskNode } from '@taskjian/shared';
import { archiveRepo, workspaceRepo } from '../storage/repo';

function ok<T>(data: T): IpcResult<T> {
  return { code: 0, message: 'ok', data, reqId: generateId() };
}

function fail(err: unknown): IpcResult {
  const message = err instanceof Error ? err.message : String(err);
  return { code: 1, message, reqId: generateId() };
}

/**
 * 在 archive.tasks 数组中收集 rootId 及其所有后代任务（BFS：按 parentId 链向下）。
 * 返回数组顺序：root 在前，其余按发现顺序。
 */
function collectSubtreeFromList(list: TaskNode[], rootId: string): TaskNode[] {
  const result: TaskNode[] = [];
  const root = list.find((t) => t.id === rootId);
  if (!root) return result;
  result.push(root);
  const seen = new Set<string>([rootId]);
  const queue: string[] = [rootId];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const t of list) {
      if (seen.has(t.id)) continue;
      if (t.parentId === current) {
        seen.add(t.id);
        result.push(t);
        queue.push(t.id);
      }
    }
  }
  return result;
}

export function registerArchiveIpc(): void {
  // 返回所有归档任务。
  ipcMain.handle('archive:list', async () => {
    try {
      const archive = archiveRepo.load();
      return ok(archive.tasks);
    } catch (err) {
      return fail(err);
    }
  });

  // 从 archive 移除任务（含子树），写入目标工作区。
  ipcMain.handle(
    'archive:restore',
    async (_e, taskId: string, targetWorkspaceId: string) => {
      try {
        const archive = archiveRepo.load();
        const subtree = collectSubtreeFromList(archive.tasks, taskId);
        if (subtree.length === 0) {
          throw new Error(`Archived task not found: ${taskId}`);
        }
        // 从 archive 移除该子树
        const subtreeIds = new Set(subtree.map((t) => t.id));
        archive.tasks = archive.tasks.filter((t) => !subtreeIds.has(t.id));
        archiveRepo.save(archive);

        // 写入目标工作区
        const file = workspaceRepo.load(targetWorkspaceId);
        if (!file) {
          throw new Error(`Workspace not found: ${targetWorkspaceId}`);
        }
        const now = Date.now();
        // 还原子树 root 的 parentId 为 null（成为目标工作区的根任务）
        const root = subtree[0];
        const originalParentId = root.parentId;
        root.parentId = null;
        for (const t of subtree) {
          // 子树中其他指向原父级的任务也重置（防御性，理论上不会出现）
          if (t.id !== root.id && t.parentId === originalParentId) {
            t.parentId = null;
          }
          // 清除归档标记
          t.archivedAt = undefined;
          t.workspaceId = null;
          t.updatedAt = now;
          file.tasks[t.id] = t;
          if (t.parentId === null && !file.rootOrder.includes(t.id)) {
            file.rootOrder.push(t.id);
          }
        }
        file.workspace.updatedAt = now;
        workspaceRepo.save(targetWorkspaceId, file);
        return ok(undefined);
      } catch (err) {
        return fail(err);
      }
    },
  );
}
