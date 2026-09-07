<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { CornerDownRight, Archive, Trash2 } from 'lucide-vue-next';
import { useWorkspaceStore } from '../stores/workspace';
import { useUiStore } from '../stores/ui';
import type { TaskNode } from '@taskjian/shared';
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
const uiStore = useUiStore();

// —— 右键菜单状态 ——
const contextMenu = ref<{ visible: boolean; x: number; y: number; task: TaskNode | null }>({
  visible: false,
  x: 0,
  y: 0,
  task: null,
});

function onContextMenu(payload: { task: TaskNode; x: number; y: number }) {
  contextMenu.value = { visible: true, x: payload.x, y: payload.y, task: payload.task };
}

function closeContextMenu() {
  contextMenu.value.visible = false;
}

function onMenuCreateChild() {
  if (!contextMenu.value.task) return;
  const task = contextMenu.value.task;
  closeContextMenu();
  uiStore.openTaskEdit(null, {
    parentId: task.id,
    groupId: task.groupId ?? null,
  });
}

function onMenuArchive() {
  if (!contextMenu.value.task) return;
  const task = contextMenu.value.task;
  closeContextMenu();
  uiStore.openConfirm('归档任务', `确定归档「${task.title}」吗？`, () =>
    workspaceStore.archiveTask(task.id),
  );
}

function onMenuDelete() {
  if (!contextMenu.value.task) return;
  const task = contextMenu.value.task;
  closeContextMenu();
  uiStore.openConfirm('删除任务', `确定删除「${task.title}」吗？此操作不可撤销。`, () =>
    workspaceStore.deleteTask(task.id),
  );
}

onMounted(() => {
  document.addEventListener('click', closeContextMenu);
});

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu);
});

const sections = computed(() => workspaceStore.groupedFilteredSections);

// 空状态类型：
// - 无工作区 → no-workspace（引导新建）
// - 有过滤条件但无结果 → no-result（提供清除过滤）
// - 工作区本就空（无过滤且 sections 为空）→ 交给 TaskTree 内联提示，不重复 EmptyState
const emptyStateType = computed<'no-workspace' | 'no-result' | null>(() => {
  if (!workspaceStore.activeFile) return 'no-workspace';
  // 任何一段存在可渲染的 roots，就不算空
  const hasAnyTask = sections.value.some((s) => s.roots.length > 0);
  if (!hasAnyTask && workspaceStore.hasActiveFilter) {
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
        <div class="content-scroll flex-1 overflow-y-auto p-4 space-y-6">
          <!-- 按分块渲染任务区 -->
          <template v-if="!emptyStateType && sections.length > 0">
            <section v-for="sec in sections" :key="sec.group?.id ?? '__ungrouped__'">
              <!-- 组标题：大字标题 + 底部分隔线；未分组段同样样式但弱化 -->
              <h2
                class="flex items-baseline gap-2 pb-2 mb-2 border-b border-border"
                :class="sec.group ? 'text-xl font-semibold text-foreground' : 'text-sm font-medium text-muted-foreground'"
              >
                <span>{{ sec.group ? sec.group.name : '未分组' }}</span>
                <span
                  v-if="sec.roots.length > 0"
                  class="text-xs font-normal tabular-nums"
                  :class="sec.group ? 'text-muted-foreground' : 'text-muted-foreground/70'"
                >
                  {{ sec.roots.length }} 项
                </span>
              </h2>
              <TaskTree :tasks="sec.roots" @context-menu="onContextMenu" />
            </section>
          </template>
          <!-- 无分段（无分组 + 无未分组任务）：直接交给 TaskTree 渲染空态 -->
          <TaskTree v-else-if="!emptyStateType" :tasks="workspaceStore.filteredTree" @context-menu="onContextMenu" />
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

    <!-- 全局右键菜单 -->
    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="fixed z-50 min-w-[160px] py-1 bg-card border border-border rounded-md shadow-lg"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click.stop
      >
        <button
          type="button"
          class="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
          @click="onMenuCreateChild"
        >
          <CornerDownRight class="w-3.5 h-3.5" />
          创建子项
        </button>
        <div class="border-t border-border my-1" />
        <button
          type="button"
          class="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
          @click="onMenuArchive"
        >
          <Archive class="w-3.5 h-3.5" />
          归档
        </button>
        <button
          type="button"
          class="w-full px-3 py-1.5 text-sm text-left hover:bg-muted text-destructive flex items-center gap-2"
          @click="onMenuDelete"
        >
          <Trash2 class="w-3.5 h-3.5" />
          删除
        </button>
      </div>
    </Teleport>
  </div>
</template>
