<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { X, Plus } from 'lucide-vue-next';
import { useUiStore } from '../stores/ui';
import { useTagStore } from '../stores/tag';
import type { TagDef } from '@taskjian/shared';

const ui = useUiStore();
const tagStore = useTagStore();

// 内部 draft 状态：打开时深拷贝 tags，保存时才同步到 store
const draft = ref<TagDef[]>([]);
const nameInputRefs = ref<HTMLInputElement[]>([]);

async function syncDraft() {
  draft.value = tagStore.tags.map((t) => ({ ...t }));
}

// 打开时初始化 draft
watch(
  () => ui.tagManagementOpen,
  (open) => {
    if (open) syncDraft();
  },
  { immediate: true },
);

function addTag() {
  draft.value.push({ name: '', color: '#ffffff' });
  nextTick(() => {
    const last = nameInputRefs.value[nameInputRefs.value.length - 1];
    last?.focus();
  });
}

function removeTag(index: number) {
  draft.value.splice(index, 1);
}

function updateName(index: number, name: string) {
  draft.value[index] = { ...draft.value[index], name };
}

function updateColor(index: number, color: string) {
  draft.value[index] = { ...draft.value[index], color };
}

function close() {
  ui.tagManagementOpen = false;
}

async function save() {
  // 过滤空名称
  const cleaned = draft.value
    .filter((t) => t.name.trim() !== '')
    .map((t) => ({ name: t.name.trim(), color: t.color }));
  await tagStore.saveAll(cleaned);
  close();
}

function onBackdropClick() {
  close();
}

function setNameRef(el: unknown, index: number) {
  if (el instanceof HTMLInputElement) {
    nameInputRefs.value[index] = el;
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="ui.tagManagementOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="onBackdropClick"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tag-management-title"
        class="relative w-full max-w-[520px] mx-4 bg-card rounded-lg border border-border flex flex-col max-h-[80vh] shadow-2"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 id="tag-management-title" class="text-base font-semibold text-foreground">
            标签管理
          </h2>
          <button
            type="button"
            aria-label="关闭"
            class="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            @click="close"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Body -->
        <div class="p-4 overflow-y-auto">
          <button
            type="button"
            class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:scale-[0.98] transition"
            @click="addTag"
          >
            <Plus class="w-3.5 h-3.5" />
            新增标签
          </button>

          <div class="mt-3 border border-border rounded-md overflow-hidden">
            <!-- 表头 -->
            <div
              class="grid grid-cols-[1fr_80px_64px] gap-2 px-3 py-2 bg-muted text-xs font-medium text-muted-foreground border-b border-border"
            >
              <span>名称</span>
              <span>颜色</span>
              <span class="text-right">操作</span>
            </div>
            <!-- 行 -->
            <ul class="divide-y divide-border">
              <li
                v-for="(t, idx) in draft"
                :key="idx"
                class="grid grid-cols-[1fr_80px_64px] gap-2 items-center px-3 py-2 text-sm"
              >
                <input
                  type="text"
                  :ref="(el) => setNameRef(el, idx)"
                  :value="t.name"
                  placeholder="名称"
                  class="w-full px-2 py-1 rounded border border-border bg-card text-foreground text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  @input="updateName(idx, ($event.target as HTMLInputElement).value)"
                />
                <label class="inline-flex items-center gap-1.5 cursor-pointer">
                  <span
                    class="w-3.5 h-3.5 rounded-sm shrink-0 border border-border"
                    :style="{ backgroundColor: t.color }"
                  />
                  <span class="text-xs text-muted-foreground">{{ t.color }}</span>
                  <input
                    type="color"
                    :value="t.color"
                    class="sr-only"
                    @input="updateColor(idx, ($event.target as HTMLInputElement).value)"
                  />
                </label>
                <button
                  type="button"
                  class="justify-self-end text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors"
                  @click="removeTag(idx)"
                >
                  删除
                </button>
              </li>
              <li
                v-if="draft.length === 0"
                class="px-3 py-4 text-center text-xs text-muted-foreground"
              >
                暂无标签，点击上方"新增标签"
              </li>
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            type="button"
            class="px-3 py-1.5 rounded-md border border-border bg-card text-foreground text-xs font-medium hover:bg-muted active:scale-[0.98] transition-colors"
            @click="close"
          >
            取消
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:scale-[0.98] transition"
            @click="save"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
