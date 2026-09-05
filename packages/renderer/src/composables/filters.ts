import type { FilterState, TaskNode } from '@taskjian/shared';

/**
 * 过滤规则组合（设计 §5.4.1）：
 * - group：若 filter.groupId 非空，只保留 task.groupId === filter.groupId 的根任务（及其子树）
 * - tag：若 filter.tagNames 非空，保留 task.tags 与 filter.tagNames 有交集的任务
 * - status：若 filter.statuses 非空，保留 task.status 在 filter.statuses 中的任务
 * - search：若 filter.searchText 非空，保留 title/code/note 包含关键字（不区分大小写）的任务，
 *   命中节点及其祖先、子孙均保留，保证树结构完整可见
 * 各维度 AND 组合；同一维度内多选 = OR。
 */
export function applyFilter(tasks: TaskNode[], filter: FilterState): TaskNode[] {
  let result = tasks;

  // group 过滤：根任务命中 + 其全部子孙
  if (filter.groupId) {
    const keep = new Set<string>();
    const matchingRootIds = tasks
      .filter((t) => t.parentId === null && t.groupId === filter.groupId)
      .map((t) => t.id);

    // BFS 收集命中的根及其子孙
    const queue = [...matchingRootIds];
    while (queue.length) {
      const id = queue.pop()!;
      if (keep.has(id)) continue;
      keep.add(id);
      for (const t of tasks) {
        if (t.parentId === id && !keep.has(t.id)) queue.push(t.id);
      }
    }
    result = result.filter((t) => keep.has(t.id));
  }

  // tag 过滤：tags 与 filter.tagNames 有交集，显示匹配任务及其上下级节点
  if (filter.tagNames.length > 0) {
    const keep = new Set<string>();

    // 1. 找出直接匹配的任务
    for (const t of result) {
      if (t.tags.some((tag) => filter.tagNames.includes(tag))) {
        keep.add(t.id);
      }
    }

    // 2. 上级扩散：保留命中节点的所有祖先节点（保证树路径可见）
    for (const t of result) {
      if (keep.has(t.id)) {
        let p = t.parentId;
        while (p) {
          if (keep.has(p)) break;
          keep.add(p);
          const parent = tasks.find((x) => x.id === p);
          p = parent?.parentId ?? null;
        }
      }
    }

    // 3. 下级扩散：保留命中节点的所有子孙节点（从全量任务中查找，避免无标签子任务被遗漏）
    let changed = true;
    while (changed) {
      changed = false;
      for (const t of tasks) {
        if (t.parentId && keep.has(t.parentId) && !keep.has(t.id)) {
          keep.add(t.id);
          changed = true;
        }
      }
    }

    result = result.filter((t) => keep.has(t.id));
  }

  // status 过滤：status ∈ filter.statuses
  if (filter.statuses.length > 0) {
    result = result.filter((t) => filter.statuses.includes(t.status));
  }

  // search 过滤：title/code/note 包含关键字（不区分大小写）
  const q = filter.searchText.trim().toLowerCase();
  if (q) {
    const match = (t: TaskNode): boolean =>
      t.title.toLowerCase().includes(q) ||
      (t.note ?? '').toLowerCase().includes(q);
    // 命中节点 → 保留其全部子孙（上下文展开）
    const keep = new Set<string>();
    for (const t of result) {
      if (match(t)) keep.add(t.id);
    }
    // 子孙扩散
    let changed = true;
    while (changed) {
      changed = false;
      for (const t of result) {
        if (t.parentId && keep.has(t.parentId) && !keep.has(t.id)) {
          keep.add(t.id);
          changed = true;
        }
      }
    }
    // 命中节点 → 保留其祖先（保证树路径可见）
    for (const t of result) {
      if (keep.has(t.id)) {
        let p = t.parentId;
        while (p) {
          if (keep.has(p)) break;
          keep.add(p);
          const parent = tasks.find((x) => x.id === p);
          p = parent?.parentId ?? null;
        }
      }
    }
    result = result.filter((t) => keep.has(t.id));
  }

  return result;
}
