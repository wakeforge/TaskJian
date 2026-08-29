<script setup lang="ts">
import { onMounted } from 'vue';
import { useAppStore } from './stores/app';
import { useWorkspaceStore } from './stores/workspace';
import { useTagStore } from './stores/tag';
import { useShortcuts } from './composables/shortcuts';
import TagManagementDialog from './components/TagManagementDialog.vue';
import TaskEditDialog from './components/TaskEditDialog.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import PromptDialog from './components/PromptDialog.vue';
import SettingsDialog from './components/SettingsDialog.vue';
import ToastContainer from './components/ToastContainer.vue';

const app = useAppStore();
const workspace = useWorkspaceStore();
const tags = useTagStore();

// 全局快捷键（Ctrl+Enter 新建 / Esc 栈式关闭 / Ctrl+S 保存编辑）
useShortcuts();

onMounted(async () => {
  // 渲染进程在纯 Vite dev（无 Electron preload）下 window.api 不可用，
  // 容错以便空白窗口可正常打开；真实运行由 preload 注入 api。
  if (typeof window.api === 'undefined') {
    return;
  }
  try {
    await app.init();
    await tags.load();
    await workspace.loadAll();
    await workspace.loadActive();
  } catch (e) {
    console.warn('[App] 初始化数据加载失败：', e);
  }
});
</script>

<template>
  <div id="app-root" class="h-screen flex flex-col bg-background text-foreground" :class="{ dark: app.isDark }">
    <router-view />
    <!-- 全局弹窗 -->
    <TagManagementDialog />
    <TaskEditDialog />
    <ConfirmDialog />
    <PromptDialog />
    <SettingsDialog />
    <ToastContainer />
  </div>
</template>
