# 任笺 TaskJian 初始化设计（v1.0.0）

> 日期：2026-08-29  
> 范围：从 7 张静态设计稿 + `doc/设计方案.pdf` 出发，搭建**完整可运行**跨平台桌面项目（Win 10+/macOS/Linux），保持与设计稿一致的视觉效果，并补充页面交互与桌面多尺寸适配。  
> 方案：Electron + Vue 3 + Vite + TypeScript + Pinia + JSON 文件存储 + electron-builder 三端打包。  
> 成功标准：`pnpm install && pnpm dev` 能在三端直接启动看到可交互界面；`pnpm release` 能产出对应平台安装包。

---

## 1. 设计决策总览

### 1.1 已确认的关键选择（用户显式或默认同意）

| 项 | 选型 | 理由 |
|---|---|---|
| 桌面外壳 | Electron | 生态成熟、坑最少、跨 Win/Mac/Linux 打包稳定 |
| 渲染层 | Vue 3 + Vite + TS + Pinia + Vue Router | 国内生态最成熟，拆分现有 HTML 设计稿为组件最直接 |
| 自动识别 | 纯文本确定语法解析（无 LLM） | 离线、零依赖、符合 PDF 中"前缀语法"的样例 |
| 持久化 | JSON 文件（每工作区一文件） | 严格对齐 PDF"用户不碰文件但格式清晰可见"，规避 native module |
| 窗口形态 | 单 BrowserWindow，所有弹窗/浮层用 Vue 组件 | 与 7 个设计稿 100% 一致，打包/视觉跨平台一致 |
| 多端适配 | 桌面 4 档响应式（≥1440 / 1024-1439 / 768-1023 / <768） | PDF 是桌面应用，不做移动 PWA |
| 主题 | 明暗两套切换（默认亮，可选暗/跟随系统） | 现有 CSS 已定义 `html.dark`，几零成本 |
| 测试 | vitest 单测 + 主进程 repo 集成测试（parser round-trip、seed、原子写） | 首版不做 E2E |
| 打包 | electron-builder：nsis exe + dmg(arm64/x64) + AppImage | 三端安装器 |

### 1.2 不做（首版范围之外）
- 不接 LLM / Ollama 自然语言识别（若后续需要再扩展 parser 插件层）
- 不做多端同步 / 云 / 账号 / 多人协作
- 不做独立子窗口（所有弹窗统一走 Vue Modal / Drawer / Popover）
- 不做移动端原生打包或 PWA（仅桌面浏览器级适配）

---

## 2. 架构 & 目录

### 2.1 三层进程模型（Electron 标准）

```
┌─────────────────────────────────────────────────────────┐
│ Renderer (Vue3 SPA)  ──contextBridge IPC invoke/on──▶   │
│                         Preload (Type-safe API)          │
│                                                  │       │
│                               Main (Electron + storage)  │
│                                   JSON Repo ──▶ userData │
└─────────────────────────────────────────────────────────┘
```

- 渲染进程永不直接碰磁盘；所有数据改动走 IPC invoke 进入主进程。
- IPC 返回统一结构：`{ code: 0|非0, message: string, data: T, reqId: string }`。
- 主进程所有 handler 在 `packages/main/src/ipc/*` 中注册，handler 只做**请求校验**与**仓库对象调用**，不写业务逻辑直接落盘。

### 2.2 Monorepo（pnpm workspace）

