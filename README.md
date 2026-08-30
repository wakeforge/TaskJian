# 任笺 TaskJian

轻办公任务便签 — 基于 Electron + Vue 3 的桌面任务管理应用。

## 项目简介

TaskJian 是一款轻量级的桌面任务管理工具，支持任务分类、标签管理、工作区切换等功能，提供简洁直观的界面帮助用户管理日常任务。

### 技术栈

- **Electron 30** — 跨平台桌面应用框架
- **Vue 3** — 前端框架
- **TypeScript** — 类型安全
- **Vite** — 前端构建工具
- **Tailwind CSS** — 样式框架
- **Pinia** — 状态管理
- **pnpm workspace** — Monorepo 管理

## 项目结构

```
TaskJian/
├── packages/              # 项目源码（monorepo）
│   ├── main/             # Electron 主进程
│   │   ├── src/
│   │   │   ├── ipc/      # IPC 通信处理
│   │   │   ├── storage/  # 数据存储
│   │   │   ├── index.ts  # 主进程入口
│   │   │   └── menu.ts   # 应用菜单
│   │   └── dist/         # 编译产物
│   │
│   ├── preload/          # 预加载脚本
│   │   ├── src/
│   │   │   └── index.ts  # 主进程与渲染进程桥接
│   │   └── dist/         # 编译产物
│   │
│   ├── renderer/         # Vue 3 前端 UI
│   │   ├── src/
│   │   │   ├── components/  # Vue 组件
│   │   │   ├── views/       # 页面视图
│   │   │   ├── stores/      # Pinia 状态管理
│   │   │   ├── router/      # 路由配置
│   │   │   └── composables/ # 组合式函数
│   │   └── dist-renderer/   # Vite 构建产物
│   │
│   └── shared/           # 共享工具
│       ├── src/
│       │   ├── parser.ts    # 数据解析器
│       │   └── serializer.ts # 数据序列化器
│       └── dist/         # 编译产物
│
├── build/                # 构建资源
│   ├── icon.ico          # 应用图标（Windows）
│   └── icon-source.jpg   # 图标源文件
│
├── scripts/              # 构建脚本
│   └── no-sign.js        # 跳过签名脚本
│
├── dist/                 # 打包输出（生成）
│   ├── win-unpacked/     # 免安装版本
│   └── *.exe             # NSIS 安装包
│
├── package.json          # 项目配置
├── pnpm-workspace.yaml   # pnpm 工作区配置
├── electron-builder.yml  # 打包配置
├── tsconfig.base.json    # TypeScript 配置
└── vitest.config.ts      # 测试配置
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
- Electron 应用（热重载）

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

这会编译：
- `packages/shared` → `dist/`
- `packages/main` → `dist/`
- `packages/preload` → `dist/`
- `packages/renderer` → `dist-renderer/`

### 单独构建

```bash
pnpm build:main       # 构建主进程
pnpm build:preload    # 构建预加载脚本
pnpm build:renderer   # 构建渲染进程
```

## 打包发布

### Windows 安装包

```bash
pnpm release:win
```

输出到 `dist/` 目录：
- `win-unpacked/` — 免安装版本（可直接运行 `TaskJian.exe`）
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
- `settings.json` — 应用设置
- `workspaces/` — 工作区数据

## 常见问题

### 打包时提示找不到 ulid 模块

确保已执行 `pnpm install`，并且 `electron-builder.yml` 配置正确：

```yaml
files:
  - node_modules/**/*
asar: false
```

### 打包时签名失败

项目已配置跳过签名（`scripts/no-sign.js`），如需自定义签名，修改 `electron-builder.yml`：

```yaml
win:
  sign: scripts/no-sign.js  # 或自定义签名脚本
```

## 许可证

MIT
