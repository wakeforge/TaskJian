<script setup lang="ts">
import { useUiStore } from '../stores/ui';
import Toast from './Toast.vue';

const ui = useUiStore();

function dismiss(id: string) {
  ui.toasts = ui.toasts.filter((t) => t.id !== id);
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <Toast v-for="t in ui.toasts" :key="t.id" :toast="t" @dismiss="dismiss" />
    </div>
  </Teleport>
</template>