```
TaskJian/
├── package.json                  # scripts: dev / build / test / release
├── pnpm-workspace.yaml
├── electron-builder.yml
├── tsconfig.base.json
├── vitest.config.ts              # shared+renderer+main 共享 vitest 配置
├── packages/
│   ├── main/                     # Electron Main (TS tsc -> dist-main)
│   │   ├── src/
│   │   │   ├── index.ts          # app.whenReady + createBrowserWindow + IPC 注册 + 日志
│   │   │   ├── menu.ts           # 原生应用菜单 + 快捷键（与 composables/shortcuts 映射保持一致）
│   │   │   ├── ipc/
│   │   │   │   ├── workspace.ts  # 工作区 CRUD / 切换 / 重命名 / 删除
│   │   │   │   ├── task.ts       # 任务 CRUD / 改父级 / 拖放排序 / 归档 / 还原
│   │   │   │   ├── tag.ts        # 标签 CRUD 批量保存（一次性写 settings.json）
│   │   │   │   ├── archive.ts    # 归档查询 / 还原
│   │   │   │   └── settings.ts   # 主题、活动工作区、版本号字段读写
│   │   │   └── storage/
│   │   │       ├── paths.ts      # userData + data/ 子目录构建
│   │   │       ├── jsonfs.ts     # 原子 JSON 读写：读取带校验；写入 tmp+rename+fsync+backup
│   │   │       ├── repo.ts       # WorkspaceRepo / ArchiveRepo / SettingsRepo 三类仓库
│   │   │       └── seed.ts       # 首次启动 seed：默认标签 + 默认工作区
│   │   └── package.json
│   ├── preload/
│   │   └── src/index.ts          # contextBridge.exposeInMainWorld('api', {...})，与 shared 类型一致
│   ├── renderer/                 # Vue 3 SPA (Vite)
│   │   ├── index.html
│   │   ├── vite.config.ts        # build.outDir=dist-renderer，别名 @ -> src，electron 互操作适配
│   │   ├── src/
│   │   │   ├── main.ts / App.vue
│   │   │   ├── router/index.ts   # 路由：/main (工作区主视图) /archive (归档视图)
│   │   │   ├── stores/
│   │   │   │   ├── app.ts        # theme, sidebarCollapsed, viewport 尺寸桶
│   │   │   │   ├── workspace.ts  # 工作区列表、当前工作区、任务树、过滤状态、计算属性(统计)
│   │   │   │   ├── archive.ts    # 归档任务列表（纯只读）
│   │   │   │   ├── tag.ts        # 标签定义缓存（来自 settings）
│   │   │   │   └── ui.ts         # 浮层开关、弹窗 props、Toast 队列
│   │   │   ├── composables/
│   │   │   │   ├── parser.ts     # 行级语法解析：TaskNode 产出 + 分组识别 + 父子挂载
│   │   │   │   ├── serializer.ts # TaskNode[] → 可编辑纯文本（round-trip 一致）
│   │   │   │   ├── filters.ts    # 过滤规则组合（AND 分组, OR tags, OR statuses）
│   │   │   │   └── shortcuts.ts  # Ctrl+Enter 新建、Esc 关闭浮层、Ctrl+F 聚焦过滤条 等
│   │   │   ├── components/       # 见第 4 节组件映射
│   │   │   ├── assets/theme.css  # 直接来自 taskjian-ui/colors_and_type.css 设计令牌
│   │   │   └── types/shims-vue.d.ts
│   │   └── package.json
│   └── shared/
│       └── src/index.ts          # 共用 TS 类型（见第 3 节）
├── data/                         # 开发期示例目录占位（运行时用 userData）
├── doc/                          # 现有：设计方案.pdf
└── LICENSE / README.md
```

### 2.3 数据流（读写各一条）

**读（首屏/视图切换）**：Vue 页面 onMounted → Pinia action `load()` → `window.api.*.listAll/getCurrent` → Main `repo.load()` → `jsonfs.read()` 返回全量快照 → Pinia setState。  
**写（任意改动）**：Pinia action → `window.api.*.create/update/delete` → Main handler 校验 → `repo.*` → `jsonfs.writeAtomic()`（tmp→rename→backup）→ 返回新快照 → Pinia setState → UI 立即响应。  
**跨端状态**：主进程是单一真相源，渲染进程任何本地缓存若与 IPC 返回不一致，**以 IPC 返回为准**覆盖。

---

## 3. 数据模型 & 存储格式

### 3.1 共享类型（`packages/shared/src/index.ts`）

```ts
export type TaskStatus = 'todo' | 'progress' | 'blocked' | 'done';
export interface TagDef { name: string; color: string; }            // settings.tags 每项

export interface TaskNode {
  id: string;                                 // ULID
  parentId: string | null;                    // 父子关系，null = 顶层
  title: string;                              // 已剥离前缀/标签的纯标题
  status: TaskStatus;
  tags: string[];                             // 命中 tag.name 集合；顺序按文本中出现顺序
  code?: string;                              // 行前缀序号，例 "101"
  prefix?: string;                            // 原始前缀字符（= - ▲ * ✓）保留给反序列化偏好
  note?: string;                              // 子行备注文本（非独立任务的描述子行拼接）
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;                        // 存在 = 已归档
  workspaceId: string | null;                 // 归档任务保留来源工作区 ID（便于还原）
}

export interface WorkspaceGroup {             // 任务导航分组（来自【分组名】或手动新增）
  id: string;
  name: string;
  order: number;
  collapsed?: boolean;                        // 侧栏折叠态
}

export interface Workspace {
  id: string;                                 // ULID（与目录名一致，避免中文路径问题）
  name: string;                               // 显示名
  order: number;                              // 侧边栏顺序
  groups: WorkspaceGroup[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceFile {
  version: 1;
  workspace: Workspace;
  tasks: Record<string, TaskNode>;            // id -> node
  rootOrder: string[];                        // 顶层任务顺序（id 列表）
}

export interface ArchiveFile {
  version: 1;
  tasks: TaskNode[];                          // 所有已归档任务平铺，内部维护 archivedAt 排序
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface SettingsFile {
  version: 1;
  tags: TagDef[];
  activeWorkspaceId: string | null;           // null = 没有任何工作区，显示空态
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  appVersion: string;
  lastMigration: number;                      // 时间戳，升级迁移辅助
}

// IPC 统一返回
export interface IpcResult<T> {
  code: 0 | number;
  message: string;
  data?: T;
  reqId: string;
}
```

