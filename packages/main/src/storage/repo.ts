// 三个仓库对象：SettingsRepo / WorkspaceRepo / ArchiveRepo。
// 全部基于 jsonfs 原子操作；为可测试性导出 createRepos(paths) 工厂，运行时直接用导出的单例。
import fs from 'node:fs';
import type {
  ArchiveFile,
  SettingsFile,
  WorkspaceFile,
} from '@taskjian/shared';
import { readJSON, writeJSONAtomic, ensureDir } from './jsonfs';
import type { Paths } from './paths';
import { paths as defaultPaths } from './paths';

export interface SettingsRepo {
  load(): SettingsFile | null;
  save(settings: SettingsFile): void;
}

export interface WorkspaceRepo {
  /** 列出所有工作区 id（workspaces/ 下的目录名） */
  listIds(): string[];
  load(workspaceId: string): WorkspaceFile | null;
  save(workspaceId: string, file: WorkspaceFile): void;
  /** 递归删除整个工作区目录 */
  remove(workspaceId: string): void;
}

export interface ArchiveRepo {
  /** 文件不存在时返回 { version: 1, tasks: [] } */
  load(): ArchiveFile;
  save(file: ArchiveFile): void;
}

export interface Repos {
  settings: SettingsRepo;
  workspace: WorkspaceRepo;
  archive: ArchiveRepo;
}

/**
 * 基于给定 Paths 创建三个仓库实例（便于测试注入临时目录）。
 */
export function createRepos(p: Paths): Repos {
  const settings: SettingsRepo = {
    load(): SettingsFile | null {
      return readJSON<SettingsFile>(p.settingsPath);
    },
    save(s: SettingsFile): void {
      writeJSONAtomic(p.settingsPath, s);
    },
  };

  const workspace: WorkspaceRepo = {
    listIds(): string[] {
      if (!fs.existsSync(p.workspacesDir)) {
        return [];
      }
      const entries = fs.readdirSync(p.workspacesDir, { withFileTypes: true });
      const ids: string[] = [];
      for (const entry of entries) {
        if (entry.isDirectory()) {
          ids.push(entry.name);
        }
      }
      return ids;
    },

    load(workspaceId: string): WorkspaceFile | null {
      return readJSON<WorkspaceFile>(p.workspaceFilePath(workspaceId));
    },

    save(workspaceId: string, file: WorkspaceFile): void {
      const dir = p.workspaceDir(workspaceId);
      ensureDir(dir);
      writeJSONAtomic(p.workspaceFilePath(workspaceId), file);
    },

    remove(workspaceId: string): void {
      const dir = p.workspaceDir(workspaceId);
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };

  const archive: ArchiveRepo = {
    load(): ArchiveFile {
      const file = readJSON<ArchiveFile>(p.archivePath);
      if (file) {
        return file;
      }
      return { version: 1, tasks: [] };
    },

    save(f: ArchiveFile): void {
      ensureDir(p.archiveDir);
      writeJSONAtomic(p.archivePath, f);
    },
  };

  return { settings, workspace, archive };
}

/** 运行时默认仓库单例，绑定到 electron userData。 */
export const { settings: settingsRepo, workspace: workspaceRepo, archive: archiveRepo } =
  createRepos(defaultPaths);
