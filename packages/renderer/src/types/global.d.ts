// window.api 类型契约（由 preload contextBridge 注入，对齐 IpcResult 统一返回结构）
import type {
  IpcResult,
  ParseResult,
  SettingsFile,
  TagDef,
  TaskNode,
  Workspace,
  WorkspaceFile,
} from '@taskjian/shared';

export interface TaskJianApi {
  settings: {
    get(): Promise<IpcResult<SettingsFile>>;
    update(patch: Partial<SettingsFile>): Promise<IpcResult<SettingsFile>>;
  };
  workspace: {
    list(): Promise<
      IpcResult<{ workspaces: Workspace[]; activeWorkspaceId: string | null }>
    >;
    get(id: string): Promise<IpcResult<WorkspaceFile>>;
    setActive(id: string): Promise<IpcResult<void>>;
    create(name: string): Promise<IpcResult<Workspace>>;
    rename(id: string, name: string): Promise<IpcResult<Workspace>>;
    delete(id: string): Promise<IpcResult<void>>;
  };
  task: {
    create(workspaceId: string, partial: Partial<TaskNode>): Promise<IpcResult<TaskNode>>;
    update(workspaceId: string, id: string, patch: Partial<TaskNode>): Promise<IpcResult<TaskNode>>;
    delete(workspaceId: string, id: string): Promise<IpcResult<void>>;
    move(workspaceId: string, id: string, newParentId: string | null): Promise<IpcResult<TaskNode>>;
    archive(workspaceId: string, id: string): Promise<IpcResult<void>>;
    parseText(text: string, tagNames: string[]): Promise<IpcResult<ParseResult>>;
  };
  tag: {
    list(): Promise<IpcResult<TagDef[]>>;
    saveAll(tags: TagDef[]): Promise<IpcResult<TagDef[]>>;
  };
  archive: {
    list(): Promise<IpcResult<TaskNode[]>>;
    restore(taskId: string, targetWorkspaceId: string): Promise<IpcResult<void>>;
  };
  window: {
    minimize(): Promise<void>;
    toggleMaximize(): Promise<void>;
    close(): Promise<void>;
  };
  on(channel: string, cb: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    api: TaskJianApi;
  }
}

export {};
