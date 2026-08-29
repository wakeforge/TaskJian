<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Tag, Filter, Plus, Search, X } from 'lucide-vue-next';
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
  if (f.searchText) {
    list.push({
      key: `q:${f.searchText}`,
      label: `「${f.searchText}」`,
      remove: () => {
        workspaceStore.setFilter({ searchText: '' });
        searchTextInput.value = '';
      },
    });
  }
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
  workspaceStore.setFilter({ groupId: null, tagNames: [], statuses: [], searchText: '' });
  searchTextInput.value = '';
}
function newTask() {
  ui.openTaskEdit(null);
}

// —— 任务搜索：回车生效，匹配 title/code/note ——
const searchTextInput = ref('');
// 外部清空过滤时同步输入框
watch(
  () => workspaceStore.filter.searchText,
  (v) => {
    searchTextInput.value = v;
  },
);
function onSearchEnter() {
  workspaceStore.setFilter({ searchText: searchTextInput.value.trim() });
}
// 清除搜索：同时清空输入框与过滤条件
function clearSearch() {
  searchTextInput.value = '';
  workspaceStore.setFilter({ searchText: '' });
}
</script>

<template>
  <div
    class="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0"
    :style="{ backgroundColor: 'color-mix(in srgb, var(--taskjian-card) 50%, transparent)' }"
  >
    <div
      class="relative inline-flex items-center"
      data-dom-id="task-search-box"
    >
      <Search
        class="absolute left-2 w-3 h-3 text-muted-foreground pointer-events-none"
      />
      <input
        v-model="searchTextInput"
        type="text"
        placeholder="搜索任务，回车筛选"
        aria-label="任务搜索"
        class="w-44 pl-7 pr-6 py-1 rounded-md text-xs border border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        @keydown.enter="onSearchEnter"
      />
      <button
        v-if="searchTextInput"
        type="button"
        aria-label="清除搜索"
        title="清除搜索"
        class="absolute right-1.5 inline-flex items-center justify-center w-4 h-4 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        @click="clearSearch"
      >
        <X class="w-3 h-3" />
      </button>
    </div>
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
      class="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
      @click="clearAll"
    >
      清除全部
    </button>
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
      data-dom-id="btn-task-add"
      class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition"
      @click="newTask"
    >
      <Plus class="w-3.5 h-3.5" />
      新建
    </button>
  </div>
</template>
