<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useUiStore } from '../stores/ui';

const ui = useUiStore();

const value = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

// 对话框打开时同步默认值并聚焦输入框
watch(
  () => ui.promptDialog.open,
  async (open) => {
    if (open) {
      value.value = ui.promptDialog.defaultValue;
      await nextTick();
      inputRef.value?.focus();
      inputRef.value?.select();
    }
  },
);

function onSubmit() {
  const trimmed = value.value.trim();
  if (!trimmed) return;
  const cb = ui.promptDialog.onSubmit;
  ui.closePrompt();
  if (cb) cb(trimmed);
}

function onCancel() {
  ui.closePrompt();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    onSubmit();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    onCancel();
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="ui.promptDialog.open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="onCancel"
    >
      <div
        role="dialog"
        aria-modal="true"
        class="relative w-full max-w-[400px] mx-4 bg-card rounded-lg border border-border flex flex-col shadow-2"
      >
        <div class="px-4 pt-4">
          <h2 class="text-base font-semibold text-foreground">{{ ui.promptDialog.title }}</h2>
        </div>
        <form class="px-4 py-3" @submit.prevent="onSubmit">
          <input
            ref="inputRef"
            v-model="value"
            type="text"
            class="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition"
            @keydown="onKeydown"
          />
        </form>
        <div class="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            type="button"
            class="px-3 py-1.5 rounded-md border border-border bg-card text-foreground text-xs font-medium hover:bg-muted active:scale-[0.98] transition-colors"
            @click="onCancel"
          >
            取消
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50 disabled:pointer-events-none"
            :disabled="!value.trim()"
            @click="onSubmit"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
