// 路径构建：基于 app.getPath('userData') 构建数据目录结构。
// 为可测试性，导出 createPaths(userDataDir) 工厂；运行时使用 paths（懒加载 electron app）。
import path from 'node:path';

export interface Paths {
  /** userData 根目录 */
  userDataDir: string;
  /** userData/data — 所有应用数据根 */
  dataDir: string;
  /** userData/data/workspaces — 工作区目录 */
  workspacesDir: string;
  /** userData/data/archive — 归档目录 */
  archiveDir: string;
  /** userData/data/settings.json */
  settingsPath: string;
  /** userData/data/archive/archive.json */
  archivePath: string;
  /** userData/logs */
  logsDir: string;
  /** 单个工作区目录：workspaces/<id> */
  workspaceDir: (workspaceId: string) => string;
  /** 单个工作区文件：workspaces/<id>/workspace.json */
  workspaceFilePath: (workspaceId: string) => string;
}

/**
 * 基于 userData 根目录构建全部路径。
 * 纯函数，便于在测试中传入临时目录。
 */
export function createPaths(userDataDir: string): Paths {
  const dataDir = path.join(userDataDir, 'data');
  const workspacesDir = path.join(dataDir, 'workspaces');
  const archiveDir = path.join(dataDir, 'archive');
  const logsDir = path.join(userDataDir, 'logs');

  return {
    userDataDir,
    dataDir,
    workspacesDir,
    archiveDir,
    logsDir,
    settingsPath: path.join(dataDir, 'settings.json'),
    archivePath: path.join(archiveDir, 'archive.json'),
    workspaceDir: (workspaceId: string) => path.join(workspacesDir, workspaceId),
    workspaceFilePath: (workspaceId: string) =>
      path.join(workspacesDir, workspaceId, 'workspace.json'),
  };
}

/**
 * 懒加载 electron app.getPath('userData')，避免在模块导入时即访问 app
 * （app 可能尚未 ready）。仅在主进程运行时调用。
 */
function getUserDataDir(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { app } = require('electron');
  return app.getPath('userData');
}

/**
 * 运行时默认 Paths：通过 getter 懒求取 electron userData，确保 app ready 后才访问。
 * 每次属性访问都基于最新的 userData 路径，避免缓存脏值。
 */
export const paths: Paths = {
  get userDataDir() {
    return getUserDataDir();
  },
  get dataDir() {
    return path.join(getUserDataDir(), 'data');
  },
  get workspacesDir() {
    return path.join(getUserDataDir(), 'data', 'workspaces');
  },
  get archiveDir() {
    return path.join(getUserDataDir(), 'data', 'archive');
  },
  get settingsPath() {
    return path.join(getUserDataDir(), 'data', 'settings.json');
  },
  get archivePath() {
    return path.join(getUserDataDir(), 'data', 'archive', 'archive.json');
  },
  get logsDir() {
    return path.join(getUserDataDir(), 'logs');
  },
  workspaceDir(workspaceId: string) {
    return path.join(getUserDataDir(), 'data', 'workspaces', workspaceId);
  },
  workspaceFilePath(workspaceId: string) {
    return path.join(
      getUserDataDir(),
      'data',
      'workspaces',
      workspaceId,
      'workspace.json',
    );
  },
};
