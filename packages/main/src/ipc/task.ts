// 任务相关 IPC handlers：create / update / delete / move / archive / parseText。
// 删除与归档均递归处理子树。
import { ipcMain } from 'electron';
import { generateId, parseTaskText, type IpcResult, ParseResult, TaskNode } from '@taskjian/shared';
import { archiveRepo, workspaceRepo } from '../storage/repo';

function ok<T>(data: T): IpcResult<T> {
  return { code: 0, message: 'ok', data, reqId: generateId() };
}

function fail(err: unknown): IpcResult {
  const message = err instanceof Error ? err.message : String(err);
  return { code: 1, message, reqId: generateId() };
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
        const id = partial.id ?? generateId();
        // 计算 order：同级（同 parentId）已有任务的最大 order + 1
        const siblings = Object.values(file.tasks).filter(
          (t) => (t.parentId ?? null) === (partial.parentId ?? null),
        );
        const maxOrder = siblings.reduce((mx, t) => Math.max(mx, t.order ?? 0), -1);
        const task: TaskNode = {
          id,
          parentId: partial.parentId ?? null,
          title: partial.title ?? '',
          status: partial.status ?? 'todo',
          tags: partial.tags ?? [],
          prefix: partial.prefix,
          note: partial.note,
          groupId: partial.groupId ?? null,
          order: partial.order ?? maxOrder + 1,
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

  // 拖拽重排：改变任务的 parentId 并指定在目标同级中的插入位置。
  // targetParentId=null 时操作 rootOrder；否则操作同 parentId 子任务的 order 字段。
  ipcMain.handle(
    'task:reorder',
    async (
      _e,
      workspaceId: string,
      id: string,
      targetParentId: string | null,
      targetIndex: number,
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
        // 防止移入自身子树
        if (targetParentId !== null) {
          if (targetParentId === id) {
            throw new Error('Cannot move task into itself');
          }
          const subtree = collectSubtreeIds(file.tasks, id);
          if (subtree.includes(targetParentId)) {
            throw new Error('Cannot move task into its own subtree');
          }
        }

        const oldParentId = task.parentId;
        task.parentId = targetParentId;
        task.updatedAt = Date.now();

        // 1. 从原同级列表移除
        if (oldParentId === null) {
          file.rootOrder = file.rootOrder.filter((tid) => tid !== id);
        }

        // 2. 插入到目标同级列表的指定位置
        if (targetParentId === null) {
          // 根级：操作 rootOrder
          const clamped = Math.max(0, Math.min(targetIndex, file.rootOrder.length));
          file.rootOrder.splice(clamped, 0, id);
        } else {
          // 子级：收集同 parentId 的任务（排除自身），按 order 排序，插入到 targetIndex，重算 order
          const siblings = Object.values(file.tasks)
            .filter((t) => t.id !== id && (t.parentId ?? null) === targetParentId)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          const clamped = Math.max(0, Math.min(targetIndex, siblings.length));
          siblings.splice(clamped, 0, task);
          // 重算所有同级任务 order
          siblings.forEach((t, i) => {
            t.order = i;
          });
        }

        file.workspace.updatedAt = task.updatedAt;
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
