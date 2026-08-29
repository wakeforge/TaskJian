<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { X } from 'lucide-vue-next';
import { useUiStore } from '../stores/ui';
import { useWorkspaceStore } from '../stores/workspace';
import { useTagStore } from '../stores/tag';
import { STATUS_LABELS, STATUS_COLORS, type TaskNode, type TaskStatus, type WorkspaceGroup } from '@taskjian/shared';

const ui = useUiStore();
const workspace = useWorkspaceStore();
const tagStore = useTagStore();

interface StructuredForm {
  title: string;
  status: TaskStatus;
  tags: string[];
  code: string;
  groupId: string | null;
  parentId: string | null;
  note: string;
}

const emptyForm = (): StructuredForm => ({
  title: '',
  status: 'todo',
  tags: [],
  code: '',
  groupId: null,
  parentId: null,
  note: '',
});

const form = ref<StructuredForm>(emptyForm());

// 父级任务候选：同工作区所有任务扁平列表（编辑时排除自身）
const parentOptions = computed<TaskNode[]>(() => {
  const all = workspace.activeTasks;
  const editingId = ui.taskEditId;
  return all.filter((t) => t.id !== editingId);
});

// 分组候选列表
const groupOptions = computed<WorkspaceGroup[]>(() => workspace.activeGroups);

const dialogTitle = computed(() => (ui.taskEditId === null ? '新建任务' : '编辑任务'));

// —— 分组 combobox ——
const groupSearch = ref('');
const groupDropdownOpen = ref(false);
const filteredGroups = computed<WorkspaceGroup[]>(() => {
  const q = groupSearch.value.trim().toLowerCase();
  if (!q) return groupOptions.value;
  return groupOptions.value.filter((g) => g.name.toLowerCase().includes(q));
});
const selectedGroup = computed<WorkspaceGroup | null>(() => {
  if (!form.value.groupId) return null;
  return groupOptions.value.find((g) => g.id === form.value.groupId) ?? null;
});
function openGroupDropdown() {
  groupDropdownOpen.value = true;
  groupSearch.value = selectedGroup.value?.name ?? '';
}
function closeGroupDropdown() {
  groupDropdownOpen.value = false;
  const q = groupSearch.value.trim().toLowerCase();
  if (!q) {
    form.value.groupId = null;
    return;
  }
  // 若完全匹配则确定选中；不匹配时保留文字（将在保存时自动创建新分组）
  const match = groupOptions.value.find((g) => g.name.toLowerCase() === q);
  if (match) {
    form.value.groupId = match.id;
    groupSearch.value = match.name;
  } else {
    form.value.groupId = null; // 暂未创建，保存时再建立
    // groupSearch 保留用户输入的原文
  }
}
function selectGroup(g: WorkspaceGroup) {
  form.value.groupId = g.id;
  groupSearch.value = g.name;
  groupDropdownOpen.value = false;
}
function clearGroup() {
  form.value.groupId = null;
  groupSearch.value = '';
  groupDropdownOpen.value = false;
}

// —— 父级任务 combobox ——
const parentSearch = ref('');
const parentDropdownOpen = ref(false);
const filteredParents = computed<TaskNode[]>(() => {
  const q = parentSearch.value.trim().toLowerCase();
  if (!q) return parentOptions.value;
  return parentOptions.value.filter((t) => {
    const label = `${t.code ? `${t.code}: ` : ''}${t.title}`.toLowerCase();
    return label.includes(q);
  });
});
const selectedParent = computed<TaskNode | null>(() => {
  if (!form.value.parentId) return null;
  return parentOptions.value.find((t) => t.id === form.value.parentId) ?? null;
});
function openParentDropdown() {
  parentDropdownOpen.value = true;
  parentSearch.value = selectedParent.value
    ? `${selectedParent.value.code ? `${selectedParent.value.code}: ` : ''}${selectedParent.value.title}`
    : '';
}
function closeParentDropdown() {
  parentDropdownOpen.value = false;
  const q = parentSearch.value.trim().toLowerCase();
  if (!q) {
    form.value.parentId = null;
    return;
  }
  const match = parentOptions.value.find((t) => {
    const label = `${t.code ? `${t.code}: ` : ''}${t.title}`.toLowerCase();
    return label === q;
  });
  if (!match) {
    form.value.parentId = null;
    parentSearch.value = '';
  }
}
function selectParent(task: TaskNode) {
  form.value.parentId = task.id;
  parentSearch.value = `${task.code ? `${task.code}: ` : ''}${task.title}`;
  parentDropdownOpen.value = false;
}
function clearParent() {
  form.value.parentId = null;
  parentSearch.value = '';
  parentDropdownOpen.value = false;
}

// 加载现有任务数据
function loadFromTask(task: TaskNode | undefined) {
  if (!task) {
    form.value = emptyForm();
    groupSearch.value = '';
    parentSearch.value = '';
    return;
  }
  form.value = {
    title: task.title,
    status: task.status,
    tags: [...task.tags],
    code: task.code ?? '',
    groupId: task.groupId ?? null,
    parentId: task.parentId,
    note: task.note ?? '',
  };
  // 回显分组输入框
  const grp = task.groupId ? groupOptions.value.find((g) => g.id === task.groupId) : null;
  groupSearch.value = grp?.name ?? '';
  // 回显父级输入框
  const parent = task.parentId
    ? parentOptions.value.find((t) => t.id === task.parentId)
    : null;
  parentSearch.value = parent
    ? `${parent.code ? `${parent.code}: ` : ''}${parent.title}`
    : '';
}

