<script setup lang="ts">
import type { TaskStatus } from '@taskjian/shared';
import { STATUS_COLORS } from '@taskjian/shared';

const props = defineProps<{ status: TaskStatus }>();
</script>

<template>
  <span class="mt-1.5 inline-flex" :style="{ color: STATUS_COLORS[props.status] }">
    <svg viewBox="0 0 16 16" class="w-2 h-2" fill="currentColor">
      <circle v-if="status === 'todo'" cx="8" cy="8" r="7" />
      <template v-else-if="status === 'progress'">
        <circle cx="8" cy="8" r="7" opacity="0.25" />
        <path d="M8 1a7 7 0 0 1 0 14V1Z" />
      </template>
      <circle v-else-if="status === 'blocked'" cx="8" cy="8" r="7" />
      <path v-else-if="status === 'done'" d="M3 8l3 3 7-7" stroke="currentColor" stroke-width="2" fill="none" />
    </svg>
  </span>
</template>