### 3.2 运行时数据目录

根：`app.getPath('userData')`（平台标准位置）

```
userData/
├── logs/                         # app-YYYYMMDD.log（保留 7 天）
└── data/
    ├── settings.json             # 全局设置、标签、主题
    ├── archive/
    │   └── archive.json
    └── workspaces/
        ├── <workspaceId_ulid>/   # 不用中文名做目录，避免跨文件系统编码坑
        │   └── workspace.json
        └── ...
```

> **为什么目录用 ULID 不用工作区名？**  
> PDF 设计的 `data/workspaces/科技部工作/workspace.json` 方案有重名、改名、非法字符、跨平台编码等坑。**目录改为 ULID**，工作区显示名存于 `workspace.json.workspace.name`，这在用户层面完全不可见，符合"用户不碰文件"原则。若后续你需要"人工可识别"的备份文件名，则在**导出备份**功能中再提供。

### 3.3 首次启动 Seed（`storage/seed.ts`）

顺序：

1. 若 `settings.json` 不存在：
   - 写入默认标签（PDF 指定）：
     ```yaml
     P0: #e5484d
     P1: #e5484d
     S1: #8e4ec6
     S2: #8e4ec6
     T0: #3e63dd
     ED: #30a46c
     ```
   - `theme = 'system'`，`appVersion = pkg.version`。
2. 若 `workspaces/*` 为空目录：创建 `id = ulid()`、`name = '默认工作区'` 的工作区，写入空 `WorkspaceFile`。
3. 若 `activeWorkspaceId` 指向的工作区不存在：自动回退为任意现存工作区第一个；若无现存工作区，置为 `null`（主界面显示空态，引导新建）。

### 3.4 工作区删除 → 归档兜底

删除工作区（用户操作）流程：

1. 从 workspace.json 读所有 tasks；全部赋 `archivedAt = Date.now()`、保留 `workspaceId = 原工作区id`；批量追加到 archive.json.tasks；
2. 删除 `workspaces/<id>` 目录；
3. 从 settings.activeWorkspaceId 中清除（若被删的是当前工作区，则切换为空态）；
4. 返回成功 + 新的工作区列表快照。

**不可恢复删除（清空归档）** 不提供（PDF 设计原则："归档区兜底"）。

---

## 4. 纯文本语法解析器（核心）

### 4.1 EBNF（单文件规则）

```
(* 一次解析接受 "多行纯文本"；输出 WorkspaceGroup[] + TaskNode[] + 根顺序 *)

document      = line (nl line)*
line          = group_header | task_line | note_line

group_header  = '【' text '【'之外任意字符 '】' [ws]
                → WorkspaceGroup.name = 括号内文字；后续顶层任务归属此 group，直到下一个 group_header

task_line     = [indent] status_prefix [ws] (tag [ws])* [code]? title
                → TaskNode（挂到最近父级）

status_prefix = '='             → progress
                | '-'           → todo
                | '▲'           → blocked
                | ('*' | '✓')   → done
                ;
indent        = '    '          (4 空格 = +1 层)
                | '\t'          (Tab = +1 层)
                | tree_prefix   (├─ / └─ / │  … 按可见树形前缀，自动取行对齐全局最大层数)
                ;
tree_prefix_chars = '├' | '└' | '│' | '─' | ' ' ;
tree_prefix   = tree_prefix_chars+ ;

tag           = /\b([A-Za-z]+\d*)\b/ 的命中且属于 settings.tags[].name（严格大小写；长度从长到短优先匹配）
code          = /(\d+):/        → TaskNode.code
title         = /[^\n]+/        → 行尾剩余文本；剥离已识别的 prefix/tags/code 后作为 title

note_line     = 子行（indent > 父任务 indent）且不匹配 task_line 前缀
                → 父任务的 note（多条 note 行合并；超长自动截断加 "…"，鼠标悬停 title/note 原生 tooltip 或自实现 el-tooltip 展示完整）
```

### 4.2 父子关系判定
- 优先使用 indent 层差；
- 出现 `├─` / `└─` 时，用**同一文档内树前缀的最大对齐列**推断层号；
- 任何解析冲突（缩进小于上层但前缀显示为子）以缩进为主，并保留原始 prefix 到 `TaskNode.prefix` 以便人类再编辑。

