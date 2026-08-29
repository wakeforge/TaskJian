<script setup lang="ts">
const props = defineProps<{ name: string; color: string }>();
</script>

<template>
  <span
    class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium text-white shrink-0"
    :style="{ backgroundColor: props.color }"
  >
    {{ props.name }}
  </span>
</template>
