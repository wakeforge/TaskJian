import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastType = 'info' | 'error' | 'success';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: (() => void) | null;
}

export interface PromptState {
  open: boolean;
  title: string;
  defaultValue: string;
  onSubmit: ((value: string) => void) | null;
}

const TOAST_DURATION = 3000;

export const useUiStore = defineStore('ui', () => {
  const tagFilterOpen = ref(false);
  const statusFilterOpen = ref(false);
  const tagManagementOpen = ref(false);
  const taskEditOpen = ref(false);
  // 全局配置弹窗
  const settingsOpen = ref(false);
  // null = 新建任务
  const taskEditId = ref<string | null>(null);
  const confirmDialog = ref<ConfirmState>({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
  });
  const promptDialog = ref<PromptState>({
    open: false,
    title: '',
    defaultValue: '',
    onSubmit: null,
  });
  const toasts = ref<ToastItem[]>([]);

  function openTaskEdit(id: string | null = null) {
    taskEditId.value = id;
    taskEditOpen.value = true;
  }

  function closeTaskEdit() {
    taskEditOpen.value = false;
    taskEditId.value = null;
  }

  function showToast(message: string, type: ToastType = 'info') {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    toasts.value.push({ id, message, type });
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id);
    }, TOAST_DURATION);
  }

  function openConfirm(title: string, message: string, onConfirm: (() => void) | null) {
    confirmDialog.value = { open: true, title, message, onConfirm };
  }

  function closeConfirm() {
    confirmDialog.value = { ...confirmDialog.value, open: false };
  }

  function openPrompt(title: string, defaultValue: string, onSubmit: ((value: string) => void) | null) {
    promptDialog.value = { open: true, title, defaultValue, onSubmit };
  }

  function closePrompt() {
    promptDialog.value = { ...promptDialog.value, open: false };
  }

  return {
    tagFilterOpen,
    statusFilterOpen,
    tagManagementOpen,
    settingsOpen,
    taskEditOpen,
    taskEditId,
    confirmDialog,
    promptDialog,
    toasts,
    openTaskEdit,
    closeTaskEdit,
    showToast,
    openConfirm,
    closeConfirm,
    openPrompt,
    closePrompt,
  };
});
