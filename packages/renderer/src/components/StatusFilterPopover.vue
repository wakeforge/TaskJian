<script setup lang="ts">
import { computed } from 'vue';
import { X } from 'lucide-vue-next';
import { useUiStore } from '../stores/ui';
import { useWorkspaceStore } from '../stores/workspace';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  type TaskStatus,
} from '@taskjian/shared';

const ui = useUiStore();
const workspace = useWorkspaceStore();

// 状态顺序 + 圆点字符（对齐设计稿）
const STATUS_DOT: Record<TaskStatus, string> = {
  todo: '●',
  progress: '◐',
  blocked: '▲',
  done: '✓',
};

const statuses = computed<TaskStatus[]>(() => ['todo', 'progress', 'blocked', 'done']);
const selected = computed(() => workspace.filter.statuses);

function isChecked(s: TaskStatus) {
  return selected.value.includes(s);
}

function toggle(s: TaskStatus) {
  workspace.toggleStatusFilter(s);
}

function close() {
  ui.statusFilterOpen = false;
}

function onBackdropClick() {
  close();
}
</script>

<template>
  <Teleport to="body">
    <div v-if="ui.statusFilterOpen" class="fixed inset-0 z-50" @click.self="onBackdropClick">
      <div
        class="absolute inset-0"
        style="background-color: color-mix(in srgb, var(--taskjian-ink) 35%, transparent);"
        @click="onBackdropClick"
      />
      <div
        class="absolute bg-popover rounded-lg border border-border"
        :style="{
          top: '78px',
          left: '236px',
          width: '192px',
          boxShadow: 'var(--taskjian-shadow-2)',
        }"
        @click.stop
      >
        <div class="flex items-center justify-between px-3 py-2 border-b border-border">
          <span class="text-sm font-semibold text-foreground">状态过滤</span>
          <button
            type="button"
            aria-label="关闭"
            class="inline-flex items-center justify-center w-5 h-5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            @click="close"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
        <div class="p-2 space-y-0.5">
          <label
            v-for="s in statuses"
            :key="s"
            class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              class="w-4 h-4 rounded border-border"
              :checked="isChecked(s)"
              style="accent-color: var(--taskjian-primary);"
              @change="toggle(s)"
            />
            <span
              class="text-base leading-none"
              :style="{ color: STATUS_COLORS[s] }"
              >{{ STATUS_DOT[s] }}</span
            >
            <span class="text-sm text-foreground">{{ STATUS_LABELS[s] }}</span>
          </label>
        </div>
      </div>
    </div>
  </Teleport>
</template>
