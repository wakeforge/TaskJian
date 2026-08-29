import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { TaskNode } from '@taskjian/shared';

export const useArchiveStore = defineStore('archive', () => {
  const tasks = ref<TaskNode[]>([]);

  async function load() {
    if (typeof window.api === 'undefined') return;
    const res = await window.api.archive.list();
    if (res.code === 0 && res.data) {
      tasks.value = res.data;
    }
  }

  async function restore(taskId: string, targetWorkspaceId: string) {
    if (typeof window.api === 'undefined') return;
    const res = await window.api.archive.restore(taskId, targetWorkspaceId);
    if (res.code !== 0) return;
    tasks.value = tasks.value.filter((t) => t.id !== taskId);
  }

  return { tasks, load, restore };
});
