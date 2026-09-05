<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Archive, CheckCircle2, RotateCcw, Minus, Square, X, CheckSquare, Sun, Moon, Monitor } from 'lucide-vue-next';
import { useAppStore } from '../stores/app';
import { useWorkspaceStore } from '../stores/workspace';
import { useArchiveStore } from '../stores/archive';
import { useUiStore } from '../stores/ui';
import EmptyState from '../components/EmptyState.vue';
import type { TaskNode } from '@taskjian/shared';

const router = useRouter();
const app = useAppStore();
const workspace = useWorkspaceStore();
const archive = useArchiveStore();
const ui = useUiStore();

const appVersion = import.meta.env.VITE_APP_VERSION ?? 'v1.0.0';

const tasks = computed(() => archive.tasks);

// 窗口控制（与 TitleBar 一致，纯 Vite dev 下静默无操作）
function onMinimize() {
  if (typeof window.api !== 'undefined') void window.api.window.minimize();
}
function onToggleMax() {
  if (typeof window.api !== 'undefined') void window.api.window.toggleMaximize();
}
function onClose() {
  if (typeof window.api !== 'undefined') void window.api.window.close();
}
const themeIcon = computed(() => {
  if (app.theme === 'light') return Sun;
  if (app.theme === 'dark') return Moon;
  return Monitor;
});

function formatDate(ts?: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function originalWorkspaceName(task: TaskNode): string {
  const id = task.workspaceId;
  if (!id) return '原工作区';
  const ws = workspace.workspaces.find((w) => w.id === id);
  return ws ? ws.name : '已删除的工作区';
}

function restore(task: TaskNode) {
  const origWsId = task.workspaceId;
  const wsExists = origWsId ? workspace.workspaces.some((w) => w.id === origWsId) : false;

  if (wsExists && origWsId) {
    ui.openConfirm('还原任务', '还原到原工作区？', async () => {
      await archive.restore(task.id, origWsId);
      ui.showToast('已还原到原工作区', 'success');
    });
    return;
  }

  // 原工作区已删除 → 还原到当前工作区
  const currentWsId = workspace.activeWorkspaceId;
  if (!currentWsId) {
    ui.showToast('当前无可用工作区，无法还原', 'error');
    return;
  }
  ui.openConfirm(
    '原工作区已删除',
    '原工作区已删除，是否还原到当前工作区？',
    async () => {
      await archive.restore(task.id, currentWsId);
      ui.showToast('已还原到当前工作区', 'success');
    },
  );
}

function goWorkspace(id: string) {
  router.push('/main');
  workspace.setActive(id);
}

onMounted(async () => {
  await archive.load();
});
</script>

<template>
  <div
    id="app"
    class="h-screen flex flex-col bg-background text-foreground"
    :class="{ dark: app.isDark }"
  >
    <!-- Title bar -->
    <header
      class="h-9 flex items-center justify-between px-3 border-b border-border bg-card shrink-0 select-none"
      data-dom-id="app-title-bar"
      style="-webkit-app-region: drag"
    >
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1.5">
          <CheckSquare class="w-4 h-4 text-primary" />
          <span class="text-sm font-semibold text-foreground tracking-tight">任笺 TaskJian</span>
        </div>
        <span class="text-xs text-muted-foreground">|</span>
        <span class="text-sm font-medium text-foreground">归档</span>
      </div>
      <div class="flex items-center" style="-webkit-app-region: no-drag">
        <button
          type="button"
          aria-label="切换主题"
          title="切换主题"
          class="flex items-center justify-center w-8 h-9 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          @click="app.cycleTheme()"
        >
          <component :is="themeIcon" class="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          aria-label="最小化"
          class="flex items-center justify-center w-8 h-9 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          @click="onMinimize"
        >
          <Minus class="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          aria-label="最大化"
          class="flex items-center justify-center w-8 h-9 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          @click="onToggleMax"
        >
          <Square class="w-3 h-3" />
        </button>
        <button
          type="button"
          aria-label="关闭"
          class="flex items-center justify-center w-8 h-9 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          @click="onClose"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </header>

    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <aside
        class="w-[220px] flex-shrink-0 border-r border-border bg-card flex flex-col overflow-y-auto p-3 gap-3 select-none"
      >
        <section>
          <h2 class="px-2 mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            工作区
          </h2>
          <nav class="space-y-0.5">
            <button
              v-for="w in workspace.workspaces"
              :key="w.id"
              type="button"
              class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-foreground hover:bg-muted transition-colors"
              @click="goWorkspace(w.id)"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-muted-foreground"></span>
              <span class="flex-1 text-left">{{ w.name }}</span>
            </button>
            <p
              v-if="workspace.workspaces.length === 0"
              class="px-2 py-1.5 text-xs text-muted-foreground"
            >
              暂无工作区
            </p>
          </nav>
        </section>

        <hr class="border-border" />

        <button
          type="button"
          aria-current="page"
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium bg-primary/10 text-primary transition-colors"
        >
          <Archive class="w-4 h-4 text-primary" />
          <span class="flex-1 text-left">归档</span>
        </button>
      </aside>

      <!-- Main content -->
      <main class="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        <!-- Archive header -->
        <div
          class="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50 shrink-0"
        >
          <div class="flex items-center gap-2">
            <Archive class="w-4 h-4 text-muted-foreground" />
            <h1 class="text-base font-semibold text-foreground tracking-tight">归档</h1>
          </div>
          <span class="text-xs text-muted-foreground">归档区只读，不能编辑</span>
        </div>

        <!-- Archived task list / empty -->
        <EmptyState v-if="tasks.length === 0" type="archive-empty" />
        <div v-else class="flex-1 overflow-y-auto p-4 space-y-2">
          <div
            v-for="t in tasks"
            :key="t.id"
            class="flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-card/50 text-muted-foreground"
          >
            <CheckCircle2 class="w-4 h-4 text-muted-foreground shrink-0" />
            <span class="text-sm text-muted-foreground line-through flex-1 break-words">
              {{ t.title }}
            </span>
            <span class="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
              {{ originalWorkspaceName(t) }}
            </span>
            <span class="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
              {{ formatDate(t.archivedAt) }}
            </span>
            <button
              type="button"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-primary hover:bg-muted transition-colors shrink-0"
              @click="restore(t)"
            >
              <RotateCcw class="w-3 h-3" />
              还原
            </button>
          </div>
        </div>

        <!-- Status bar -->
        <footer
          class="h-8 flex items-center justify-between px-3 border-t border-border bg-card shrink-0 text-xs text-muted-foreground"
        >
          <span class="tabular-nums">共归档 {{ tasks.length }} 项</span>
          <span>只读视图</span>
          <span>{{ appVersion }}</span>
        </footer>
      </main>
    </div>
  </div>
</template>
