# 任 TaskJian

轻办公任务便签 — 基于 Electron + Vue 3 的桌面任务管理应用。

## 项目简介

TaskJian 是一款轻量级的桌面任务管理工具，支持任务分类、标签管理、工作区切换等功能，提供简洁直观的界面帮助用户管理日常任务。

### 技术栈

- **Electron 30** — 跨平台桌面应用框架
- **Vue 3** — 前端框架
- **TypeScript** — 类型安全
- **Vite** — 前端构建工具
- **esbuild** — 主进程/预加载脚本打包
- **Tailwind CSS** — 样式框架
- **Pinia** — 状态管理
- **pnpm workspace** — Monorepo 管理

## 项目结构

```
TaskJian/
├── packages/              # 项目源码（monorepo）
│   ├── main/             # Electron 主进程（Node.js 后端）
│   │   ├── src/
│   │   │   ├── ipc/      # IPC 通信处理（任务/工作区/标签/设置/归档）
│   │   │   ├── storage/  # 数据存储（JSON 文件读写）
│   │   │   ├── index.ts  # 主进程入口
│   │   │   └── menu.ts   # 应用菜单
│   │   └── dist/         # esbuild 打包产物（单文件）
│   │
│   ├── preload/          # 预加载脚本（安全桥接）
│   │   ├── src/
│   │   │   └── index.ts  # 主进程与渲染进程桥接
│   │   └── dist/         # esbuild 打包产物（单文件）
│   │
│   ├── renderer/         # Vue 3 前端 UI（浏览器渲染进程）
│   │   ├── src/
│   │   │   ├── components/  # Vue 组件
│   │   │   ├── views/       # 页面视图
│   │   │   ├── stores/      # Pinia 状态管理
│   │   │   ├── router/      # 路由配置
│   │   │   └── composables/ # 组合式函数
│   │   ── dist-renderer/   # Vite 构建产物
│   │
│   └── shared/           # 共享工具（类型定义 + 解析器 + 序列化器）
│       ├── src/
│       │   ├── index.ts     # 类型定义、常量、generateId()
│       │   ├── parser.ts    # 纯文本任务语法解析器
│       │   └── serializer.ts # 任务数据序列化为纯文本
│       └── dist/         # esbuild 打包产物 + tsc 类型声明
│
├── build/                # 构建资源
│   ├── icon.ico          # 应用图标（Windows）
│   └── icon-source.jpg   # 图标源文件
│
├── scripts/              # 构建脚本
│   └── no-sign.js        # 跳过代码签名脚本
│
├── dist/                 # 打包输出（生成）
│   ├── win-unpacked/     # 免安装版本
│   └── *.exe             # NSIS 安装包
│
├── package.json          # 项目配置
├── pnpm-workspace.yaml   # pnpm 工作区配置
├── electron-builder.yml  # 打包配置
├── tsconfig.base.json    # TypeScript 基础配置
── vitest.config.ts      # 测试配置
```

## 环境要求

- **Node.js** >= 18
- **pnpm** >= 8

## 安装依赖

```bash
pnpm install
```

## 开发

### 启动开发模式

```bash
pnpm dev
```

这会同时启动：
- Vite 开发服务器（http://localhost:5173）
- Electron 应用（esbuild watch 模式热重载）

### 单独启动各部分

```bash
# 仅启动渲染进程开发服务器
pnpm dev:renderer

# 仅启动主进程（需先启动 renderer）
pnpm dev:main
```

## 编译构建

### 构建所有包

```bash
pnpm build
```

构建流程：
1. `packages/shared` → esbuild 打包为 `dist/index.js`（4.2 KB）+ tsc 生成类型声明
2. `packages/main` → esbuild 打包为 `dist/index.js`（19 KB，shared 已内联）
3. `packages/preload` → esbuild 打包为 `dist/index.js`（2 KB，shared 已内联）
4. `packages/renderer` → Vite 构建为 `dist-renderer/`

### 单独构建

```bash
pnpm build:main       # 构建主进程
pnpm build:preload    # 构建预加载脚本
pnpm build:renderer   # 构建渲染进程
```

## 打包发布

### 仅生成免安装版（不打包 NSIS）

```bash
pnpm pack:win
```

输出到 `dist/win-unpacked/TaskJian.exe`，可直接运行。

### Windows NSIS 安装包

```bash
pnpm release:win
```

输出到 `dist/` 目录：
- `win-unpacked/` — 免安装版本
- `TaskJian Setup 1.0.0.exe` — NSIS 安装包

### macOS 安装包

```bash
pnpm release:mac
```

### Linux 安装包

```bash
pnpm release:linux
```

## 测试

```bash
# 运行一次测试
pnpm test

# 监听模式
pnpm test:watch
```

## 类型检查

```bash
pnpm typecheck
```

## 使用说明

### 运行打包后的应用

打包完成后，可以：

1. **使用安装包**：运行 `dist/TaskJian Setup 1.0.0.exe` 安装应用
2. **免安装运行**：直接运行 `dist/win-unpacked/TaskJian.exe`

### 数据存储位置

应用数据存储在用户目录：

- **Windows**: `%APPDATA%/TaskJian/`
- **macOS**: `~/Library/Application Support/TaskJian/`
- **Linux**: `~/.config/TaskJian/`

数据文件包括：
- `settings.json` — 应用设置（标签、主题、侧边栏状态等）
- `workspaces/` — 工作区数据（任务、分组）
- `archive.json` — 归档任务

## 构建架构说明

### 进程模型

TaskJian 采用 Electron 双进程架构：

| 进程 | 运行环境 | 职责 | 构建工具 |
|------|---------|------|---------|
| **Main** | Node.js | 文件系统操作、数据存储、IPC 处理 | esbuild |
| **Preload** | Node.js（受限） | 安全桥接，暴露 IPC 接口给渲染进程 | esbuild |
| **Renderer** | Chromium（浏览器） | UI 展示、用户交互 | Vite |

### 打包产物

esbuild 将 `shared` 包的代码内联到 `main` 和 `preload` 的 bundle 中，最终打包产物：

- 零外部运行时依赖（无需 `node_modules`）
- 每个进程一个 JS 文件（main 19 KB、preload 2 KB）
- 代码经过 minify 压缩

## 常见问题

### 打包时签名失败

项目已配置跳过签名（`scripts/no-sign.js`），如需自定义签名，修改 `electron-builder.yml`：

```yaml
win:
  sign: scripts/no-sign.js  # 或自定义签名脚本
```

### 打包时旧文件残留

构建脚本会自动清理 `dist/` 目录。如果手动打包遇到问题，可先删除旧产物：

```bash
Remove-Item -Recurse -Force dist\win-unpacked
pnpm pack:win
```

## 许可证

MIT
