<script setup lang="ts">
import { computed } from 'vue';
import { useWorkspaceStore } from '../stores/workspace';
import TitleBar from '../components/TitleBar.vue';
import Sidebar from '../components/Sidebar.vue';
import FilterBar from '../components/FilterBar.vue';
import TaskTree from '../components/TaskTree.vue';
import StatusBar from '../components/StatusBar.vue';
import EmptyState from '../components/EmptyState.vue';
// 仅挂载工作区专属浮层；全局弹窗（TaskEditDialog / ConfirmDialog / TagManagementDialog / ToastContainer）
// 由 App.vue 统一挂载，避免在 /main 路由下重复渲染导致同一条 toast / dialog 出现两次。
import TagFilterPopover from '../components/TagFilterPopover.vue';
import StatusFilterPopover from '../components/StatusFilterPopover.vue';

const workspaceStore = useWorkspaceStore();

// 当前分组标题（过滤 groupId 命中时显示，对齐设计稿 <h1>【分组名】</h1>）
const currentGroupTitle = computed(() => {
  const gid = workspaceStore.filter.groupId;
  if (!gid) return '';
  const g = workspaceStore.activeGroups.find((x) => x.id === gid);
  return g ? `【${g.name}】` : '';
});

// 空状态类型：
// - 无工作区 → no-workspace（引导新建）
// - 有过滤条件但无结果 → no-result（提供清除过滤）
// - 工作区本就空（无过滤）→ 交给 TaskTree 内联 "暂无任务" 提示，不重复 EmptyState
const emptyStateType = computed<'no-workspace' | 'no-result' | null>(() => {
  if (!workspaceStore.activeFile) return 'no-workspace';
  if (workspaceStore.filteredTree.length === 0 && workspaceStore.hasActiveFilter) {
    return 'no-result';
  }
  return null;
});

function createFirstWorkspace() {
  const name = window.prompt('新建工作区名称');
  if (name && name.trim()) void workspaceStore.createWorkspace(name.trim());
}
function clearFilters() {
  workspaceStore.setFilter({ groupId: null, tagNames: [], statuses: [] });
}
</script>

<template>
  <div class="h-screen flex flex-col bg-background text-foreground" data-viewport-mode="app-shell">
    <TitleBar />
    <div class="shell-row flex flex-1 overflow-hidden relative">
      <Sidebar />
      <main class="content flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        <FilterBar />
        <div class="content-scroll flex-1 overflow-y-auto p-4 space-y-4">
          <!-- 当前分组标题 -->
          <h1
            v-if="currentGroupTitle"
            class="text-lg font-semibold text-foreground tracking-tight"
          >
            {{ currentGroupTitle }}
          </h1>
          <!-- 任务树 -->
          <TaskTree v-if="!emptyStateType" :tasks="workspaceStore.filteredTree" />
          <!-- 空状态 -->
          <EmptyState
            v-else-if="emptyStateType === 'no-result'"
            type="no-result"
            @clear-filters="clearFilters"
          />
          <EmptyState
            v-else-if="emptyStateType === 'no-workspace'"
            type="no-workspace"
            @create-workspace="createFirstWorkspace"
          />
        </div>
        <StatusBar />
      </main>
    </div>
    <!-- 工作区专属浮层（内部均 Teleport 到 body） -->
    <TagFilterPopover />
    <StatusFilterPopover />
  </div>
</template>