function findTask(id: string | null): TaskNode | undefined {
  if (id === null) return undefined;
  return workspace.activeFile?.tasks[id];
}

// 打开时初始化
watch(
  () => ui.taskEditOpen,
  (open) => {
    if (!open) return;
    const task = findTask(ui.taskEditId);
    loadFromTask(task);
    // 新建模式：应用预填默认值（如「创建子项」时继承父级任务与分组）
    if (!task) {
      const d = ui.taskEditDefaults;
      if (d.parentId !== undefined) {
        form.value.parentId = d.parentId;
        const parent = parentOptions.value.find((t) => t.id === d.parentId);
        parentSearch.value = parent
          ? `${parent.code ? `${parent.code}: ` : ''}${parent.title}`
          : '';
      }
      if (d.groupId !== undefined) {
        form.value.groupId = d.groupId;
        const grp = d.groupId ? groupOptions.value.find((g) => g.id === d.groupId) : null;
        groupSearch.value = grp?.name ?? '';
      }
    }
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
    ui.showToast('当前环境无法保存任务', 'error');
    close();
    return;
  }

  // —— 分组：如果输入内容不匹配任何现有分组，则先创建新分组 ——
  let resolvedGroupId: string | null = form.value.groupId ?? null;
  const trimmedGroupName = groupSearch.value.trim();
  if (trimmedGroupName && !resolvedGroupId) {
    const existing = groupOptions.value.find(
      (g) => g.name.toLowerCase() === trimmedGroupName.toLowerCase(),
    );
    if (existing) {
      resolvedGroupId = existing.id;
    } else {
      const newGrp = await workspace.createGroup(trimmedGroupName);
      if (newGrp && newGrp.id) {
        resolvedGroupId = newGrp.id;
      }
    }
  }

  const payload: Partial<TaskNode> = {
    title: form.value.title,
    status: form.value.status,
    tags: [...form.value.tags],
    code: form.value.code || undefined,
    groupId: resolvedGroupId,
    parentId: form.value.parentId,
    note: form.value.note || undefined,
  };
  if (!payload.title) {
    ui.showToast('任务内容不能为空', 'error');
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
</script>

<template>
  <Teleport to="body">
    <div
      v-if="ui.taskEditOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
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

        <!-- Body -->
        <div class="p-4 overflow-y-auto" data-scroll-region="primary">
          <div class="flex flex-col gap-4 max-w-2xl">
            <div class="flex flex-col gap-1.5">
              <label class="text-[13px] font-medium text-foreground" for="input-title">内容</label>
              <textarea
                id="input-title"
                v-model="form.title"
                rows="5"
                placeholder="输入任务内容..."
                class="w-full px-3 py-2 rounded-md border border-border bg-card text-foreground text-sm resize-y focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              ></textarea>
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

            <!-- 编号 + 分组（两列布局更紧凑） -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <!-- 分组：可筛选 combobox -->
              <div class="flex flex-col gap-1.5">
                <label class="text-[13px] font-medium text-foreground">分组</label>
                <div class="relative">
                  <input
                    type="text"
                    v-model="groupSearch"
                    placeholder="（无，未分组）"
                    class="w-full px-3 py-2 pr-8 rounded-md border border-border bg-card text-foreground text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                    @focus="openGroupDropdown"
                    @blur="closeGroupDropdown"
                  />
                  <button
                    v-if="form.groupId"
                    type="button"
                    aria-label="清除分组"
                    class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    @mousedown.prevent="clearGroup"
                  >
                    <X class="w-3.5 h-3.5" />
                  </button>
                  <ul
                    v-if="groupDropdownOpen && filteredGroups.length > 0"
                    class="absolute z-10 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-card shadow-2"
                  >
                    <li
                      v-for="g in filteredGroups"
                      :key="g.id"
                      class="px-3 py-1.5 text-sm text-foreground cursor-pointer hover:bg-muted transition-colors truncate"
                      @mousedown.prevent="selectGroup(g)"
                    >
                      {{ g.name }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- 父级任务：可筛选 combobox -->
            <div class="flex flex-col gap-1.5">
              <label class="text-[13px] font-medium text-foreground">父级任务</label>
              <div class="relative">
                <input
                  type="text"
                  v-model="parentSearch"
                  placeholder="（无，作为顶层任务）"
                  class="w-full px-3 py-2 pr-8 rounded-md border border-border bg-card text-foreground text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  @focus="openParentDropdown"
                  @blur="closeParentDropdown"
                />
                <!-- 清除按钮 -->
                <button
                  v-if="form.parentId"
                  type="button"
                  aria-label="清除父级"
                  class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  @mousedown.prevent="clearParent"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
                <!-- 下拉列表 -->
                <ul
                  v-if="parentDropdownOpen && filteredParents.length > 0"
                  class="absolute z-10 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-card shadow-2"
                >
                  <li
                    v-for="t in filteredParents"
                    :key="t.id"
                    class="px-3 py-1.5 text-sm text-foreground cursor-pointer hover:bg-muted transition-colors truncate"
                    @mousedown.prevent="selectParent(t)"
                  >
                    {{ t.code ? `${t.code}: ` : '' }}{{ t.title }}
                  </li>
                </ul>
              </div>
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
