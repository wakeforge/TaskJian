// 任务导出 IPC handler：弹出保存对话框并写入文件。
import { ipcMain, dialog, BrowserWindow } from 'electron';
import { writeFile } from 'node:fs/promises';
import { generateId, type IpcResult } from '@taskjian/shared';

function ok<T>(data: T): IpcResult<T> {
  return { code: 0, message: 'ok', data, reqId: generateId() };
}

function fail(err: unknown): IpcResult {
  const message = err instanceof Error ? err.message : String(err);
  return { code: 1, message, reqId: generateId() };
}

export function registerExportIpc(): void {
  // 弹出保存对话框，将内容写入用户指定路径。
  // content: 文件内容（Markdown 文本）
  // defaultName: 默认文件名（不含扩展名）
  ipcMain.handle(
    'export:saveMarkdown',
    async (_e, content: string, defaultName: string) => {
      try {
        const win = BrowserWindow.getFocusedWindow();
        const result = await dialog.showSaveDialog(win!, {
          title: '导出任务为 Markdown',
          defaultPath: defaultName,
          filters: [{ name: 'Markdown', extensions: ['md'] }],
        });
        if (result.canceled || !result.filePath) {
          return ok({ canceled: true });
        }
        await writeFile(result.filePath, content, 'utf-8');
        return ok({ canceled: false, filePath: result.filePath });
      } catch (err) {
        return fail(err);
      }
    },
  );
}
