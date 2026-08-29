import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { TagDef } from '@taskjian/shared';

export const useTagStore = defineStore('tag', () => {
  const tags = ref<TagDef[]>([]);

  // name → TagDef 快速查找
  const tagMap = computed(() => {
    const m = new Map<string, TagDef>();
    for (const t of tags.value) m.set(t.name, t);
    return m;
  });

  async function load() {
    if (typeof window.api === 'undefined') return;
    const res = await window.api.tag.list();
    if (res.code === 0 && res.data) {
      tags.value = res.data;
    }
  }

  async function saveAll(newTags: TagDef[]) {
    if (typeof window.api === 'undefined') {
      tags.value = newTags;
      return;
    }
    const res = await window.api.tag.saveAll(newTags);
    if (res.code === 0 && res.data) {
      tags.value = res.data;
    } else {
      tags.value = newTags;
    }
  }

  return { tags, tagMap, load, saveAll };
});
