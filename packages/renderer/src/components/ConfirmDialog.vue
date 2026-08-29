<script setup lang="ts">
import { useUiStore } from '../stores/ui';

const ui = useUiStore();

function onConfirm() {
  const cb = ui.confirmDialog.onConfirm;
  ui.closeConfirm();
  if (cb) cb();
}

function onCancel() {
  ui.closeConfirm();
}

function onBackdropClick() {
  // 点击遮罩等同于取消（栈顶由 Esc 关闭，这里点击遮罩也直接取消）
  ui.closeConfirm();
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="ui.confirmDialog.open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="onBackdropClick"
    >
      <div
        role="dialog"
        aria-modal="true"
        class="relative w-full max-w-[400px] mx-4 bg-card rounded-lg border border-border flex flex-col shadow-2"
      >
        <div class="px-4 pt-4">
          <h2 class="text-base font-semibold text-foreground">{{ ui.confirmDialog.title }}</h2>
        </div>
        <div class="px-4 py-3">
          <p class="text-sm text-muted-foreground break-words">{{ ui.confirmDialog.message }}</p>
        </div>
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
            class="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:scale-[0.98] transition"
            @click="onConfirm"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