### 4.3 典型样例（来自 PDF 主界面）输入 → 期望产出

```
输入：
【国库支付】
=S2 101: 国库支付 - 中间业务
└─ 原始请求为每个字 …
-T1 信创版本测试（联系南 …
└─ *ED 其他流水凭证
-T1 开始上云整理流程
├─ *ED 测试云 V+ 测试报告
├─ *ED (已经开展) 渗透测试
├─ *ED 云服务创建 +redis
└─ -T0 环境配置，下发申请
```

期望输出：
```
groups: [{ id: ulid(), name: "国库支付", order: 0 }]
rootOrder: [id(=S2 101: 国库支付 - 中间业务), id(-T1 信创版本…), id(-T1 开始上云整理流程)]
任务树：
  - "国库支付 - 中间业务"  (progress, tags=[S2], code=101, note="原始请求为每个字 …")
      └─ (无子任务，note 描述用 └─ 文本)
  - "信创版本测试（联系南 …"  (todo, tags=[T1])
      └─ "其他流水凭证" (done, tags=[ED])
  - "开始上云整理流程" (todo, tags=[T1])
      ├─ "测试云 V+ 测试报告" (done, tags=[ED])
      ├─ "(已经开展) 渗透测试" (done, tags=[ED])
      ├─ "云服务创建 +redis" (done, tags=[ED])
      └─ "环境配置，下发申请" (todo, tags=[T0])
```

### 4.4 序列化（round-trip）
`TaskNode[] + groups` → 纯文本。规则：
- `【group.name】` 开头；
- 每层 4 空格缩进（除非 `prefix` 有原始树字符且用户设置"保留树形"）；
- `status_char + tags.join(' ') + code? + ': ' + title`；
- 子任务无 note 则下一行 4 空格缩进 + `note text`。
- **Round-trip 测试断言**：`parse(serialize(parse(X))) == parse(X)`（比较 `id/title/status/tags/code/note/parentId/order`）。

### 4.5 异常降级
任意行异常（含未知前缀、tags 全不匹配、非法缩进）：该行降级为最近父任务 note 或独立任务（`todo + 空tags`），且在该行视觉上给一个灰色 `!` 提示"解析不完整，建议手动调整"。不抛出错误、不中断整个树显示。

---

## 5. UI 视觉还原 & 交互

### 5.1 视觉令牌复用
- 直接将 `taskjian-ui/colors_and_type.css` 作为 `renderer/src/assets/theme.css` 引入（注释保留、不做二次色值手写）。
- 工程化接入 Tailwind CSS（`tailwindcss@3` + `postcss` + `autoprefixer`），`tailwind.config.js` 中映射：
  ```js
  // 与现有设计稿 CDN 版 @theme 块完全对应，确保 class 同名一致可用
  theme: {
    extend: {
      colors: {
        background: 'var(--taskjian-background)',
        foreground: 'var(--taskjian-foreground)',
        card:       'var(--taskjian-card)',
        'card-foreground':'var(--taskjian-card-foreground)',
        popover:    'var(--taskjian-popover)',
        'popover-foreground':'var(--taskjian-popover-foreground)',
        primary:    'var(--taskjian-primary)',
        'primary-foreground':'var(--taskjian-primary-foreground)',
        muted:      'var(--taskjian-muted)',
        'muted-foreground':'var(--taskjian-muted-foreground)',
        border:     'var(--taskjian-border)',
        input:      'var(--taskjian-input)',
        ring:       'var(--taskjian-ring)',
      },
      borderRadius: {
        sm: 'var(--taskjian-radius-small)',
        md: 'var(--taskjian-radius-medium)',
        lg: 'var(--taskjian-radius-large)',
      },
      boxShadow: {
        1: 'var(--taskjian-shadow-1)',
        2: 'var(--taskjian-shadow-2)',
        3: 'var(--taskjian-shadow-3)',
      },
      fontFamily: {
        sans: 'var(--taskjian-font-sans)',
        mono: 'var(--taskjian-font-mono)',
      }
    }
  }
  ```
- Lucide 图标用 `lucide-vue-next`；对原设计稿所有 `data-lucide` 名字 1:1 迁移为 `<CheckSquare/>` 等 Vue 组件，尺寸 class `w-3.5 h-3.5` 原样保留。

### 5.2 7 个设计稿页面 → 运行时组件映射

