<script setup lang="ts">
import { computed } from 'vue';
import { useWorkspaceStore } from '../stores/workspace';

const workspaceStore = useWorkspaceStore();
const summary = computed(() => workspaceStore.summary);
</script>

<template>
  <footer
    class="status-bar h-8 flex items-center justify-between px-3 border-t border-border bg-card shrink-0 text-xs text-muted-foreground"
  >
    <span class="tabular-nums">
      共 {{ summary.total }} 项 · 待办 {{ summary.todo }} · 进行中 {{ summary.progress }} · 受阻
      {{ summary.blocked }} · 已完成 {{ summary.done }}
    </span>
    <span class="hidden md:block">快速添加: Ctrl+Enter</span>
    <span>v1.1.0</span>
  </footer>
</template>
