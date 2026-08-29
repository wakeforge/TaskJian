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

/** 任务区域分组分块 */
export interface GroupSection {
  group: WorkspaceGroup | null;
  roots: TreeNode[];
}

const DEFAULT_FILTER: FilterState = {
  groupId: null,
  tagNames: [],
  statuses: [],
  searchText: '',
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
    // 按 order 排序挂载子节点
    const sortedTasks = Object.values(file.tasks).sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
    for (const t of sortedTasks) {
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
    for (const t of [...tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
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

  // 当前工作区分组列表（按 order 排序）
  const activeGroups = computed<WorkspaceGroup[]>(() => {
    const groups = activeFile.value?.workspace.groups ?? [];
    return [...groups].sort((a, b) => a.order - b.order);
  });

  // groupId → name 快速查找
  const groupMap = computed<Map<string, WorkspaceGroup>>(() => {
    const m = new Map<string, WorkspaceGroup>();
    for (const g of activeGroups.value) m.set(g.id, g);
    return m;
  });

  // 按分组组织过滤后的根任务（用于在任务区域分段渲染）。
  // 输出形如 [{ group: WorkspaceGroup | null, roots: TreeNode[] }, ...]
  // 规则：
  //   - 只在根任务（parentId === null 的节点）上读 groupId；子任务跟随父节点所在分组。
  //   - 分组按 group.order 排序；未分组（groupId 为 null）放到最后一段，group 为 null。
  //   - 过滤命中了 groupId（侧边栏分组筛选）时，仍按相同分段规则，但非命中分组的 roots 为空。
  const groupedFilteredSections = computed<GroupSection[]>(() => {
    const byGroup = new Map<string | null, TreeNode[]>();
    for (const root of filteredTree.value) {
      const gid = root.task.groupId ?? null;
      if (!byGroup.has(gid)) byGroup.set(gid, []);
      byGroup.get(gid)!.push(root);
    }
    const sections: GroupSection[] = [];
    // 1) 有分组的段（按 group.order）
    for (const g of activeGroups.value) {
      sections.push({ group: g, roots: byGroup.get(g.id) ?? [] });
    }
    // 2) 未分组段（若存在任务）
    const ungrouped = byGroup.get(null) ?? [];
    if (ungrouped.length > 0) {
      sections.push({ group: null, roots: ungrouped });
    }
    // 过滤掉空段（但若全为空，则保留一个以让 TaskTree 显示"暂无任务"）
    const nonEmpty = sections.filter((s) => s.roots.length > 0);
    if (nonEmpty.length > 0) return nonEmpty;
    // 如果没任务，但存在分组定义，保留分组空段（让空态更自然），否则返回空数组。
    if (activeGroups.value.length === 0 && ungrouped.length === 0) return [];
    return sections.filter((s) => s.group === null || activeGroups.value.some((g) => g.id === s.group?.id));
  });

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

  async function reorderTask(
    id: string,
    targetParentId: string | null,
    targetIndex: number,
  ) {
    if (typeof window.api === 'undefined') return;
    const wsId = activeWorkspaceId.value;
    if (!wsId || !activeFile.value) return;
    const res = await window.api.task.reorder(wsId, id, targetParentId, targetIndex);
    if (res.code !== 0 || !res.data) return;
    const task = activeFile.value.tasks[id];
    if (!task) return;
    // 更新 parentId 与 order
    const oldParentId = task.parentId;
    task.parentId = targetParentId;
    // 若从根级移出，从 rootOrder 移除
    if (oldParentId === null && targetParentId !== null) {
      activeFile.value.rootOrder = activeFile.value.rootOrder.filter((x) => x !== id);
    }
    // 若移入根级，加入 rootOrder
    if (targetParentId === null && oldParentId !== null) {
      const clamped = Math.max(0, Math.min(targetIndex, activeFile.value.rootOrder.length));
      activeFile.value.rootOrder.splice(clamped, 0, id);
    }
    // 若根级内部重排
    if (targetParentId === null && oldParentId === null) {
      activeFile.value.rootOrder = activeFile.value.rootOrder.filter((x) => x !== id);
      const clamped = Math.max(0, Math.min(targetIndex, activeFile.value.rootOrder.length));
      activeFile.value.rootOrder.splice(clamped, 0, id);
    }
    // 重算同级 order（前端镜像后端逻辑）
    const siblings = Object.values(activeFile.value.tasks)
      .filter((t) => t.id !== id && (t.parentId ?? null) === targetParentId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const clampedIdx = Math.max(0, Math.min(targetIndex, siblings.length));
    siblings.splice(clampedIdx, 0, task);
    siblings.forEach((t, i) => {
      t.order = i;
    });
  }

  // —— 分组 CRUD ——
  async function createGroup(name: string) {
    if (typeof window.api === 'undefined') return;
    const wsId = activeWorkspaceId.value;
    if (!wsId || !activeFile.value) return;
    const res = await window.api.group.create(wsId, name);
    if (res.code !== 0 || !res.data) return;
    activeFile.value.workspace.groups.push(res.data);
    return res.data;
  }

  async function updateGroup(groupId: string, patch: Partial<WorkspaceGroup>) {
    if (typeof window.api === 'undefined') return;
    const wsId = activeWorkspaceId.value;
    if (!wsId || !activeFile.value) return;
    const res = await window.api.group.update(wsId, groupId, patch);
    if (res.code !== 0 || !res.data) return;
    const idx = activeFile.value.workspace.groups.findIndex((g) => g.id === groupId);
    if (idx >= 0) activeFile.value.workspace.groups[idx] = res.data;
    return res.data;
  }

  async function deleteGroup(groupId: string) {
    if (typeof window.api === 'undefined') return;
    const wsId = activeWorkspaceId.value;
    if (!wsId || !activeFile.value) return;
    const res = await window.api.group.delete(wsId, groupId);
    if (res.code !== 0) return;
    activeFile.value.workspace.groups = activeFile.value.workspace.groups.filter(
      (g) => g.id !== groupId,
    );
    // 被删分组下的任务 groupId 置空
    for (const task of Object.values(activeFile.value.tasks)) {
      if (task.groupId === groupId) task.groupId = null;
    }
    // 过滤条件中如果引用了被删分组，清除
    if (filter.value.groupId === groupId) {
      filter.value.groupId = null;
    }
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
    groupMap,
    groupedFilteredSections,
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
    reorderTask,
    createGroup,
    updateGroup,
    deleteGroup,
    setFilter,
    toggleTagFilter,
    toggleStatusFilter,
  };
});