| 设计稿 | 渲染层形态 | 触发方式 |
|---|---|---|
| pages/main.html | 视图：`views/MainWorkspace.vue` | 路由 `/main`（默认） |
| pages/tag-filter.html | 组件：`TagFilterPopover.vue` | 顶栏「标签」按钮 Popover |
| pages/status-filter.html | 组件：`StatusFilterPopover.vue` | 顶栏「状态」按钮 Popover |
| pages/tag-management.html | 组件：`TagManagementDialog.vue` | 顶栏「管理标签」或 TagFilterPopover 底部「管理标签...」 按钮 |
| pages/task-edit.html | 组件：`TaskEditDialog.vue` | 单击任务行 / Ctrl+Enter / 顶栏「新建」按钮 |
| pages/archive.html | 视图：`views/ArchiveView.vue` | 侧栏「归档」按钮 / 路由 `/archive` |
| pages/empty-state.html | 组件：`EmptyState.vue`（插槽化 3 个文案） | ①无工作区 ②过滤空结果 ③归档空 |

### 5.3 组件列表（renderer/src/components）
```
TitleBar.vue                  # 标题栏：应用名+当前工作区 / 拖拽 / min/max/close
Sidebar.vue                   # 左侧：任务导航分区树 + 工作区列表 + 归档按钮 + 折叠态
SidebarWorkspacesList.vue     # 工作区列表子组件（内联新建、右键菜单）
SidebarNavTree.vue            # 任务导航分组子组件（折叠展开、点击切换当前 group filter）
StatusBar.vue                 # 底栏：左统计 / 中快捷键提示 / 右版本号
FilterBar.vue                 # 顶栏过滤：两个 Popover 按钮 + chip 列表 + 管理标签/清除全部 + 新建
FilterChip.vue                # 过滤 chip：可移除 ×
TaskTree.vue                  # 任务树容器（递归渲染 TaskNodeRow 自身）
TaskNodeRow.vue               # 单行：状态点、标签 chip(s)、编号、标题、note；悬浮菜单 编辑/归档/删除
StatusDot.vue                 # 4 色 SVG 状态点（直接复用 taskjian-ui 的 <svg viewBox…）
TagChip.vue                   # 按 settings.tags[].color 动态背景色 + 白字
TagFilterPopover.vue          # 勾选标签（含全选/反选 / 搜索框可选加分；首版不做搜索）
StatusFilterPopover.vue       # 勾选 4 状态
TagManagementDialog.vue       # 可编辑表格：名称 / 颜色 / 删除；顶部新增；底部取消+一次性保存
TaskEditDialog.vue            # 双 Tab：结构化编辑 / 纯文本编辑；实时双向预览
WorkspaceNewInlineInput.vue   # 工作区侧栏标题 + 按钮后展开的 inline 重命名/新建输入框
ContextMenu.vue               # 通用右键菜单（工作区重命名删除 / 任务行操作）
Toast.vue + ToastContainer    # 全局轻量提示（parse 降级、写失败、删除确认等）
ConfirmDialog.vue             # 通用二次确认：删除工作区 / 批量清除归档（若开放）
EmptyState.vue                # 3 种空态插槽（无工作区/无结果/归档空）
```

### 5.4 关键交互实现点
1. **过滤（AND 组合）**：
   - 输入：`currentGroupId`（来自侧栏分组）/ `selectedTagNames[]` / `selectedStatuses[]`。
   - 规则：`group=当前分组 AND (tag∈selectedTags OR 无标签筛选) AND (status∈selectedStatuses OR 无状态筛选)`；**同一维度多选 = OR**，跨维度 = AND。
   - 过滤结果行数为 0 → 任务区插入 `EmptyState.vue`（"当前没有匹配的任务"）。
2. **任务导航侧栏上方分组树**：来自 workspace.groups；分组名旁右侧小圆数字为**该分组下所有顶层任务**的数量（含递归？——按 PDF 计数 6、7、3，**含子任务总数**，因此递归计算）。当前选中分组用 `bg-muted` + `font-medium`；子分组缩进=父+16px；折叠箭头 `chevron-right/down` 跟随 collapsed 状态。
3. **工作区管理**：
   - 切换 = 直接点击侧栏列表项：stores.workspace.setActive → IPC settings 写入 activeWorkspaceId + 读对应 workspace.json。
   - 新建 = 点击工作区标题栏右侧 `＋`：`WorkspaceNewInlineInput.vue` 插在列表首行，focus 输入框，回车创建，Esc 取消；失败 Toast。
   - 重命名 = 右键 → 重命名：当前项变内联输入框，确认后写 workspace.name + settings（如 active 名变化，标题栏实时刷新）。
   - 删除 = 右键 → 删除：弹 `ConfirmDialog`（"删除 XX 工作区后，其所有任务将移入**归档区**，确定继续？"）；确认后走 3.4 流程。
