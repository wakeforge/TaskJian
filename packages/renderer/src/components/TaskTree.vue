<script setup lang="ts">
import { Inbox } from 'lucide-vue-next';
import type { TreeNode } from '../stores/workspace';
import { useWorkspaceStore } from '../stores/workspace';
import { useDragDrop } from '../composables/dragDrop';
import TaskNodeRow from './TaskNodeRow.vue';

const props = defineProps<{ tasks: TreeNode[] }>();
const workspaceStore = useWorkspaceStore();
const { dragState, endDrag } = useDragDrop();

// 空白区域 drop：拖到根级末尾
function onDragOver(e: DragEvent) {
  if (!dragState.value.draggingId) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  if (!dragState.value.draggingId) return;
  // 拖到根级末尾
  void workspaceStore.reorderTask(
    dragState.value.draggingId,
    null,
    props.tasks.length,
  );
  endDrag();
}
</script>

<template>
  <div
    class="space-y-1"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <TaskNodeRow v-for="node in tasks" :key="node.task.id" :node="node" />
    <div
      v-if="tasks.length === 0"
      class="flex flex-col items-center justify-center py-12 text-muted-foreground"
    >
      <Inbox class="w-8 h-8 mb-2" />
      <span class="text-sm">暂无任务</span>
    </div>
  </div>
</template>
