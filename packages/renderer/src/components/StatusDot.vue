<script setup lang="ts">
import type { TaskStatus } from '@taskjian/shared';
import { STATUS_COLORS, STATUS_LABELS } from '@taskjian/shared';

const props = defineProps<{ status: TaskStatus }>();
</script>

<template>
  <span
    class="status-label inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium shrink-0"
    :title="STATUS_LABELS[props.status]"
    :style="{ '--taskjian-status-current': STATUS_COLORS[props.status] }"
  >
    {{ STATUS_LABELS[props.status] }}
  </span>
</template>

<style scoped>
/* 状态文字标签：状态色文字 + 同色浅底（半透明），醒目且与 TagChip 风格统一 */
.status-label {
  color: var(--taskjian-status-current);
  background-color: color-mix(in srgb, var(--taskjian-status-current) 14%, transparent);
}
</style>
