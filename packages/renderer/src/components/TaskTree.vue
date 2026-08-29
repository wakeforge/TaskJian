<script setup lang="ts">
import { Inbox } from 'lucide-vue-next';
import type { TreeNode } from '../stores/workspace';
import TaskNodeRow from './TaskNodeRow.vue';

defineProps<{ tasks: TreeNode[] }>();
</script>

<template>
  <div class="space-y-1">
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
