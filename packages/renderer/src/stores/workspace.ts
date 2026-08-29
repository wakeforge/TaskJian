import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  FilterState,
  TaskNode,
  TaskStatus,
  Workspace,
  WorkspaceFile,
  WorkspaceGroup,
} from '@taskjian/shared';
import { applyFilter } from '../composables/filters';

/** 任务树节点（递归结构） */
export interface TreeNode {
  task: TaskNode;
  children: TreeNode[];
}

const DEFAULT_FILTER: FilterState = {
  groupId: null,
  tagNames: [],
  statuses: [],
};

export const useWorkspaceStore = defineStore('workspace', () => {
  const workspaces = ref<Workspace[]>([]);
  const activeWorkspaceId = ref<string | null>(null);
  const activeFile = ref<WorkspaceFile | null>(null);
  const filter = ref<FilterState>({ ...DEFAULT_FILTER });

  // 当前工作区全部任务（平铺）
  const activeTasks = computed<TaskNode[]>(() => {
    const file = activeFile.value;
    if (!file) return [];
    return Object.values(file.tasks);
  });

  // 过滤后任务
  const filteredTasks = computed(() => applyFilter(activeTasks.value, filter.value));

  // 按 parentId + rootOrder 构建任务树（全量，不受 filter 影响；用于 Sidebar 分组计数等）
  const taskTree = computed<TreeNode[]>(() => {
    const file = activeFile.value;
    if (!file) return [];
    const nodes: Record<string, TreeNode> = {};
    for (const t of Object.values(file.tasks)) {
      nodes[t.id] = { task: t, children: [] };
    }
    // 按 tasks Record 的插入顺序（即解析文档顺序）挂载子节点
    for (const t of Object.values(file.tasks)) {
      if (t.parentId && nodes[t.parentId] && nodes[t.id]) {
        nodes[t.parentId].children.push(nodes[t.id]);
      }
    }
    const roots: TreeNode[] = [];
    for (const id of file.rootOrder) {
      if (nodes[id]) roots.push(nodes[id]);
    }
    return roots;
  });

  // 基于过滤后任务构建的树（用于 TaskTree 展示）。
  // 子任务命中但父任务被过滤掉时，子任务作为孤儿根节点出现，保证可见性。
  const filteredTree = computed<TreeNode[]>(() => {
    const file = activeFile.value;
    const tasks = filteredTasks.value;
    if (!file || tasks.length === 0) return [];
    const nodes: Record<string, TreeNode> = {};
    for (const t of tasks) {
      nodes[t.id] = { task: t, children: [] };
    }
    for (const t of tasks) {
      if (t.parentId && nodes[t.parentId] && nodes[t.id]) {
        nodes[t.parentId].children.push(nodes[t.id]);
      }
    }
    const roots: TreeNode[] = [];
    for (const t of tasks) {
      // 无 parentId，或父任务不在过滤结果中 → 作为根
      if (!t.parentId || !nodes[t.parentId]) {
        if (nodes[t.id]) roots.push(nodes[t.id]);
      }
    }
    // 按 rootOrder 保持稳定排序
    roots.sort((a, b) => {
      const ai = file.rootOrder.indexOf(a.task.id);
      const bi = file.rootOrder.indexOf(b.task.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return roots;
  });

  // 是否有任何过滤条件激活（用于决定空状态文案）
  const hasActiveFilter = computed(() => {
    const f = filter.value;
    return f.groupId !== null || f.tagNames.length > 0 || f.statuses.length > 0;
  });

  // 状态统计
  const summary = computed(() => {
    const tasks = activeTasks.value;
    const result = { total: tasks.length, todo: 0, progress: 0, blocked: 0, done: 0 };
    for (const t of tasks) {
      if (t.status === 'todo') result.todo++;
      else if (t.status === 'progress') result.progress++;
      else if (t.status === 'blocked') result.blocked++;
      else if (t.status === 'done') result.done++;
    }
    return result;
  });

  // 当前工作区分组列表
  const activeGroups = computed<WorkspaceGroup[]>(() => activeFile.value?.workspace.groups ?? []);

  async function loadAll() {
    if (typeof window.api === 'undefined') return;
    const res = await window.api.workspace.list();
    if (res.code !== 0 || !res.data) return;
    workspaces.value = res.data.workspaces;
    activeWorkspaceId.value = res.data.activeWorkspaceId;
  }

  async function loadActive() {
    if (typeof window.api === 'undefined') return;
    const id = activeWorkspaceId.value;
    if (!id) {
      activeFile.value = null;
      return;
    }
    const res = await window.api.workspace.get(id);
    if (res.code !== 0 || !res.data) {
      activeFile.value = null;
      return;
    }
    activeFile.value = res.data;
  }

  async function setActive(id: string) {
    if (typeof window.api === 'undefined') return;
    const res = await window.api.workspace.setActive(id);
    if (res.code !== 0) return;
    activeWorkspaceId.value = id;
    await loadActive();
  }

  async function createWorkspace(name: string) {
    if (typeof window.api === 'undefined') return;
    const res = await window.api.workspace.create(name);
    if (res.code !== 0 || !res.data) return;
    workspaces.value.push(res.data);
  }

  async function renameWorkspace(id: string, name: string) {
    if (typeof window.api === 'undefined') return;
    const res = await window.api.workspace.rename(id, name);
    if (res.code !== 0 || !res.data) return;
    const idx = workspaces.value.findIndex((w) => w.id === id);
    if (idx >= 0) workspaces.value[idx] = res.data;
    if (activeFile.value?.workspace.id === id) {
      activeFile.value = { ...activeFile.value, workspace: res.data };
    }
  }

  async function deleteWorkspace(id: string) {
    if (typeof window.api === 'undefined') return;
    const res = await window.api.workspace.delete(id);
    if (res.code !== 0) return;
    await loadAll();
    if (activeWorkspaceId.value === id) {
      const next = workspaces.value[0]?.id ?? null;
      if (next) {
        await setActive(next);
      } else {
        activeWorkspaceId.value = null;
        activeFile.value = null;
      }
    }
  }

  async function createTask(partial: Partial<TaskNode>) {
    if (typeof window.api === 'undefined') return;
    const wsId = activeWorkspaceId.value;
    if (!wsId || !activeFile.value) return;
    const res = await window.api.task.create(wsId, partial);
    if (res.code !== 0 || !res.data) return;
    activeFile.value.tasks[res.data.id] = res.data;
    if (!res.data.parentId) {
      activeFile.value.rootOrder.push(res.data.id);
    }
  }

  async function updateTask(id: string, patch: Partial<TaskNode>) {
    if (typeof window.api === 'undefined') return;
    const wsId = activeWorkspaceId.value;
    if (!wsId || !activeFile.value) return;
    const res = await window.api.task.update(wsId, id, patch);
    if (res.code !== 0 || !res.data) return;
    activeFile.value.tasks[id] = res.data;
  }

  async function deleteTask(id: string) {
    if (typeof window.api === 'undefined') return;
    const wsId = activeWorkspaceId.value;
    if (!wsId || !activeFile.value) return;
    const res = await window.api.task.delete(wsId, id);
    if (res.code !== 0) return;
    delete activeFile.value.tasks[id];
    activeFile.value.rootOrder = activeFile.value.rootOrder.filter((x) => x !== id);
  }

  async function archiveTask(id: string) {
    if (typeof window.api === 'undefined') return;
    const wsId = activeWorkspaceId.value;
    if (!wsId || !activeFile.value) return;
    const res = await window.api.task.archive(wsId, id);
    if (res.code !== 0) return;
    delete activeFile.value.tasks[id];
    activeFile.value.rootOrder = activeFile.value.rootOrder.filter((x) => x !== id);
  }

  function setFilter(patch: Partial<FilterState>) {
    filter.value = { ...filter.value, ...patch };
  }

  function toggleTagFilter(name: string) {
    const arr = filter.value.tagNames;
    if (arr.includes(name)) {
      filter.value.tagNames = arr.filter((n) => n !== name);
    } else {
      filter.value.tagNames = [...arr, name];
    }
  }

  function toggleStatusFilter(status: TaskStatus) {
    const arr = filter.value.statuses;
    if (arr.includes(status)) {
      filter.value.statuses = arr.filter((s) => s !== status);
    } else {
      filter.value.statuses = [...arr, status];
    }
  }

  return {
    workspaces,
    activeWorkspaceId,
    activeFile,
    filter,
    activeTasks,
    filteredTasks,
    taskTree,
    filteredTree,
    hasActiveFilter,
    summary,
    activeGroups,
    loadAll,
    loadActive,
    setActive,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
    createTask,
    updateTask,
    deleteTask,
    archiveTask,
    setFilter,
    toggleTagFilter,
    toggleStatusFilter,
  };
});
