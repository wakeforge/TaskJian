// 任务相关 IPC handlers：create / update / delete / move / archive / parseText。
// 删除与归档均递归处理子树。
import { ipcMain } from 'electron';
import { ulid } from 'ulid';
import { parseTaskText } from '@taskjian/shared';
import type { IpcResult, ParseResult, TaskNode } from '@taskjian/shared';
import { archiveRepo, workspaceRepo } from '../storage/repo';

function ok<T>(data: T): IpcResult<T> {
  return { code: 0, message: 'ok', data, reqId: ulid() };
}

function fail(err: unknown): IpcResult {
  const message = err instanceof Error ? err.message : String(err);
  return { code: 1, message, reqId: ulid() };
}

/**
 * 递归收集 rootId 及其所有后代任务 id（BFS：按 parentId 链向下）。
 * 返回数组顺序：root 在前，其余按发现顺序。
 */
function collectSubtreeIds(
  tasks: Record<string, TaskNode>,
  rootId: string,
): string[] {
  const result: string[] = [rootId];
  const queue: string[] = [rootId];
  const seen = new Set<string>([rootId]);
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const tid of Object.keys(tasks)) {
      if (seen.has(tid)) continue;
      if (tasks[tid].parentId === current) {
        seen.add(tid);
        result.push(tid);
        queue.push(tid);
      }
    }
  }
  return result;
}

export function registerTaskIpc(): void {
  // 在指定工作区创建任务：添加到 tasks map；若无 parentId 同步加入 rootOrder。
  ipcMain.handle(
    'task:create',
    async (_e, workspaceId: string, partial: Partial<TaskNode>) => {
      try {
        const file = workspaceRepo.load(workspaceId);
        if (!file) {
          throw new Error(`Workspace not found: ${workspaceId}`);
        }
        const now = Date.now();
        const id = partial.id ?? ulid();
        const task: TaskNode = {
          id,
          parentId: partial.parentId ?? null,
          title: partial.title ?? '',
          status: partial.status ?? 'todo',
          tags: partial.tags ?? [],
          code: partial.code,
          prefix: partial.prefix,
          note: partial.note,
          groupId: partial.groupId ?? null,
          createdAt: partial.createdAt ?? now,
          updatedAt: now,
        };
        file.tasks[id] = task;
        if (!task.parentId) {
          file.rootOrder.push(id);
        }
        file.workspace.updatedAt = now;
        workspaceRepo.save(workspaceId, file);
        return ok(task);
      } catch (err) {
        return fail(err);
      }
    },
  );

  // 更新任务字段（不允许改 id）。
  ipcMain.handle(
    'task:update',
    async (
      _e,
      workspaceId: string,
      id: string,
      patch: Partial<TaskNode>,
    ) => {
      try {
        const file = workspaceRepo.load(workspaceId);
        if (!file) {
          throw new Error(`Workspace not found: ${workspaceId}`);
        }
        const existing = file.tasks[id];
        if (!existing) {
          throw new Error(`Task not found: ${id}`);
        }
        // 不允许通过 patch 改 id
        const { id: _omitId, ...rest } = patch;
        void _omitId;
        Object.assign(existing, rest);
        existing.updatedAt = Date.now();
        file.workspace.updatedAt = existing.updatedAt;
        workspaceRepo.save(workspaceId, file);
        return ok(existing);
      } catch (err) {
        return fail(err);
      }
    },
  );

  // 删除任务（同时递归删除其所有子任务）。
  ipcMain.handle(
    'task:delete',
    async (_e, workspaceId: string, id: string) => {
      try {
        const file = workspaceRepo.load(workspaceId);
        if (!file) {
          throw new Error(`Workspace not found: ${workspaceId}`);
        }
        if (!file.tasks[id]) {
          throw new Error(`Task not found: ${id}`);
        }
        const ids = collectSubtreeIds(file.tasks, id);
        const idSet = new Set(ids);
        for (const tid of ids) {
          delete file.tasks[tid];
        }
        file.rootOrder = file.rootOrder.filter((tid) => !idSet.has(tid));
        const now = Date.now();
        file.workspace.updatedAt = now;
        workspaceRepo.save(workspaceId, file);
        return ok(undefined);
      } catch (err) {
        return fail(err);
      }
    },
  );

  // 改 parentId + 调整 rootOrder（从 root 移出或加入 root）。
  ipcMain.handle(
    'task:move',
    async (
      _e,
      workspaceId: string,
      id: string,
      newParentId: string | null,
    ) => {
      try {
        const file = workspaceRepo.load(workspaceId);
        if (!file) {
          throw new Error(`Workspace not found: ${workspaceId}`);
        }
        const task = file.tasks[id];
        if (!task) {
          throw new Error(`Task not found: ${id}`);
        }
        if (newParentId !== null && !file.tasks[newParentId]) {
          throw new Error(`Parent task not found: ${newParentId}`);
        }
        // 防止把任务移到自己的子树下（形成环）
        if (newParentId !== null) {
          const subtree = collectSubtreeIds(file.tasks, id);
          if (subtree.includes(newParentId)) {
            throw new Error('Cannot move task into its own subtree');
          }
        }
        const wasRoot = task.parentId === null;
        task.parentId = newParentId;
        if (wasRoot && newParentId !== null) {
          // 从根列表移除
          file.rootOrder = file.rootOrder.filter((tid) => tid !== id);
        } else if (!wasRoot && newParentId === null) {
          // 加入根列表末尾
          if (!file.rootOrder.includes(id)) {
            file.rootOrder.push(id);
          }
        }
        const now = Date.now();
        task.updatedAt = now;
        file.workspace.updatedAt = now;
        workspaceRepo.save(workspaceId, file);
        return ok(task);
      } catch (err) {
        return fail(err);
      }
    },
  );

  // 把任务（含子树）移入 archive.json，从 workspace.json 删除。
  ipcMain.handle(
    'task:archive',
    async (_e, workspaceId: string, id: string) => {
      try {
        const file = workspaceRepo.load(workspaceId);
        if (!file) {
          throw new Error(`Workspace not found: ${workspaceId}`);
        }
        if (!file.tasks[id]) {
          throw new Error(`Task not found: ${id}`);
        }
        const ids = collectSubtreeIds(file.tasks, id);
        const idSet = new Set(ids);
        const now = Date.now();
        const archive = archiveRepo.load();
        for (const tid of ids) {
          const task = file.tasks[tid];
          task.archivedAt = now;
          task.workspaceId = workspaceId;
          archive.tasks.push(task);
          delete file.tasks[tid];
        }
        archiveRepo.save(archive);
        file.rootOrder = file.rootOrder.filter((tid) => !idSet.has(tid));
        file.workspace.updatedAt = now;
        workspaceRepo.save(workspaceId, file);
        return ok(undefined);
      } catch (err) {
        return fail(err);
      }
    },
  );

  // 调用 @taskjian/shared 的 parseTaskText，返回 ParseResult。
  ipcMain.handle(
    'task:parseText',
    async (_e, text: string, tagNames: string[]) => {
      try {
        const result: ParseResult = parseTaskText(text, tagNames);
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  );
}
