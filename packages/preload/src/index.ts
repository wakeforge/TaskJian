// Preload bridge：通过 contextBridge.exposeInMainWorld('api', {...}) 暴露类型化 API。
// 不直接暴露 ipcRenderer，仅暴露具体 invoke 方法和 on 监听器。
import { contextBridge, ipcRenderer } from 'electron';
import type {
  ArchiveFile,
  IpcResult,
  ParseResult,
  SettingsFile,
  TagDef,
  TaskNode,
  Workspace,
  WorkspaceFile,
  WorkspaceGroup,
} from '@taskjian/shared';

const api = {
  workspace: {
    list: (): Promise<
      IpcResult<{ workspaces: Workspace[]; activeWorkspaceId: string | null }>
    > => ipcRenderer.invoke('workspace:list'),
    get: (id: string): Promise<IpcResult<WorkspaceFile>> =>
      ipcRenderer.invoke('workspace:get', id),
    create: (name: string): Promise<IpcResult<Workspace>> =>
      ipcRenderer.invoke('workspace:create', name),
    rename: (id: string, name: string): Promise<IpcResult<Workspace>> =>
      ipcRenderer.invoke('workspace:rename', id, name),
    delete: (id: string): Promise<IpcResult<void>> =>
      ipcRenderer.invoke('workspace:delete', id),
    setActive: (id: string): Promise<IpcResult<void>> =>
      ipcRenderer.invoke('workspace:setActive', id),
  },
  task: {
    create: (workspaceId: string, task: Partial<TaskNode>): Promise<IpcResult<TaskNode>> =>
      ipcRenderer.invoke('task:create', workspaceId, task),
    update: (
      workspaceId: string,
      id: string,
      patch: Partial<TaskNode>,
    ): Promise<IpcResult<TaskNode>> =>
      ipcRenderer.invoke('task:update', workspaceId, id, patch),
    delete: (workspaceId: string, id: string): Promise<IpcResult<void>> =>
      ipcRenderer.invoke('task:delete', workspaceId, id),
    move: (
      workspaceId: string,
      id: string,
      newParentId: string | null,
    ): Promise<IpcResult<TaskNode>> =>
      ipcRenderer.invoke('task:move', workspaceId, id, newParentId),
    archive: (workspaceId: string, id: string): Promise<IpcResult<void>> =>
      ipcRenderer.invoke('task:archive', workspaceId, id),
    reorder: (
      workspaceId: string,
      id: string,
      targetParentId: string | null,
      targetIndex: number,
    ): Promise<IpcResult<TaskNode>> =>
      ipcRenderer.invoke('task:reorder', workspaceId, id, targetParentId, targetIndex),
    parseText: (text: string, tagNames: string[]): Promise<IpcResult<ParseResult>> =>
      ipcRenderer.invoke('task:parseText', text, tagNames),
  },
  tag: {
    list: (): Promise<IpcResult<TagDef[]>> => ipcRenderer.invoke('tag:list'),
    saveAll: (tags: TagDef[]): Promise<IpcResult<TagDef[]>> =>
      ipcRenderer.invoke('tag:saveAll', tags),
  },
  group: {
    create: (workspaceId: string, name: string): Promise<IpcResult<WorkspaceGroup>> =>
      ipcRenderer.invoke('group:create', workspaceId, name),
    update: (
      workspaceId: string,
      groupId: string,
      patch: Partial<WorkspaceGroup>,
    ): Promise<IpcResult<WorkspaceGroup>> =>
      ipcRenderer.invoke('group:update', workspaceId, groupId, patch),
    delete: (workspaceId: string, groupId: string): Promise<IpcResult<void>> =>
      ipcRenderer.invoke('group:delete', workspaceId, groupId),
  },
  archive: {
    list: (): Promise<IpcResult<TaskNode[]>> => ipcRenderer.invoke('archive:list'),
    restore: (
      taskId: string,
      targetWorkspaceId: string,
    ): Promise<IpcResult<void>> =>
      ipcRenderer.invoke('archive:restore', taskId, targetWorkspaceId),
  },
  settings: {
    get: (): Promise<IpcResult<SettingsFile>> => ipcRenderer.invoke('settings:get'),
    update: (patch: Partial<SettingsFile>): Promise<IpcResult<SettingsFile>> =>
      ipcRenderer.invoke('settings:update', patch),
  },
  // 窗口控制：minimize / toggleMaximize / close / openExternal，供自定义 TitleBar 及「关于」弹窗调用。
  // 主进程通过 BrowserWindow.getFocusedWindow() 取当前窗口实例。
  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: (): Promise<void> => ipcRenderer.invoke('window:toggleMaximize'),
    close: (): Promise<void> => ipcRenderer.invoke('window:close'),
    openExternal: (url: string): Promise<void> =>
      ipcRenderer.invoke('window:openExternal', url),
  },
  // 任务导出：弹出保存对话框并写入 Markdown 文件。
  export: {
    saveMarkdown: (
      content: string,
      defaultName: string,
    ): Promise<IpcResult<{ canceled: boolean; filePath?: string }>> =>
      ipcRenderer.invoke('export:saveMarkdown', content, defaultName),
  },
  // 通用事件监听器：用于主进程向渲染进程推送事件
  on: (channel: string, cb: (...args: unknown[]) => void): void => {
    ipcRenderer.on(channel, (_e, ...args) => cb(...args));
  },
};

export type Api = typeof api;

contextBridge.exposeInMainWorld('api', api);

// 类型导出，供 renderer 通过 import type 引用（不污染 preload 运行时）
export type {
  ArchiveFile,
  IpcResult,
  ParseResult,
  SettingsFile,
  TagDef,
  TaskNode,
  Workspace,
  WorkspaceFile,
  WorkspaceGroup,
};
