<script setup lang="ts">
import { X } from 'lucide-vue-next';

defineProps<{ label: string }>();
const emit = defineEmits<{ remove: [] }>();
</script>

<template>
  <span
    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-border bg-card text-foreground"
  >
    {{ label }}
    <button
      type="button"
      aria-label="移除"
      class="inline-flex items-center justify-center rounded-full hover:bg-muted p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
      @click="emit('remove')"
    >
      <X class="w-3 h-3" />
    </button>
  </span>
</template>
