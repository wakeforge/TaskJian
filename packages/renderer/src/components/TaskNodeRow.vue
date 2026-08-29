<script setup lang="ts">
import { computed } from 'vue';
import { Pencil, Archive, Trash2 } from 'lucide-vue-next';
import { useTagStore } from '../stores/tag';
import { useUiStore } from '../stores/ui';
import { useWorkspaceStore, type TreeNode } from '../stores/workspace';
import StatusDot from './StatusDot.vue';
import TagChip from './TagChip.vue';

const props = withDefaults(
  defineProps<{
    node: TreeNode;
    prefix?: string;
    isRoot?: boolean;
  }>(),
  {
    prefix: '',
    isRoot: true,
  },
);

const tagStore = useTagStore();
const uiStore = useUiStore();
const workspaceStore = useWorkspaceStore();

const task = computed(() => props.node.task);
const tagDefs = computed(() =>
  task.value.tags.map((name) => {
    const def = tagStore.tagMap.get(name);
    return { name, color: def?.color ?? '#9ca3af' };
  }),
);

function openEdit() {
  uiStore.openTaskEdit(task.value.id);
}
function onArchive() {
  uiStore.openConfirm('归档任务', `确定归档「${task.value.title}」吗？`, () =>
    workspaceStore.archiveTask(task.value.id),
  );
}
function onDelete() {
  uiStore.openConfirm('删除任务', `确定删除「${task.value.title}」吗？此操作不可撤销。`, () =>
    workspaceStore.deleteTask(task.value.id),
  );
}
</script>

<template>
  <div :class="isRoot ? 'rounded-md hover:bg-card transition-colors' : ''">
    <!-- 主行 -->
    <div
      class="group/task flex items-start gap-2"
      :class="isRoot ? 'px-2 py-1.5' : 'py-1'"
      @click="openEdit"
    >
      <span v-if="prefix" class="text-xs text-muted-foreground font-mono shrink-0 pt-0.5">{{
        prefix
      }}</span>
      <StatusDot :status="task.status" :class="isRoot ? '' : '!mt-0.5'" />
      <TagChip v-for="t in tagDefs" :key="t.name" :name="t.name" :color="t.color" />
      <span
        v-if="task.code"
        class="text-xs text-muted-foreground font-mono shrink-0 pt-0.5"
        >{{ task.code }}</span
      >
      <span class="text-sm text-foreground break-words flex-1 min-w-0">{{ task.title }}</span>
      <!-- 行尾 hover 操作 -->
      <div
        class="flex items-center gap-0.5 opacity-0 group-hover/task:opacity-100 transition-opacity shrink-0"
      >
        <button
          type="button"
          aria-label="编辑"
          class="inline-flex items-center justify-center w-5 h-5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          @click.stop="openEdit"
        >
          <Pencil class="w-3 h-3" />
        </button>
        <button
          type="button"
          aria-label="归档"
          class="inline-flex items-center justify-center w-5 h-5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          @click.stop="onArchive"
        >
          <Archive class="w-3 h-3" />
        </button>
        <button
          type="button"
          aria-label="删除"
          class="inline-flex items-center justify-center w-5 h-5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          @click.stop="onDelete"
        >
          <Trash2 class="w-3 h-3" />
        </button>
      </div>
    </div>
    <!-- note 行（└─ 前缀，无状态点） -->
    <div v-if="task.note" class="flex items-start gap-2 pl-8 pr-2 py-1">
      <span class="text-xs text-muted-foreground font-mono shrink-0">└─</span>
      <span class="text-xs text-muted-foreground break-words">{{ task.note }}</span>
    </div>
    <!-- 子任务（├─ / └─ 前缀，递归） -->
    <div v-if="node.children.length" class="pl-8 pr-2 space-y-1">
      <TaskNodeRow
        v-for="(child, i) in node.children"
        :key="child.task.id"
        :node="child"
        :prefix="i === node.children.length - 1 ? '└─' : '├─'"
        :is-root="false"
      />
    </div>
  </div>
</template>
