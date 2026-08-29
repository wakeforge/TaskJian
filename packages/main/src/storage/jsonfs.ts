// 原子 JSON 读写：读取失败返回 null；写入走 tmp + rename，写前备份原文件到 .bak。
// 使用同步 API，方便 IPC handler 直接调用。
import fs from 'node:fs';
import path from 'node:path';

/**
 * 读取 JSON 文件并解析。
 * - 文件不存在 / 读失败 / JSON 解析失败 → 返回 null
 */
export function readJSON<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const buf = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(buf) as T;
  } catch {
    return null;
  }
}

/**
 * 原子写入 JSON：
 * 1. 若原文件存在，先备份到 <file>.bak（覆盖旧 .bak）
 * 2. 写入 <file>.tmp
 * 3. fs.renameSync(<file>.tmp, <file>) 原子替换
 * rename 失败时原文件不受影响（仍可从 .bak 恢复）。
 */
export function writeJSONAtomic(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  ensureDir(dir);

  const tmpPath = `${filePath}.tmp`;
  const bakPath = `${filePath}.bak`;

  if (fs.existsSync(filePath)) {
    // 备份原文件（同步拷贝，覆盖已有 .bak）
    fs.copyFileSync(filePath, bakPath);
  }

  const content = JSON.stringify(data, null, 2);
  fs.writeFileSync(tmpPath, content, 'utf8');

  // 原子替换：同文件系统下 rename 是原子操作
  fs.renameSync(tmpPath, filePath);
}

/**
 * 递归创建目录（已存在则不报错）。
 */
export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}
