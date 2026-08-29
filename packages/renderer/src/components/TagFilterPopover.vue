<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '../stores/ui';
import { useWorkspaceStore } from '../stores/workspace';
import { useTagStore } from '../stores/tag';

const ui = useUiStore();
const workspace = useWorkspaceStore();
const tagStore = useTagStore();

const tags = computed(() => tagStore.tags);
const selected = computed(() => workspace.filter.tagNames);

function isChecked(name: string) {
  return selected.value.includes(name);
}

function toggle(name: string) {
  workspace.toggleTagFilter(name);
}

function close() {
  ui.tagFilterOpen = false;
}

function openManagement() {
  close();
  ui.tagManagementOpen = true;
}

function onBackdropClick() {
  close();
}
</script>

<template>
  <Teleport to="body">
    <div v-if="ui.tagFilterOpen" class="fixed inset-0 z-50" @click.self="onBackdropClick">
      <!-- 遮罩：仅覆盖内容区，半透明 -->
      <div
        class="absolute pointer-events-auto"
        :style="{
          left: '220px',
          top: '36px',
          right: '0',
          bottom: '0',
          backgroundColor: 'var(--taskjian-ink)',
          opacity: '0.16',
        }"
        @click="onBackdropClick"
      />
      <!-- 浮层面板 -->
      <div
        class="pointer-events-auto absolute bg-popover border border-border rounded-lg"
        :style="{
          left: '232px',
          top: '70px',
          width: '220px',
          boxShadow: 'var(--taskjian-shadow-2)',
          padding: '12px',
        }"
        @click.stop
      >
        <h3 class="text-sm font-semibold text-foreground mb-2">标签过滤</h3>
        <div class="space-y-1 max-h-80 overflow-y-auto">
          <label
            v-for="t in tags"
            :key="t.name"
            class="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer"
          >
            <input
              type="checkbox"
              class="rounded border-border"
              :checked="isChecked(t.name)"
              style="accent-color: var(--taskjian-primary);"
              @change="toggle(t.name)"
            />
            <span
              class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium text-white shrink-0"
              :style="{ backgroundColor: t.color }"
              >{{ t.name }}</span
            >
            <span class="text-xs text-foreground">{{ t.name }}</span>
          </label>
          <p v-if="tags.length === 0" class="text-xs text-muted-foreground px-1 py-1">
            暂无标签
          </p>
        </div>
        <hr class="border-border my-2" />
        <button
          type="button"
          class="block w-full text-left text-xs text-primary hover:opacity-80 px-1 py-1 rounded hover:bg-muted transition-colors"
          @click="openManagement"
        >
          管理标签...
        </button>
      </div>
    </div>
  </Teleport>
</template>
