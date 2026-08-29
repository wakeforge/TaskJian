<script setup lang="ts">
import { computed } from 'vue';
import { CheckSquare, Minus, Square, X, Settings, Menu, Info } from 'lucide-vue-next';
import { useAppStore } from '../stores/app';
import { useWorkspaceStore } from '../stores/workspace';
import { useUiStore } from '../stores/ui';

const app = useAppStore();
const workspaceStore = useWorkspaceStore();
const uiStore = useUiStore();

const activeWorkspaceName = computed(() => workspaceStore.activeFile?.workspace.name ?? '');

// 窗口控制：通过 preload 暴露的 window.api.window.* 走 IPC；
// 纯 Vite dev（无 Electron preload）下 window.api 为 undefined，按钮点击静默无操作。
function onMinimize() {
  if (typeof window.api !== 'undefined') void window.api.window.minimize();
}
function onToggleMax() {
  if (typeof window.api !== 'undefined') void window.api.window.toggleMaximize();
}
function onClose() {
  if (typeof window.api !== 'undefined') void window.api.window.close();
}

// 打开全局配置弹窗（主题选择等功能收纳其中）
function onOpenSettings() {
  uiStore.settingsOpen = true;
}

// 打开关于弹窗（版本信息 / 相关链接）
function onOpenAbout() {
  uiStore.aboutOpen = true;
}

// sm 断点显示 Hamburger 触发 Drawer
const showHamburger = computed(() => app.viewport === 'sm');
</script>

<template>
  <header
    class="h-9 flex items-center justify-between px-3 border-b border-border bg-card shrink-0 select-none"
    data-dom-id="app-title-bar"
    style="-webkit-app-region: drag"
  >
    <div class="flex items-center gap-3 min-w-0">
      <button
        v-if="showHamburger"
        type="button"
        aria-label="切换侧栏抽屉"
        class="flex items-center justify-center w-8 h-9 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        style="-webkit-app-region: no-drag"
        @click="app.toggleSidebarDrawer()"
      >
        <Menu class="w-4 h-4" />
      </button>
      <div class="flex items-center gap-1.5">
        <CheckSquare class="w-4 h-4 text-primary" />
        <span class="text-sm font-semibold text-foreground tracking-tight">任笺 TaskJian</span>
      </div>
      <span class="text-xs text-muted-foreground">|</span>
      <span class="text-sm font-medium text-foreground truncate">{{ activeWorkspaceName }}</span>
    </div>
    <div class="flex items-center" style="-webkit-app-region: no-drag">
      <button
        type="button"
        aria-label="全局配置"
        title="全局配置"
        data-dom-id="btn-settings"
        class="flex items-center justify-center w-8 h-9 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        @click="onOpenSettings"
      >
        <Settings class="w-4 h-4" />
      </button>
      <button
        type="button"
        aria-label="关于"
        title="关于"
        data-dom-id="btn-about"
        class="flex items-center justify-center w-8 h-9 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        @click="onOpenAbout"
      >
        <Info class="w-4 h-4" />
      </button>
      <button
        type="button"
        aria-label="最小化"
        class="flex items-center justify-center w-8 h-9 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        @click="onMinimize"
      >
        <Minus class="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        aria-label="最大化"
        class="flex items-center justify-center w-8 h-9 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        @click="onToggleMax"
      >
        <Square class="w-3 h-3" />
      </button>
      <button
        type="button"
        aria-label="关闭"
        class="flex items-center justify-center w-8 h-9 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        @click="onClose"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>
  </header>
</template>
