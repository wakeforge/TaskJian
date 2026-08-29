<script setup lang="ts">
import { computed } from 'vue';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-vue-next';
import type { ToastItem } from '../stores/ui';

const props = defineProps<{ toast: ToastItem }>();
const emit = defineEmits<{ (e: 'dismiss', id: string): void }>();

const config = computed(() => {
  switch (props.toast.type) {
    case 'success':
      return {
        icon: CheckCircle,
        iconColor: 'text-[var(--taskjian-state-success)]',
        border: 'border-l-[var(--taskjian-state-success)]',
      };
    case 'error':
      return {
        icon: AlertTriangle,
        iconColor: 'text-[var(--taskjian-state-error)]',
        border: 'border-l-[var(--taskjian-state-error)]',
      };
    default:
      return {
        icon: Info,
        iconColor: 'text-[var(--taskjian-state-info)]',
        border: 'border-l-[var(--taskjian-state-info)]',
      };
  }
});
</script>

<template>
  <div
    class="pointer-events-auto flex items-start gap-2 w-80 px-3 py-2.5 rounded-md bg-card border border-border shadow-2"
    :class="config.border"
    role="status"
    aria-live="polite"
  >
    <component :is="config.icon" class="w-4 h-4 mt-0.5 shrink-0" :class="config.iconColor" />
    <span class="flex-1 text-sm text-foreground break-words">{{ toast.message }}</span>
    <button
      type="button"
      aria-label="关闭"
      class="inline-flex items-center justify-center w-5 h-5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
      @click="emit('dismiss', toast.id)"
    >
      <X class="w-3.5 h-3.5" />
    </button>
  </div>
</template>