4. **标签管理弹窗（PDF 核心原则）**：
   - 3 列：名称（`<input>`）、颜色（`<input type=color>` + 色块预览自定义样式）、操作（仅"删除"按钮 1 个）。
   - 新增：`+ 新增标签` 在表尾插入空行，首行自动 focus 名称输入框；默认白色，需用户选色。
   - 保存：点一次 → **整体**diff（对比打开时的 tags 快照）→ 一次 IPC 写入 settings.json → stores.tag 刷新 → 所有 TagChip / TagFilterPopover / StatusFilterPopover 立即重渲。
   - 取消：丢弃所有未保存的修改（弹窗内部维护 `draft` 状态，关闭未保存的离开需要二次确认吗？首版**不二次确认**，遵循"能少一步就少一步"）。
5. **任务编辑弹窗（双 Tab）**：
   - "结构化" Tab：标题输入、4 状态单选 buttons、标签多选 chips（来自 settings.tags）、编号输入、父级下拉选择（同工作区所有任务，扁平搜索）、备注文本域。
   - "纯文本" Tab：多行文本编辑，实时 `parser.parse()` 预览（解析结果以结构化方式显示在右侧 50% 宽度预览列）。保存后统一用解析产出覆盖原任务的结构化字段。
   - 底部取消/保存；保存后立即回写主视图并重排树顺序（父级变化时）。
6. **归档区**：
   - 路由 `/archive`，复用 `TaskTree` 但传 `readonly` 属性：所有 TaskNodeRow 的 hover 操作仅保留"还原到原工作区"1 个按钮（若原工作区不存在→弹"已被删除，是否在当前工作区下新建同名分组并还原？"的 ConfirmDialog）。
   - 侧栏仍保留工作区列表供用户切回，不提供"返回"按钮（PDF 原则：归档不设返回按钮，靠侧栏切回）。
7. **窗口标题栏与底栏**：
   - TitleBar：`-webkit-app-region: drag`；三个按钮调 Electron `win.minimize()/isMaximized()?restore():maximize()/close()`；关闭时（对主窗 `close` 事件）若有未保存的纯文本编辑草稿→二次确认（通过 IPC 向 renderer 广播 `ask-before-quit`，渲染端用 ConfirmDialog 应答结果）。
   - 底栏：
     - 左：由 Pinia `useWorkspaceStore.summary` 计算属性产出 `"共 N 项 · 待办 X · 进行中 Y · 受阻 Z · 已完成 W"`，不手填，确保与实际数据一致。
     - 中：`"快速添加: Ctrl+Enter"`；
     - 右：读取 `import.meta.env.VITE_APP_VERSION ?? pkg.version`，`text-xs text-muted-foreground`。
8. **快捷键映射**（主进程 `menu.ts` + 渲染 `composables/shortcuts.ts` 保持一致）：
   - `Ctrl/Cmd + N` → 新建工作区内联输入
   - `Ctrl/Cmd + Enter` → 立即弹 TaskEditDialog 新建（默认 `-T1 新任务` 模板）
   - `Ctrl/Cmd + F` → 聚焦过滤条（未来扩展搜索）
   - `Esc` → 关闭顶层浮层/弹窗（栈式，每次只关最上层）
   - `Ctrl/Cmd + S` → 若当前有打开的编辑 Dialog，立即保存
   - `Ctrl/Cmd + Tab` → 切换侧栏工作区下一个
   - `Ctrl/Cmd + 1~9` → 快速切换工作区前 N 个

### 5.5 桌面多尺寸响应式（Tailwind 断点）

| 宽度区间 | Tailwind 前缀 | 布局规则 |
|---|---|---|
| ≥1440px | `2xl:` | sidebar 240px；内容区留白；底栏三栏完整；任务树每行紧凑度同设计稿 |
| 1024-1439px | 默认 + `lg:` | sidebar 220px（设计稿原宽度）；底栏三栏完整 |
| 768-1023px | `md:` | sidebar 折叠为 56px 图标栏（悬停展开）；底栏中段"快速添加"隐藏；过滤条 chip 自动换行 |
| <768px | `<md` + `sm:` | Hamburger 按钮触发 Drawer 式侧栏；顶部过滤条 wrap；底栏仅保留左统计计数 |

实现方式：
- Pinia `app.viewport = 'sm' | 'md' | 'lg' | '2xl'`，由 `window.resize` 的 rAF 节流监听 + onMounted 初始化写入。
- 所有尺寸相关的 `class` 优先用 Tailwind 自带响应式前缀；**只在侧栏切换（折叠→抽屉）**时用 `app.viewport` 作为 Drawer 打开与否的判断。
- `prefers-reduced-motion` 遵循设计稿：全局关动画（theme.css 中已写关键 layout，保留）。

