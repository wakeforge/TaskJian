// 任务导出为 Markdown 格式化工具。
import type { TreeNode } from '../stores/workspace';
import { STATUS_LABELS, type TaskStatus } from '@taskjian/shared';

/** 将任务树格式化为 Markdown 文本 */
export function formatTasksAsMarkdown(roots: TreeNode[]): string {
  const lines: string[] = [];
  for (const node of roots) {
    renderNode(node, 0, lines);
  }
  return lines.join('\n');
}

function renderNode(node: TreeNode, depth: number, lines: string[]): void {
  const { task } = node;
  const indent = '  '.repeat(depth);
  const checkbox = task.status === 'done' ? '[x]' : '[ ]';
  const statusLabel = task.status !== 'todo' ? ` \`${STATUS_LABELS[task.status as TaskStatus]}\`` : '';
  const tags = task.tags.length > 0 ? ' ' + task.tags.map((t) => `\`#${t}\``).join(' ') : '';
  const note = task.note ? `\n${indent}  ${task.note}` : '';

  lines.push(`${indent}- ${checkbox} ${task.title}${statusLabel}${tags}${note}`);

  for (const child of node.children) {
    renderNode(child, depth + 1, lines);
  }
}
