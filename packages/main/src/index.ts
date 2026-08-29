// Electron 主进程入口：
// 1. app.whenReady() → seedIfEmpty() → buildAppMenu() → registerAllIpcHandlers() → createBrowserWindow()
// 2. BrowserWindow：1280x800，最小 768x600，无边框 + 自定义标题栏
// 3. dev 模式 loadURL('http://localhost:5173')，生产 loadFile(renderer/dist-renderer/index.html)
// 4. 全局 mainWindow 引用；window-all-closed 在非 Mac 退出；uncaughtException / unhandledRejection 报错
import path from 'node:path';
import { app, BrowserWindow, dialog } from 'electron';
import { seedIfEmpty } from './storage/seed';
import { registerAllIpcHandlers } from './ipc';
import { buildAppMenu } from './menu';

/** 全局主窗口引用，避免被 GC 回收 */
let mainWindow: BrowserWindow | null = null;

/**
 * 判断是否为 dev 模式：
 * - 优先看 VITE_DEV_SERVER_URL 环境变量
 * - 其次看 NODE_ENV === 'development'
 * - 再次看 process.argv 包含 --dev
 * - 最后回退到 !app.isPackaged（未打包即 dev）
 */
function isDev(): boolean {
  if (process.env.VITE_DEV_SERVER_URL) return true;
  if (process.env.NODE_ENV === 'development') return true;
  if (process.argv.includes('--dev')) return true;
  return !app.isPackaged;
}

function createBrowserWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 768,
    minHeight: 600,
    // 无边框窗口：自定义标题栏
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      // preload 相对 main/dist/index.js：../../preload/dist/index.js
      preload: path.join(__dirname, '../../preload/dist/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev()) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    void win.loadURL(devUrl);
    // dev 模式默认打开 DevTools，便于调试
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // 生产：加载 renderer/dist-renderer/index.html
    const indexHtml = path.join(
      __dirname,
      '../../renderer/dist-renderer/index.html',
    );
    void win.loadFile(indexHtml);
  }

  return win;
}

void app.whenReady().then(() => {
  try {
    // 1. 首次启动 seed（默认 settings + 默认工作区）
    seedIfEmpty();
    // 2. 原生菜单
    buildAppMenu();
    // 3. 注册所有 IPC handlers
    registerAllIpcHandlers();
    // 4. 创建主窗口
    mainWindow = createBrowserWindow();
  } catch (err) {
    console.error('Failed during app startup:', err);
    dialog.showErrorBox(
      '任笺启动失败',
      err instanceof Error ? err.message : String(err),
    );
  }
});

app.on('window-all-closed', () => {
  // 非 Mac：所有窗口关闭即退出；Mac：保留应用活跃
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // Mac：点击 dock 图标重新创建窗口
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createBrowserWindow();
  }
});

process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
  dialog.showErrorBox(
    '任笺未捕获异常',
    err?.message || String(err),
  );
});

process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason);
  dialog.showErrorBox(
    '任笺未处理 Promise 拒绝',
    reason instanceof Error ? reason.message : String(reason),
  );
});