### 5.6 暗主题
- 切换入口：TitleBar 最右侧小 `sun/moon` 图标按钮，三态循环：light → dark → system → light。
- 实现：`html.dark` class 切换；system 模式监听 `prefers-color-scheme`。
- 持久化：settings.json `theme` 字段。

---

## 6. 错误处理 & 可观测性

### 6.1 分层错误策略
- **存储层（jsonfs）**：读失败→抛出带类型 `ReadError(corrupt|notfound|perm)`，上层 fallback 空值 + Toast。写失败：先写到 `<file>.tmp`，fsync → rename → 成功删除 `.bak`；rename 失败则自动回滚（保留 `.corrupt.bak` + 原文件不动），并向上抛 `WriteError`。
- **仓库层（repo）**：工作区文件损坏尝试 fallback 空；archive/settings 同样策略；跨文件操作（删除工作区 = 写 archive + 删目录）失败时：已写 archive 追加的条目可重复追加（去重按 id），不丢。
- **IPC 层**：所有 handler try/catch，返回统一 IpcResult；主进程日志到 `logs/app-YYYYMMDD.log`（winston 或轻量自实现），按天切分，保留 7 天。
- **渲染层**：所有 invoke 返回 `code !== 0` → Toast 统一显示 `message`；不 throw 到全局。
- **主进程启动**：`uncaughtException` / `unhandledRejection` → 写日志 + `dialog.showErrorBox(...)` 再 `app.quit(1)`，避免静默闪退。

### 6.2 崩溃兜底
- 渲染进程 crash（`render-process-gone`）：主进程显示 native MessageBox 询问重启当前窗口 `reload()`。
- 退出二次确认：仅当存在"**未保存**的编辑 draft"（stores.ui 维护 editingDirty 字段）才弹。PDF 未提出定时自动保存，首版不做自动保存以防覆盖用户输入。

---

## 7. 测试策略（首版）

### 7.1 单元/集成
`pnpm test` 调用 vitest（run 模式，CI 友好；`pnpm test:watch` 本地开发）：

| 文件 | 覆盖点 | 最少用例 |
|---|---|---|
| `shared/tests/parser.spec.ts` | 4 前缀、多标签、编号、【分组】、note 行、异常行、树形前缀、缩进嵌套 | ≥12 |
| `shared/tests/serializer.spec.ts` | parse → serialize → parse round-trip；空、单层、深 3 层 | ≥6 |
| `renderer/src/stores/__tests__/workspace.spec.ts` | 过滤组合正确性、统计计算、空结果、group 切换 | ≥6 |
| `renderer/src/composables/__tests__/filters.spec.ts` | AND/OR 组合、空条件、维度全选后清除 | ≥5 |
| `main/src/storage/__tests__/jsonfs.spec.ts` | writeAtomic 原子性、corrupt 回读 fallback、backup 生成 | ≥6 |
| `main/src/storage/__tests__/repo.spec.ts` | seed 默认标签/默认工作区、工作区 CRUD、删除→归档兜底、归档还原到不存在工作区回落到新建同名分组 | ≥9 |

### 7.2 不做
- Playwright/Cypress E2E；
- 打包后三端冒烟测试（由构建机或人工发布前 sanity check）。

---

## 8. 打包与发布

### 8.1 Scripts（根 `package.json`）
```json
{
  "scripts": {
    "dev": "concurrently -k -n vite,electron -c blue,magenta \"pnpm --filter @taskjian/renderer dev\" \"wait-on tcp:5173 && pnpm --filter @taskjian/main dev\"",
    "build": "pnpm -r build",
    "test": "vitest run",
    "test:watch": "vitest",
    "release:win":   "pnpm build && electron-builder --win   --x64",
    "release:mac":   "pnpm build && electron-builder --mac   --x64 --arm64",
    "release:linux": "pnpm build && electron-builder --linux --x64",
    "release": "pnpm release:win && pnpm release:mac && pnpm release:linux"
  }
}
```

### 8.2 electron-builder.yml 关键配置
- `appId: com.taskjian.app`，`productName: TaskJian`，`asar: true`
- `directories.output: release/${platform}`，`buildResources: build/` 含三平台图标（`.ico` / `.icns` / `512x512.png`）
- Win：`target: [nsis, zip]`；Mac：`target: [dmg]` 双 arch；Linux：`target: [AppImage]`
- `extraResources`: 不包含开发期 `data/`；首启 seed 来生成用户数据目录
- `files`: 包含 `dist-main/`、`dist-preload/`、`packages/renderer/dist-renderer/**`
- `nsis.perMachine: false`（按用户安装，免管理员）；`dmg.contents` 图标摆位默认即可

