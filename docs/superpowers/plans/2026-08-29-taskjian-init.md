# 任笺 TaskJian 初始化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从 7 张静态设计稿 + 设计方案 PDF 出发，搭建完整可运行的跨平台 Electron + Vue3 桌面任务管理应用。

**Architecture:** pnpm monorepo 三进程（main/preload/renderer）+ shared 类型包；JSON 文件存储；纯文本语法解析器；Vue3 SPA + Pinia + Tailwind + lucide-vue-next。

**Tech Stack:** Electron 30+, Vue 3.4+, Vite 5+, TypeScript 5.4+, Pinia 2+, Tailwind CSS 3.4+, lucide-vue-next, electron-builder 24+, vitest 1+, ulid, pnpm 9+

**Spec:** `docs/superpowers/specs/2026-08-29-taskjian-init-design.md`

---

## File Structure

```
TaskJian/
├── package.json                  # root workspace + scripts
├── pnpm-workspace.yaml
├── electron-builder.yml
├── tsconfig.base.json
├── vitest.config.ts
├── .gitignore
├── packages/
│   ├── shared/                   # 共享 TS 类型
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/index.ts
│   ├── main/                     # Electron 主进程
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts          # app.whenReady + createWindow + IPC 注册
│   │       ├── menu.ts           # 原生菜单 + 全局快捷键
│   │       ├── ipc/
│   │       │   ├── workspace.ts
│   │       │   ├── task.ts
│   │       │   ├── tag.ts
│   │       │   ├── archive.ts
│   │       │   └── settings.ts
│   │       └── storage/
│   │           ├── paths.ts
│   │           ├── jsonfs.ts
│   │           ├── repo.ts
│   │           └── seed.ts
│   ├── preload/                  # contextBridge
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/index.ts
│   └── renderer/                 # Vue3 SPA
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       ├── postcss.config.js
│       ├── index.html
│       └── src/
│           ├── main.ts
│           ├── App.vue
│           ├── router/index.ts
│           ├── assets/theme.css
│           ├── stores/
│           │   ├── app.ts
│           │   ├── workspace.ts
│           │   ├── archive.ts
│           │   ├── tag.ts
│           │   └── ui.ts
│           ├── composables/
│           │   ├── parser.ts
│           │   ├── serializer.ts
│           │   ├── filters.ts
│           │   └── shortcuts.ts
│           ├── components/
│           │   ├── TitleBar.vue
│           │   ├── Sidebar.vue
│           │   ├── StatusBar.vue
│           │   ├── FilterBar.vue
│           │   ├── FilterChip.vue
│           │   ├── TaskTree.vue
│           │   ├── TaskNodeRow.vue
│           │   ├── StatusDot.vue
│           │   ├── TagChip.vue
│           │   ├── TagFilterPopover.vue
│           │   ├── StatusFilterPopover.vue
│           │   ├── TagManagementDialog.vue
│           │   ├── TaskEditDialog.vue
│           │   ├── EmptyState.vue
│           │   ├── Toast.vue
│           │   └── ConfirmDialog.vue
│           └── views/
│               ├── MainWorkspace.vue
│               └── ArchiveView.vue
├── build/                        # electron-builder 资源（图标）
├── doc/                          # 设计方案.pdf
└── README.md
```

---

