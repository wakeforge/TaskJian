<script setup lang="ts">
import { computed } from 'vue';
import { Tag, Filter, Plus } from 'lucide-vue-next';
import { useUiStore } from '../stores/ui';
import { useWorkspaceStore } from '../stores/workspace';
import { STATUS_LABELS, type TaskStatus } from '@taskjian/shared';
import FilterChip from './FilterChip.vue';

const ui = useUiStore();
const workspaceStore = useWorkspaceStore();

interface Chip {
  key: string;
  label: string;
  remove: () => void;
}

const chips = computed<Chip[]>(() => {
  const list: Chip[] = [];
  const f = workspaceStore.filter;
  if (f.groupId) {
    const g = workspaceStore.activeGroups.find((x) => x.id === f.groupId);
    if (g)
      list.push({
        key: `g:${g.id}`,
        label: `【${g.name}】`,
        remove: () => workspaceStore.setFilter({ groupId: null }),
      });
  }
  for (const name of f.tagNames) {
    list.push({
      key: `t:${name}`,
      label: `[${name}]`,
      remove: () => workspaceStore.toggleTagFilter(name),
    });
  }
  for (const s of f.statuses as TaskStatus[]) {
    list.push({
      key: `s:${s}`,
      label: `[${STATUS_LABELS[s]}]`,
      remove: () => workspaceStore.toggleStatusFilter(s),
    });
  }
  return list;
});

function clearAll() {
  workspaceStore.setFilter({ groupId: null, tagNames: [], statuses: [] });
}
function newTask() {
  ui.openTaskEdit(null);
}
</script>

<template>
  <div
    class="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0"
    :style="{ backgroundColor: 'color-mix(in srgb, var(--taskjian-card) 50%, transparent)' }"
  >
    <button
      type="button"
      data-dom-id="btn-tag-filter"
      class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-border bg-card text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
      @click="ui.tagFilterOpen = true"
    >
      <Tag class="w-3 h-3 text-muted-foreground" />
      标签
    </button>
    <button
      type="button"
      data-dom-id="btn-status-filter"
      class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-border bg-card text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
      @click="ui.statusFilterOpen = true"
    >
      <Filter class="w-3 h-3 text-muted-foreground" />
      状态
    </button>
    <span class="text-xs text-muted-foreground whitespace-nowrap">当前过滤：</span>
    <div class="flex items-center gap-2 flex-1 flex-wrap min-w-0">
      <FilterChip v-for="c in chips" :key="c.key" :label="c.label" @remove="c.remove" />
    </div>
    <button
      type="button"
      data-dom-id="btn-tag-management"
      class="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
      @click="ui.tagManagementOpen = true"
    >
      管理标签
    </button>
    <button
      type="button"
      class="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
      @click="clearAll"
    >
      清除全部
    </button>
    <button
      type="button"
      data-dom-id="btn-task-add"
      class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition"
      @click="newTask"
    >
      <Plus class="w-3.5 h-3.5" />
      新建
    </button>
  </div>
</template>