### 8.3 应用版本号来源
根 `package.json` 一处是真相；`pnpm build` 时写 `import.meta.env.VITE_APP_VERSION` 给 renderer；主进程启动时读 `app.getVersion()`。settings.json 的 `appVersion` 在每次启动后与当前版本对比，不一致时触发预留迁移 hook 位（首版留空函数不执行）。

---

## 9. 验收标准（Done Definition）

- [ ] `pnpm install` 在干净环境 Windows/macOS/Linux 三端之一能成功（跨本地平台由 CI 补验证）。
- [ ] `pnpm dev` 启动后，窗口显示与 `taskjian-ui/pages/main.html` 视觉一致（色值、字号、圆角、间距、侧栏/过滤条/任务树/底栏布局）。
- [ ] 首次启动：自动创建默认工作区 + 默认 6 标签（P0/P1/S1/S2/T0/ED）；空态引导文案正确。
- [ ] 工作区：新建/重命名/切换/删除（删除后数据进入归档区，删除前二次确认）；侧栏计数实时；TitleBar 工作区名实时；底栏统计与实际一致。
- [ ] 任务：在 TaskEditDialog 的"纯文本 Tab"粘贴 PDF 样例文本 → 解析后任务树结构与主界面设计稿一致；切换"结构化 Tab"字段正确；保存后主界面主树与底栏统计实时更新。
- [ ] 过滤：标签浮层勾选 T0+ED / 状态浮层勾选待办+进行中 / 侧栏分组切换「国库支付」，主树仅显示符合 AND 条件的任务，过滤条 chips 与移除按钮工作，清除全部一键清空。
- [ ] 标签管理：表格改名称、改颜色（取色器点选）、新增、删除，点保存后所有 TagChip、TagFilterPopover 立即可见；取消则回滚到打开前状态。
- [ ] 归档：侧栏点归档 → `/archive`，任务只读；行尾按钮"还原到原工作区"能正确还原（原工作区不存在时弹窗询问→在当前工作区建同名分组并还原）；删除工作区数据的确出现在归档列表。
- [ ] 键盘：Ctrl+Enter / Esc / Ctrl+S / Ctrl+F 4 个核心快捷键均生效并与 UI 一致。
- [ ] 主题：light/dark/system 三态切换 + settings.json 持久化；重启后恢复；所有设计令牌变量切换正确。
- [ ] 响应式：手动拉缩窗口到 4 个断点，侧栏折叠/抽屉、过滤条换行、底栏简化行为与 §5.5 一致。
- [ ] 测试：`pnpm test` 全部通过（parser round-trip、seed、原子写、过滤组合、删除进归档）。
- [ ] 打包：`pnpm release:当前平台` 能产出安装包，安装后首次启动能跑通"首次启动 → 默认工作区 → 粘贴样例文本 → 归档 → 还原"主路径 smoke test。

---

## 10. 范围外 & 未来扩展（留位但不实现）

- 多端同步 / 云账号 / 多人协作。
- LLM 插件化 parser（自然语言无语法识别）。预留 `parser.plugins` 注册点但不实现。
- 附件、提醒、通知、托盘常驻。
- 移动原生 App / PWA。
- 数据导入/导出（JSON 备份/恢复）：后续作为 v1.1 功能可加，不影响本设计数据模型扩展（顶层数组包即可）。

---

## 11. 与 PDF 设计原则逐条对齐（自检用）

| PDF 原则 | 本设计落地 |
|---|---|
| 用户不碰文件 | 全放 userData；目录用 ULID；文件仅由 jsonfs.writeAtomic 读写 |
| 主界面只管过滤；标签/状态配置全进弹窗 | FilterBar 只有 Popover；TagManagement 是独立 Dialog |
| 左栏纯导航（任务导航 + 工作区 + 归档） | Sidebar 三段严格划分；内容区任务树仅渲染 |
| 工作区一目了然 | 侧栏全部列出；当前项高亮（bg-primary/10） |
| 首次启动零配置 | seed 默认 6 标签 + 默认工作区 |
| 底部栏纯信息 | 左统计只读、中快捷键提示、右版本号；无操作入口 |
| 工作区隔离 | 每 workspace.json 一个文件；跨文件操作仅在删除工作区时发生并走归档兜底 |
| 归档区兜底 | 删除工作区 → 全部入归档；**未提供清空归档**入口 |
| 归档区纯只读 | `/archive` 视图所有字段 disabled；仅"还原"1 个操作 |
| 能少一步就少一步 | 标签管理表格"直接改一次保存"；取消不二次确认；Esc 连关栈 |
| 能少一个按钮就少一个按钮 | 标签管理每行仅"删除"；任务编辑仅取消+保存；右键菜单合并多操作到一处 |
| 能少占一行就少一行 | 新建工作区用侧栏标题 `＋` 图标；内联输入框不占整行 |