## Task 1: 项目脚手架

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `vitest.config.ts`, `.gitignore`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`
- Create: `packages/main/package.json`, `packages/main/tsconfig.json`
- Create: `packages/preload/package.json`, `packages/preload/tsconfig.json`
- Create: `packages/renderer/package.json`, `packages/renderer/tsconfig.json`, `packages/renderer/vite.config.ts`, `packages/renderer/tailwind.config.js`, `packages/renderer/postcss.config.js`, `packages/renderer/index.html`

- [ ] **Step 1: 创建根 workspace 配置**
- [ ] **Step 2: 创建 4 个子包的 package.json + tsconfig.json**
- [ ] **Step 3: 创建 renderer 的 vite/tailwind/postcss 配置**
- [ ] **Step 4: pnpm install 验证依赖解析**
- [ ] **Step 5: Commit**

## Task 2: shared 类型包

**Files:**
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: 定义全部 TS 类型（TaskStatus, TagDef, TaskNode, Workspace, WorkspaceGroup, WorkspaceFile, ArchiveFile, SettingsFile, IpcResult, ThemeMode）**
- [ ] **Step 2: Commit**

## Task 3: 主进程存储层

**Files:**
- Create: `packages/main/src/storage/paths.ts`
- Create: `packages/main/src/storage/jsonfs.ts`
- Create: `packages/main/src/storage/repo.ts`
- Create: `packages/main/src/storage/seed.ts`

- [ ] **Step 1: paths.ts — userData 目录构建**
- [ ] **Step 2: jsonfs.ts — 原子读写 JSON（write-tmp-rename-backup）**
- [ ] **Step 3: repo.ts — WorkspaceRepo / ArchiveRepo / SettingsRepo**
- [ ] **Step 4: seed.ts — 首次启动默认标签 + 默认工作区**
- [ ] **Step 5: Commit**

## Task 4: 纯文本语法解析器 + 序列化器

**Files:**
- Create: `packages/renderer/src/composables/parser.ts`
- Create: `packages/renderer/src/composables/serializer.ts`
- Test: `packages/shared/tests/parser.spec.ts`（放在 shared 便于跨包引用类型）

- [ ] **Step 1: 写 parser 测试用例（≥12 个：4 前缀、多标签、编号、分组、note 行、异常行、嵌套）**
- [ ] **Step 2: 实现 parser.ts（行级状态机 + indent/树前缀层级判定 + tag 全词匹配）**
- [ ] **Step 3: 写 serializer 测试（round-trip 6 个用例）**
- [ ] **Step 4: 实现 serializer.ts**
- [ ] **Step 5: 全部测试通过 + Commit**

## Task 5: 主进程 IPC + preload bridge + 入口

**Files:**
- Create: `packages/main/src/index.ts`
- Create: `packages/main/src/menu.ts`
- Create: `packages/main/src/ipc/workspace.ts`, `task.ts`, `tag.ts`, `archive.ts`, `settings.ts`
- Create: `packages/preload/src/index.ts`

- [ ] **Step 1: IPC handler 实现（workspace/task/tag/archive/settings CRUD）**
- [ ] **Step 2: preload contextBridge 暴露类型化 API**
- [ ] **Step 3: main/index.ts — createBrowserWindow + IPC 注册 + 异常捕获 + 日志**
- [ ] **Step 4: Commit**

## Task 6: 渲染层基础（App + Router + Pinia + Tailwind + theme.css）

**Files:**
- Create: `packages/renderer/src/main.ts`, `App.vue`
- Create: `packages/renderer/src/router/index.ts`
- Create: `packages/renderer/src/assets/theme.css`
- Create: `packages/renderer/src/stores/app.ts`, `workspace.ts`, `archive.ts`, `tag.ts`, `ui.ts`
- Create: `packages/renderer/src/composables/filters.ts`, `shortcuts.ts`

- [ ] **Step 1: main.ts + App.vue 基础壳**
- [ ] **Step 2: theme.css 从 colors_and_type.css 迁移**
- [ ] **Step 3: tailwind.config.js 映射设计令牌**
- [ ] **Step 4: Pinia stores 实现（app/workspace/archive/tag/ui）**
- [ ] **Step 5: composables/filters.ts + shortcuts.ts**
- [ ] **Step 6: pnpm dev 启动验证空白窗口能打开**
- [ ] **Step 7: Commit**

## Task 7: 核心组件（TitleBar/Sidebar/StatusBar/FilterBar/TaskTree）

**Files:**
- Create: `packages/renderer/src/components/TitleBar.vue`
- Create: `packages/renderer/src/components/Sidebar.vue`
- Create: `packages/renderer/src/components/StatusBar.vue`
- Create: `packages/renderer/src/components/FilterBar.vue`
- Create: `packages/renderer/src/components/FilterChip.vue`
- Create: `packages/renderer/src/components/TaskTree.vue`
- Create: `packages/renderer/src/components/TaskNodeRow.vue`
- Create: `packages/renderer/src/components/StatusDot.vue`
- Create: `packages/renderer/src/components/TagChip.vue`
- Create: `packages/renderer/src/views/MainWorkspace.vue`

- [ ] **Step 1: StatusDot + TagChip（原子组件）**
- [ ] **Step 2: TitleBar（应用名 + 工作区名 + min/max/close + 主题切换）**
- [ ] **Step 3: Sidebar（任务导航树 + 工作区列表 + 归档按钮）**
- [ ] **Step 4: FilterBar（标签/状态按钮 + chip 列表 + 管理标签/清除/新建）**
- [ ] **Step 5: TaskNodeRow + TaskTree（递归渲染任务树）**
- [ ] **Step 6: MainWorkspace.vue 组装**
- [ ] **Step 7: pnpm dev 视觉对照设计稿**
- [ ] **Step 8: Commit**

## Task 8: 弹窗/浮层组件

**Files:**
- Create: `packages/renderer/src/components/TagFilterPopover.vue`
- Create: `packages/renderer/src/components/StatusFilterPopover.vue`
- Create: `packages/renderer/src/components/TagManagementDialog.vue`
- Create: `packages/renderer/src/components/TaskEditDialog.vue`
- Create: `packages/renderer/src/components/EmptyState.vue`
- Create: `packages/renderer/src/components/Toast.vue`
- Create: `packages/renderer/src/components/ConfirmDialog.vue`
- Create: `packages/renderer/src/views/ArchiveView.vue`

- [ ] **Step 1: Toast + ConfirmDialog（通用底座）**
- [ ] **Step 2: EmptyState（3 种空态插槽）**
- [ ] **Step 3: TagFilterPopover + StatusFilterPopover**
- [ ] **Step 4: TagManagementDialog（可编辑表格 + 取消/一次保存）**
- [ ] **Step 5: TaskEditDialog（双 Tab：结构化/纯文本）**
- [ ] **Step 6: ArchiveView（只读任务树 + 还原操作）**
- [ ] **Step 7: Commit**

## Task 9: 交互逻辑集成

- [ ] **Step 1: 过滤组合逻辑接入 FilterBar + TaskTree**
- [ ] **Step 2: 快捷键接入（Ctrl+Enter/Esc/Ctrl+S/Ctrl+F）**
- [ ] **Step 3: 工作区新建/重命名/删除（含二次确认 + 删除→归档）**
- [ ] **Step 4: 归档还原流程**
- [ ] **Step 5: Commit**

## Task 10: 响应式断点 + 暗主题

- [ ] **Step 1: viewport 监听 + sidebar 折叠/抽屉**
- [ ] **Step 2: 底栏/过滤条响应式**
- [ ] **Step 3: 主题切换三态 + settings 持久化**
- [ ] **Step 4: Commit**

## Task 11: 打包配置 + 验证

**Files:**
- Create: `electron-builder.yml`
- Create: `build/icon.ico` (占位)

- [ ] **Step 1: electron-builder.yml 配置**
- [ ] **Step 2: pnpm build 全量构建**
- [ ] **Step 3: pnpm release:当前平台 产出安装包**
- [ ] **Step 4: 安装后 smoke test**
- [ ] **Step 5: Commit**
