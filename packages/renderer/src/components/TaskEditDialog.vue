<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { X, Plus } from 'lucide-vue-next';
import { useUiStore } from '../stores/ui';
import { useWorkspaceStore } from '../stores/workspace';
import { useTagStore } from '../stores/tag';
import {
  parseTaskText,
  serializeTasks,
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_PREFIX,
  type TaskNode,
  type TaskStatus,
  type ParseResult,
} from '@taskjian/shared';

const ui = useUiStore();
const workspace = useWorkspaceStore();
const tagStore = useTagStore();

interface StructuredForm {
  title: string;
  status: TaskStatus;
  tags: string[];
  code: string;
  parentId: string | null;
  note: string;
}

const emptyForm = (): StructuredForm => ({
  title: '',
  status: 'todo',
  tags: [],
  code: '',
  parentId: null,
  note: '',
});

const activeTab = ref<'structured' | 'plain'>('structured');
const form = ref<StructuredForm>(emptyForm());
const plainText = ref('');

const tagNames = computed(() => tagStore.tags.map((t) => t.name));

// 父级任务候选：同工作区所有任务扁平列表（编辑时排除自身）
const parentOptions = computed<TaskNode[]>(() => {
  const all = workspace.activeTasks;
  const editingId = ui.taskEditId;
  return all.filter((t) => t.id !== editingId);
});

const dialogTitle = computed(() => (ui.taskEditId === null ? '新建任务' : '编辑任务'));

// 加载现有任务数据
function loadFromTask(task: TaskNode | undefined) {
  if (!task) {
    form.value = emptyForm();
    plainText.value = '';
    return;
  }
  form.value = {
    title: task.title,
    status: task.status,
    tags: [...task.tags],
    code: task.code ?? '',
    parentId: task.parentId,
    note: task.note ?? '',
  };
  syncStructuredToPlain();
}

function findTask(id: string | null): TaskNode | undefined {
  if (id === null) return undefined;
  return workspace.activeFile?.tasks[id];
}

// 结构化 → 纯文本（复用 serializer 保证 round-trip）
function syncStructuredToPlain() {
  const f = form.value;
  const task: TaskNode = {
    id: 'draft',
    parentId: null,
    title: f.title,
    status: f.status,
    tags: f.tags,
    code: f.code || undefined,
    note: f.note || undefined,
    groupId: null,
    createdAt: 0,
    updatedAt: 0,
  };
  plainText.value = serializeTasks([task], [], ['draft']);
}

// 纯文本 → 结构化（取首个解析任务，保留 parentId）
function syncPlainToStructured() {
  const r = parseTaskText(plainText.value, tagNames.value);
  if (r.tasks.length === 0) return;
  const t = r.tasks[0];
  form.value = {
    title: t.title,
    status: t.status,
    tags: [...t.tags],
    code: t.code ?? '',
    parentId: form.value.parentId,
    note: t.note ?? '',
  };
}

function switchTab(tab: 'structured' | 'plain') {
  if (tab === activeTab.value) return;
  if (activeTab.value === 'structured') {
    syncStructuredToPlain();
  } else {
    syncPlainToStructured();
  }
  activeTab.value = tab;
}

// 纯文本实时预览
const previewResult = computed<ParseResult>(() =>
  parseTaskText(plainText.value, tagNames.value),
);

// 打开时初始化
watch(
  () => ui.taskEditOpen,
  (open) => {
    if (!open) return;
    activeTab.value = 'structured';
    const task = findTask(ui.taskEditId);
    loadFromTask(task);
  },
  { immediate: true },
);

function toggleTag(name: string) {
  const arr = form.value.tags;
  if (arr.includes(name)) {
    form.value.tags = arr.filter((n) => n !== name);
  } else {
    form.value.tags = [...arr, name];
  }
}

function setStatus(s: TaskStatus) {
  form.value.status = s;
}

const statuses = computed<TaskStatus[]>(() => ['todo', 'progress', 'blocked', 'done']);

