// 纯文本任务语法解析器
// 输入多行纯文本，输出 ParseResult（groups / tasks / rootOrder / errors）。
// 详见 docs/superpowers/specs/2026-08-29-taskjian-init-design.md 第 4 节 EBNF。

import {
  PREFIX_TO_STATUS,
  generateId,
  type ParseResult,
  type TaskNode,
  type TaskStatus,
  type WorkspaceGroup,
} from './index';

/** 树形前缀字符（├ └ │ ─），用于缩进计算 */
const TREE_CHARS = new Set(['├', '└', '│', '─']);
/** 树形分支字符（├ └ │）每个计 1 层；─ 仅作装饰 */
const BRANCH_CHARS = new Set(['├', '└', '│']);

/** 正则转义 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 计算行缩进层级并剥离前缀，返回 { indent, content } */
function computeIndent(line: string): { indent: number; content: string } {
  let i = 0;
  // Phase 1：前导空白（空格 / Tab），4 空格 = 1 层，Tab = 1 层
  let spaceCount = 0;
  let tabCount = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === ' ') {
      spaceCount++;
      i++;
    } else if (c === '\t') {
      tabCount++;
      i++;
    } else {
      break;
    }
  }
  const wsLevels = Math.floor(spaceCount / 4) + tabCount;

  // Phase 2：树形前缀（├ └ │ ─ 及夹带空格），每个分支字符 = 1 层
  let treeLevels = 0;
  while (i < line.length && (TREE_CHARS.has(line[i]) || line[i] === ' ')) {
    if (BRANCH_CHARS.has(line[i])) treeLevels++;
    i++;
  }

  const content = line.slice(i).replace(/\s+$/, '');
  return { indent: wsLevels + treeLevels, content };
}

/** 从行内容中剥离 tags / code，得到 { tags, code, title } */
function extractTagsCodeTitle(
  s: string,
  tagSet: Set<string>,
  tagPattern: string | null,
): { tags: string[]; code?: string; title: string } {
  const tags: string[] = [];
  let rest = s;

  // 全词匹配、从长到短优先
  if (tagPattern) {
    const tagRe = new RegExp(`^(${tagPattern})(?=$|\\s)`);
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const m = rest.match(tagRe);
      if (!m) break;
      tags.push(m[1]);
      rest = rest.slice(m[0].length).replace(/^\s+/, '');
    }
  }

  // code: ^(\d+):
  let code: string | undefined;
  const codeMatch = rest.match(/^(\d+):/);
  if (codeMatch) {
    code = codeMatch[1];
    rest = rest.slice(codeMatch[0].length).replace(/^\s+/, '');
  }

  const title = rest.replace(/\s+$/, '');
  return { tags, code, title };
}

/**
 * 解析多行纯文本任务语法。
 * @param text 多行纯文本
 * @param tagNames settings.tags[].name 集合，用于全词匹配
 */
export function parseTaskText(text: string, tagNames: string[]): ParseResult {
  const groups: WorkspaceGroup[] = [];
  const tasks: TaskNode[] = [];
  const rootOrder: string[] = [];
  const errors: { line: number; text: string }[] = [];

  const tagSet = new Set(tagNames);
  // 从长到短，保证最长标签优先匹配
  const sortedTags = [...tagSet].sort((a, b) => b.length - a.length);
  const tagPattern = sortedTags.length > 0 ? sortedTags.map(escapeRegex).join('|') : null;

  const lines = text.split(/\r?\n/);
  // 栈：每层最近任务 { indent, taskId }，用于判定 parentId
  const stack: { indent: number; taskId: string }[] = [];
  let currentGroupId: string | null = null;

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const lineNo = idx + 1;
    try {
      // 去尾空白；空行跳过
      const line = rawLine.replace(/\s+$/, '');
      if (line === '') continue;

      const { indent, content } = computeIndent(rawLine);
      if (content === '') continue; // 仅空白行

      // group_header: 【name】
      if (content.startsWith('【') && content.includes('】')) {
        const m = content.match(/^【([^】]*)】/);
        if (m) {
          const id = generateId();
          groups.push({ id, name: m[1], order: groups.length });
          currentGroupId = id;
          continue;
        }
      }

      const firstChar = content[0];
      const isStatusPrefix = Object.prototype.hasOwnProperty.call(PREFIX_TO_STATUS, firstChar);

      // 弹栈找到父任务（indent 严格小于当前行）
      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }
      const parentEntry = stack.length > 0 ? stack[stack.length - 1] : null;

      // 无状态前缀：子行 → note；否则降级为 todo 任务
      if (!isStatusPrefix) {
        if (parentEntry) {
          const parent = tasks.find((t) => t.id === parentEntry.taskId);
          if (parent) {
            parent.note = parent.note ? `${parent.note}\n${content}` : content;
            parent.updatedAt = Date.now();
          }
          continue;
        }
        // 降级为顶层 todo 任务
        const now = Date.now();
        const id = generateId();
        const { tags, code, title } = extractTagsCodeTitle(content, tagSet, tagPattern);
        const task: TaskNode = {
          id,
          parentId: null,
          title,
          status: 'todo' as TaskStatus,
          tags,
          code,
          note: undefined,
          groupId: currentGroupId,
          order: tasks.length,
          createdAt: now,
          updatedAt: now,
        };
        tasks.push(task);
        rootOrder.push(id);
        stack.push({ indent, taskId: id });
        continue;
      }

      // 状态前缀任务
      const status = PREFIX_TO_STATUS[firstChar];
      const prefix = firstChar;
      const rest = content.slice(1).replace(/^\s+/, '');
      const { tags, code, title } = extractTagsCodeTitle(rest, tagSet, tagPattern);
      const now = Date.now();
      const id = generateId();
      const task: TaskNode = {
        id,
        parentId: parentEntry ? parentEntry.taskId : null,
        title,
        status,
        tags,
        code,
        prefix,
        note: undefined,
        groupId: parentEntry ? undefined : currentGroupId,
        order: tasks.length,
        createdAt: now,
        updatedAt: now,
      };
      tasks.push(task);
      if (!parentEntry) rootOrder.push(id);
      stack.push({ indent, taskId: id });
    } catch (err) {
      errors.push({
        line: lineNo,
        text: String(err instanceof Error ? err.message : err),
      });
    }
  }

  return { groups, tasks, rootOrder, errors };
}
