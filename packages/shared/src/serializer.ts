// 任务序列化器：TaskNode[] + groups + rootOrder → 纯文本。
// 与 parser.ts 互为逆运算（round-trip 一致）。

import { STATUS_PREFIX, type TaskNode, type WorkspaceGroup } from './index';

/** 某层缩进前缀：depth=0 无；depth>=1 时 4 空格*(depth-1) + 树连接符 */
function indentPrefix(depth: number, isLast: boolean): string {
  if (depth === 0) return '';
  const pad = '    '.repeat(depth - 1);
  const connector = isLast ? '└─ ' : '├─ ';
  return pad + connector;
}

/** 格式化单行任务文本：prefix + tags + code? + title */
function formatLine(task: TaskNode): string {
  const prefix = STATUS_PREFIX[task.status];
  let head = prefix;
  if (task.tags.length > 0) {
    head += task.tags.join(' ');
  }
  let tail: string;
  if (task.code !== undefined && task.code !== '') {
    tail = `${task.code}: ${task.title}`;
  } else {
    tail = task.title;
  }
  if (tail === '') return head;
  return `${head} ${tail}`;
}

/**
 * 将任务树序列化为纯文本。
 * @param tasks 全部任务（平铺）
 * @param groups 分组列表（按 order 排序输出表头）
 * @param rootOrder 顶层任务顺序
 */
export function serializeTasks(
  tasks: TaskNode[],
  groups: WorkspaceGroup[],
  rootOrder: string[],
): string {
  const lines: string[] = [];
  const taskMap = new Map<string, TaskNode>(tasks.map((t) => [t.id, t]));
  const groupMap = new Map<string, WorkspaceGroup>(groups.map((g) => [g.id, g]));
  const childrenOf = (parentId: string): TaskNode[] =>
    tasks.filter((t) => t.parentId === parentId);

  let lastGroupId: string | null | undefined = undefined;

  for (const id of rootOrder) {
    const t = taskMap.get(id);
    if (!t) continue;
    const gid = t.groupId ?? null;
    // 分组变化时输出表头（仅当分组存在）
    if (gid !== lastGroupId) {
      if (gid !== null && groupMap.has(gid)) {
        lines.push(`【${groupMap.get(gid)!.name}】`);
      }
      lastGroupId = gid;
    }
    emitTask(t, 0, true, lines, childrenOf);
  }

  return lines.join('\n');
}

/** 递归输出任务及其 note / 子任务 */
function emitTask(
  task: TaskNode,
  depth: number,
  isLast: boolean,
  lines: string[],
  childrenOf: (parentId: string) => TaskNode[],
): void {
  lines.push(indentPrefix(depth, isLast) + formatLine(task));

  // 子行：先 note 段，后子任务；最后一行用 └─，其余用 ├─
  const subLines: { kind: 'note'; text: string }[] = [];
  if (task.note) {
    for (const seg of task.note.split('\n')) {
      subLines.push({ kind: 'note', text: seg });
    }
  }
  const children = childrenOf(task.id);
  const subCount = subLines.length + children.length;

  let i = 0;
  for (const sl of subLines) {
    const isLastSL = i === subCount - 1;
    lines.push(indentPrefix(depth + 1, isLastSL) + sl.text);
    i++;
  }
  for (const child of children) {
    const isLastSL = i === subCount - 1;
    emitTask(child, depth + 1, isLastSL, lines, childrenOf);
    i++;
  }
}
