// 首次启动 seed：settings.json 不存在则写默认 settings；workspaces 目录为空则创建默认工作区。
import { ulid } from 'ulid';
import {
  DEFAULT_TAGS,
  type SettingsFile,
  type Workspace,
  type WorkspaceFile,
} from '@taskjian/shared';
import { settingsRepo, workspaceRepo, type Repos } from './repo';

const APP_VERSION = '1.0.0';
const DEFAULT_WORKSPACE_NAME = '默认工作区';

export interface SeedDeps {
  settings: Repos['settings'];
  workspace: Repos['workspace'];
}

/**
 * 首次启动 seed：
 * 1. 若 settings.json 不存在 → 写默认 settings（DEFAULT_TAGS、activeWorkspaceId=null、theme='system'、
 *    sidebarCollapsed=false、appVersion='1.0.0'、lastMigration=Date.now()）
 * 2. 紧接若 workspaces 目录为空 → 创建默认工作区（ulid id, name='默认工作区', groups=[], order=0）
 *    写入空 WorkspaceFile（tasks={}, rootOrder=[]），并把 settings.activeWorkspaceId 指向它。
 */
export function seedIfEmpty(deps: SeedDeps = { settings: settingsRepo, workspace: workspaceRepo }): void {
  const existingSettings = deps.settings.load();
  if (!existingSettings) {
    const now = Date.now();
    const settings: SettingsFile = {
      version: 1,
      tags: DEFAULT_TAGS,
      activeWorkspaceId: null,
      theme: 'system',
      sidebarCollapsed: false,
      appVersion: APP_VERSION,
      lastMigration: now,
    };
    deps.settings.save(settings);

    // workspaces 为空则创建默认工作区
    const ids = deps.workspace.listIds();
    if (ids.length === 0) {
      const workspaceId = ulid();
      const workspace: Workspace = {
        id: workspaceId,
        name: DEFAULT_WORKSPACE_NAME,
        order: 0,
        groups: [],
        createdAt: now,
        updatedAt: now,
      };
      const file: WorkspaceFile = {
        version: 1,
        workspace,
        tasks: {},
        rootOrder: [],
      };
      deps.workspace.save(workspaceId, file);

      settings.activeWorkspaceId = workspaceId;
      deps.settings.save(settings);
    }
  }
}
