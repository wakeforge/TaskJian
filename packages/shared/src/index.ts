// TaskJian 共享类型定义

export type TaskStatus = 'todo' | 'progress' | 'blocked' | 'done';

export type ThemeMode = 'light' | 'dark' | 'system';

/** 标签定义（settings.json#tags 每项） */
export interface TagDef {
  name: string;
  color: string;
}

/** 任务节点 */
export interface TaskNode {
  id: string;
  parentId: string | null;
  title: string;
  status: TaskStatus;
  tags: string[];
  code?: string;
  prefix?: string;
  note?: string;
  groupId?: string | null;
  order: number;
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
  workspaceId?: string | null;
}

/** 任务导航分组 */
export interface WorkspaceGroup {
  id: string;
  name: string;
  order: number;
  collapsed?: boolean;
}

/** 工作区 */
export interface Workspace {
  id: string;
  name: string;
  order: number;
  groups: WorkspaceGroup[];
  createdAt: number;
  updatedAt: number;
}

/** workspace.json 文件结构 */
export interface WorkspaceFile {
  version: 1;
  workspace: Workspace;
  tasks: Record<string, TaskNode>;
  rootOrder: string[];
}

/** archive.json 文件结构 */
export interface ArchiveFile {
  version: 1;
  tasks: TaskNode[];
}

/** settings.json 文件结构 */
export interface SettingsFile {
  version: 1;
  tags: TagDef[];
  activeWorkspaceId: string | null;
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  appVersion: string;
  lastMigration: number;
}

/** IPC 统一返回结构 */
export interface IpcResult<T = unknown> {
  code: 0 | number;
  message: string;
  data?: T;
  reqId: string;
}

/** 过滤器状态 */
export interface FilterState {
  groupId: string | null;
  tagNames: string[];
  statuses: TaskStatus[];
  /** 任务搜索关键字（title/code/note 包含匹配，空 = 不过滤） */
  searchText: string;
}

/** 默认标签：优先级等级（紧急/高/中/低） */
export const DEFAULT_TAGS: TagDef[] = [
  { name: '紧急', color: '#e5484d' },
  { name: '高', color: '#f59e0b' },
  { name: '中', color: '#3e63dd' },
  { name: '低', color: '#30a46c' },
];

/** 状态 → 前缀字符映射 */
export const STATUS_PREFIX: Record<TaskStatus, string> = {
  todo: '-',
  progress: '=',
  blocked: '▲',
  done: '*',
};

/** 前缀字符 → 状态映射 */
export const PREFIX_TO_STATUS: Record<string, TaskStatus> = {
  '-': 'todo',
  '=': 'progress',
  '▲': 'blocked',
  '*': 'done',
  '✓': 'done',
};

/** 状态显示名 */
export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '待办',
  progress: '进行中',
  blocked: '受阻',
  done: '已完成',
};

/** 状态颜色 CSS 变量名 */
export const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'var(--taskjian-status-todo)',
  progress: 'var(--taskjian-status-progress)',
  blocked: 'var(--taskjian-status-blocked)',
  done: 'var(--taskjian-status-done)',
};

/** 解析器输出 */
export interface ParseResult {
  groups: WorkspaceGroup[];
  tasks: TaskNode[];
  rootOrder: string[];
  errors: { line: number; text: string }[];
}

export { parseTaskText } from './parser';
export { serializeTasks } from './serializer';