function close() {
  ui.closeTaskEdit();
}

async function save() {
  if (typeof window.api === 'undefined' && ui.taskEditId === null) {
    // 无 API（纯 Vite dev）下仅做本地占位写入
    ui.showToast('当前环境无法保存任务', 'error');
    close();
    return;
  }
  let payload: Partial<TaskNode>;
  if (activeTab.value === 'plain') {
    syncPlainToStructured();
    payload = {
      title: form.value.title,
      status: form.value.status,
      tags: form.value.tags,
      code: form.value.code || undefined,
      parentId: form.value.parentId,
      note: form.value.note || undefined,
    };
  } else {
    payload = {
      title: form.value.title,
      status: form.value.status,
      tags: form.value.tags,
      code: form.value.code || undefined,
      parentId: form.value.parentId,
      note: form.value.note || undefined,
    };
  }
  if (!payload.title) {
    ui.showToast('任务标题不能为空', 'error');
    return;
  }
  if (ui.taskEditId === null) {
    await workspace.createTask(payload);
  } else {
    await workspace.updateTask(ui.taskEditId, payload);
  }
  close();
}

// 监听 Ctrl+S 快捷键派发的事件
function onSaveShortcut() {
  if (ui.taskEditOpen) save();
}
onMounted(() => {
  window.addEventListener('taskjian:save-task-edit', onSaveShortcut);
});
onUnmounted(() => {
  window.removeEventListener('taskjian:save-task-edit', onSaveShortcut);
});

