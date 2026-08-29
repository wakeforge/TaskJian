<script setup lang="ts">
import { computed } from 'vue';
import { Inbox, Plus, Eraser, Archive } from 'lucide-vue-next';

const props = defineProps<{
  type: 'no-workspace' | 'no-result' | 'archive-empty';
}>();
const emit = defineEmits<{
  (e: 'create-workspace'): void;
  (e: 'clear-filters'): void;
}>();

const content = computed(() => {
  switch (props.type) {
    case 'no-workspace':
      return {
        icon: Inbox,
        title: '还没有工作区',
        desc: '点击左侧栏 + 创建第一个工作区',
        actionLabel: '新建工作区',
        actionIcon: Plus,
        action: 'create-workspace' as const,
      };
    case 'no-result':
      return {
        icon: Inbox,
        title: '没有匹配的任务',
        desc: '尝试调整过滤条件',
        actionLabel: '清除全部',
        actionIcon: Eraser,
        action: 'clear-filters' as const,
      };
    default:
      return {
        icon: Archive,
        title: '归档区为空',
        desc: '删除的工作区任务会自动移入此处',
        actionLabel: null,
        actionIcon: null,
        action: null,
      };
  }
});

function onAction() {
  if (content.value.action === 'create-workspace') emit('create-workspace');
  else if (content.value.action === 'clear-filters') emit('clear-filters');
}
</script>

<template>
  <section
    class="content-scroll flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto"
    aria-live="polite"
  >
    <div class="flex flex-col items-center gap-4 max-w-md">
      <component
        :is="content.icon"
        class="w-16 h-16 text-muted-foreground/40"
        aria-hidden="true"
      />
      <div class="space-y-1">
        <h1 class="text-lg font-semibold text-foreground tracking-tight">{{ content.title }}</h1>
        <p class="text-sm text-muted-foreground">{{ content.desc }}</p>
      </div>
      <button
        v-if="content.actionLabel && content.actionIcon"
        type="button"
        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.98] transition"
        @click="onAction"
      >
        <component :is="content.actionIcon" class="w-4 h-4" />
        {{ content.actionLabel }}
      </button>
    </div>
  </section>
</template>
