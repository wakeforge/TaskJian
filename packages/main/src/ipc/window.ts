// 窗口控制 IPC handlers：minimize / toggleMaximize / close。
// 通过 BrowserWindow.getFocusedWindow() 取当前窗口实例，无窗口时静默忽略。
// 由 preload 通过 contextBridge 暴露为 window.api.window.* 供 TitleBar 调用。
import { ipcMain, BrowserWindow } from 'electron';

export function registerWindowIpc(): void {
  ipcMain.handle('window:minimize', () => {
    BrowserWindow.getFocusedWindow()?.minimize();
  });

  ipcMain.handle('window:toggleMaximize', () => {
    const w = BrowserWindow.getFocusedWindow();
    if (!w) return;
    if (w.isMaximized()) {
      w.unmaximize();
    } else {
      w.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    BrowserWindow.getFocusedWindow()?.close();
  });
}