function onBackdropClick() {
  close();
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="ui.taskEditOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="onBackdropClick"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-edit-title"
        class="relative w-full max-w-3xl mx-4 bg-card rounded-lg border border-border flex flex-col max-h-[85vh] shadow-2"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 id="task-edit-title" class="text-base font-semibold text-foreground">
            {{ dialogTitle }}
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

        <!-- Tab bar -->
        <div class="flex items-center gap-1 px-4 pt-2 border-b border-border">
          <button
            type="button"
            class="px-3 py-1.5 rounded-t-md text-sm font-medium transition-colors"
            :class="
              activeTab === 'structured'
                ? 'text-primary border-b-2 border-primary -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            "
            @click="switchTab('structured')"
          >
            结构化编辑
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-t-md text-sm font-medium transition-colors"
            :class="
              activeTab === 'plain'
                ? 'text-primary border-b-2 border-primary -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            "
            @click="switchTab('plain')"
          >
            纯文本编辑
          </button>
        </div>

        <!-- Body -->
        <div class="p-4 overflow-y-auto" data-scroll-region="primary">
          <!-- 结构化 Tab -->
          <div v-show="activeTab === 'structured'" class="flex flex-col gap-4 max-w-2xl">
            <div class="flex flex-col gap-1.5">
              <label class="text-[13px] font-medium text-foreground" for="input-title">标题</label>
              <input
                id="input-title"
                type="text"
                v-model="form.title"
                placeholder="输入任务标题..."
                class="w-full px-3 py-2 rounded-md border border-border bg-card text-foreground text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <span class="text-[13px] font-medium text-foreground">状态</span>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="s in statuses"
                  :key="s"
                  type="button"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors"
                  :class="
                    form.status === s
                      ? 'text-white border-transparent'
                      : 'bg-card text-foreground border-border hover:bg-muted'
                  "
                  :style="form.status === s ? { backgroundColor: STATUS_COLORS[s] } : {}"
                  @click="setStatus(s)"
                >
                  <span
                    class="w-2 h-2 rounded-full"
                    :style="{
                      backgroundColor: form.status === s ? '#ffffff' : STATUS_COLORS[s],
                    }"
                  />
                  {{ STATUS_LABELS[s] }}
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <span class="text-[13px] font-medium text-foreground">标签</span>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="t in tagStore.tags"
                  :key="t.name"
                  type="button"
                  class="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium text-white border-2 transition-transform"
                  :class="
                    form.tags.includes(t.name)
                      ? 'border-foreground scale-105'
                      : 'border-transparent opacity-80 hover:opacity-100'
                  "
                  :style="{ backgroundColor: t.color }"
                  @click="toggleTag(t.name)"
                >
                  {{ t.name }}
                </button>
                <span
                  v-if="tagStore.tags.length === 0"
                  class="text-xs text-muted-foreground"
                  >暂无标签，请在"管理标签"中新增</span
                >
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-[13px] font-medium text-foreground" for="input-code">编号（可选）</label>
              <input
                id="input-code"
                type="text"
                v-model="form.code"
                placeholder="如 101"
                class="w-full px-3 py-2 rounded-md border border-border bg-card text-foreground text-sm font-mono focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-[13px] font-medium text-foreground" for="select-parent">父级任务</label>
              <select
                id="select-parent"
                v-model="form.parentId"
                class="w-full px-3 py-2 rounded-md border border-border bg-card text-foreground text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                <option :value="null">（无，作为顶层任务）</option>
                <option v-for="t in parentOptions" :key="t.id" :value="t.id">
                  {{ t.code ? `${t.code}: ` : '' }}{{ t.title }}
                </option>
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-[13px] font-medium text-foreground" for="input-note">备注</label>
              <textarea
                id="input-note"
                v-model="form.note"
                rows="4"
                placeholder="补充说明..."
                class="w-full px-3 py-2 rounded-md border border-border bg-card text-foreground text-sm resize-y focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              ></textarea>
            </div>
          </div>

          <!-- 纯文本 Tab -->
          <div v-show="activeTab === 'plain'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-[13px] font-medium text-foreground" for="input-text">纯文本</label>
              <textarea
                id="input-text"
                v-model="plainText"
                rows="14"
                placeholder="- T1 任务标题&#10;└─ 备注..."
                class="w-full px-3 py-2 rounded-md border border-border bg-card text-foreground text-sm font-mono resize-y focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              ></textarea>
              <p class="text-xs text-muted-foreground">
                前缀：<code class="font-mono">-</code> 待办 / <code class="font-mono">=</code> 进行中 /
                <code class="font-mono">▲</code> 受阻 / <code class="font-mono">*</code> 已完成
              </p>
            </div>
            <div class="flex flex-col gap-1.5">
              <span class="text-[13px] font-medium text-foreground">解析预览</span>
              <div class="border border-border rounded-md bg-muted/30 p-3 overflow-y-auto max-h-96">
                <div v-if="previewResult.tasks.length === 0" class="text-xs text-muted-foreground">
                  无可解析任务
                </div>
                <ul v-else class="space-y-2">
                  <li
                    v-for="t in previewResult.tasks"
                    :key="t.id"
                    class="flex items-start gap-2 text-sm"
                  >
                    <span
                      class="mt-1 inline-flex w-2 h-2 rounded-full shrink-0"
                      :style="{ backgroundColor: STATUS_COLORS[t.status] }"
                    />
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <span
                          v-for="tn in t.tags"
                          :key="tn"
                          class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium text-white"
                          :style="{ backgroundColor: tagStore.tagMap.get(tn)?.color ?? '#9ca3af' }"
                          >{{ tn }}</span
                        >
                        <span v-if="t.code" class="text-xs text-muted-foreground font-mono">{{ t.code }}</span>
                        <span class="text-foreground break-words">{{ t.title || '（空标题）' }}</span>
                      </div>
                      <p v-if="t.note" class="mt-0.5 text-xs text-muted-foreground whitespace-pre-line break-words">
                        {{ t.note }}
                      </p>
                    </div>
                  </li>
                </ul>
                <p v-if="previewResult.errors.length > 0" class="mt-2 text-xs text-[var(--taskjian-state-error)]">
                  第 {{ previewResult.errors[0].line }} 行解析失败
                </p>
              </div>
            </div>
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
