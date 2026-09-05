// window.api 类型契约（由 preload contextBridge 注入，对齐 IpcResult 统一返回结构）
import type {
  IpcResult,
  ParseResult,
  SettingsFile,
  TagDef,
  TaskNode,
  Workspace,
  WorkspaceFile,
  WorkspaceGroup,
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
    reorder(
      workspaceId: string,
      id: string,
      targetParentId: string | null,
      targetIndex: number,
    ): Promise<IpcResult<TaskNode>>;
    parseText(text: string, tagNames: string[]): Promise<IpcResult<ParseResult>>;
  };
  tag: {
    list(): Promise<IpcResult<TagDef[]>>;
    saveAll(tags: TagDef[]): Promise<IpcResult<TagDef[]>>;
  };
  group: {
    create(workspaceId: string, name: string): Promise<IpcResult<WorkspaceGroup>>;
    update(
      workspaceId: string,
      groupId: string,
      patch: Partial<WorkspaceGroup>,
    ): Promise<IpcResult<WorkspaceGroup>>;
    delete(workspaceId: string, groupId: string): Promise<IpcResult<void>>;
  };
  archive: {
    list(): Promise<IpcResult<TaskNode[]>>;
    restore(taskId: string, targetWorkspaceId: string): Promise<IpcResult<void>>;
  };
  window: {
    minimize(): Promise<void>;
    toggleMaximize(): Promise<void>;
    close(): Promise<void>;
    /** 用系统默认浏览器打开外部链接 */
    openExternal(url: string): Promise<void>;
  };
  export: {
    saveMarkdown(
      content: string,
      defaultName: string,
    ): Promise<IpcResult<{ canceled: boolean; filePath?: string }>>;
  };
  on(channel: string, cb: (...args: unknown[]) => void): void;
}

declare global {
  // vite.config.ts define 注入的常量
  const __APP_VERSION__: string;
  const __BUILD_DATE__: string;

  interface Window {
    api: TaskJianApi;
  }
}

export {};
