<script setup lang="ts">
import { computed } from 'vue';
import { Archive, Trash2, CornerDownRight } from 'lucide-vue-next';
import { useTagStore } from '../stores/tag';
import { useUiStore } from '../stores/ui';
import { useWorkspaceStore, type TreeNode } from '../stores/workspace';
import { useDragDrop, calcDropPosition, type DropPosition } from '../composables/dragDrop';
import StatusDot from './StatusDot.vue';
import TagChip from './TagChip.vue';

const props = withDefaults(
  defineProps<{
    node: TreeNode;
    prefix?: string;
    isRoot?: boolean;
  }>(),
  {
    prefix: '',
    isRoot: true,
  },
);

const tagStore = useTagStore();
const uiStore = useUiStore();
const workspaceStore = useWorkspaceStore();
const { dragState, startDrag, setHover, clearHover, endDrag, isDragging } = useDragDrop();

const task = computed(() => props.node.task);
const tagDefs = computed(() =>
  task.value.tags.map((name) => {
    const def = tagStore.tagMap.get(name);
    return { name, color: def?.color ?? '#9ca3af' };
  }),
);

/** 获取同级兄弟节点列表（用于计算 drop 时的 targetIndex） */
function getSiblings(parentId: string | null): TreeNode[] {
  if (parentId === null) {
    return workspaceStore.filteredTree;
  }
  // 在 taskTree 中找 parent 节点的 children
  const find = (nodes: TreeNode[]): TreeNode | null => {
    for (const n of nodes) {
      if (n.task.id === parentId) return n;
      const found = find(n.children);
      if (found) return found;
    }
    return null;
  };
  const parent = find(workspaceStore.filteredTree);
  return parent ? parent.children : [];
}

/** 执行拖拽 drop */
function doDrop(targetId: string, pos: DropPosition) {
  const draggedId = dragState.value.draggingId;
  if (!draggedId || draggedId === targetId) return;

  const targetTask = props.node.task;
  const targetParentId = targetTask.parentId;

  if (pos === 'inside') {
    // 作为 target 的子任务，插入到末尾
    const children = props.node.children;
    const targetIndex = children.length;
    void workspaceStore.reorderTask(draggedId, targetId, targetIndex);
    return;
  }

  // before/after：在同一父级中排序
  const siblings = getSiblings(targetParentId);
  let targetIndex = siblings.findIndex((n) => n.task.id === targetId);
  if (targetIndex === -1) return;

  if (pos === 'after') {
    targetIndex += 1;
  }

  // 如果拖拽任务也在同一父级且在目标之前，targetIndex 减 1（因为移除后索引偏移）
  const draggedNode = siblings.find((n) => n.task.id === draggedId);
  if (draggedNode) {
    const draggedIdx = siblings.findIndex((n) => n.task.id === draggedId);
    if (draggedIdx !== -1 && draggedIdx < targetIndex) {
      targetIndex -= 1;
    }
  }

  void workspaceStore.reorderTask(draggedId, targetParentId, targetIndex);
}

// —— 拖拽事件 ——
function onDragStart(e: DragEvent) {
  startDrag(task.value.id);
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.value.id);
  }
}

function onDragEnd() {
  endDrag();
}

function onDragOver(e: DragEvent) {
  if (!dragState.value.draggingId) return;
  if (dragState.value.draggingId === task.value.id) return;
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
  const pos = calcDropPosition(e, e.currentTarget as HTMLElement);
  setHover(task.value.id, pos);
}

function onDragLeave() {
  if (dragState.value.hoverId === task.value.id) {
    clearHover();
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  if (!dragState.value.draggingId) return;
  const pos = dragState.value.hoverPos ?? calcDropPosition(e, e.currentTarget as HTMLElement);
  doDrop(task.value.id, pos);
  endDrag();
}

const hoverClass = computed(() => {
  if (dragState.value.hoverId !== task.value.id) return '';
  const pos = dragState.value.hoverPos;
  if (pos === 'before') return 'drop-before';
  if (pos === 'after') return 'drop-after';
  if (pos === 'inside') return 'drop-inside';
  return '';
});

function openEdit() {
  uiStore.openTaskEdit(task.value.id);
}
// 创建子项：以当前任务为父级、继承分组，打开新建任务弹窗
function onCreateChild() {
  uiStore.openTaskEdit(null, {
    parentId: task.value.id,
    groupId: task.value.groupId ?? null,
  });
}
function onArchive() {
  uiStore.openConfirm('归档任务', `确定归档「${task.value.title}」吗？`, () =>
    workspaceStore.archiveTask(task.value.id),
  );
}
function onDelete() {
  uiStore.openConfirm('删除任务', `确定删除「${task.value.title}」吗？此操作不可撤销。`, () =>
    workspaceStore.deleteTask(task.value.id),
  );
}
</script>

<template>
  <div
    :class="[
      isRoot ? 'rounded-md hover:bg-card transition-colors' : '',
      hoverClass,
      { 'dragging': isDragging(task.id) },
    ]"
  >
    <!-- 主行 -->
    <div
      class="group/task flex items-start gap-2 cursor-grab active:cursor-grabbing"
      :class="isRoot ? 'px-2 py-1.5' : 'py-1'"
      draggable="true"
      @dragstart="onDragStart"
      @dragend="onDragEnd"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @click="openEdit"
    >
      <span v-if="prefix" class="text-xs text-muted-foreground font-mono shrink-0 pt-0.5">{{
        prefix
      }}</span>
      <StatusDot :status="task.status" />
      <TagChip v-for="t in tagDefs" :key="t.name" :name="t.name" :color="t.color" />
      <span
        v-if="task.code"
        class="text-xs text-muted-foreground font-mono shrink-0"
        :class="task.status === 'done' ? 'line-through' : ''"
        >{{ task.code }}</span
      >
      <span
        class="text-sm break-words flex-1 min-w-0"
        :class="task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'"
        >{{ task.title }}</span
      >
      <!-- 行尾 hover 操作 -->
      <div
        class="flex items-center gap-0.5 opacity-0 group-hover/task:opacity-100 transition-opacity shrink-0"
      >
        <button
          type="button"
          aria-label="创建子项"
          title="创建子项"
          class="inline-flex items-center justify-center w-5 h-5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          @click.stop="onCreateChild"
        >
          <CornerDownRight class="w-3 h-3" />
        </button>
        <button
          type="button"
          aria-label="归档"
          title="归档"
          class="inline-flex items-center justify-center w-5 h-5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          @click.stop="onArchive"
        >
          <Archive class="w-3 h-3" />
        </button>
        <button
          type="button"
          aria-label="删除"
          title="删除"
          class="inline-flex items-center justify-center w-5 h-5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          @click.stop="onDelete"
        >
          <Trash2 class="w-3 h-3" />
        </button>
      </div>
    </div>
    <!-- note 行（└─ 前缀，无状态点） -->
    <div v-if="task.note" class="flex items-start gap-2 pl-8 pr-2 py-1">
      <span class="text-xs text-muted-foreground font-mono shrink-0">└─</span>
      <span class="text-xs text-muted-foreground break-words">{{ task.note }}</span>
    </div>
    <!-- 子任务（├─ / └─ 前缀，递归） -->
    <div v-if="node.children.length" class="pl-8 pr-2 space-y-1">
      <TaskNodeRow
        v-for="(child, i) in node.children"
        :key="child.task.id"
        :node="child"
        :prefix="i === node.children.length - 1 ? '└─' : '├─'"
        :is-root="false"
      />
    </div>
  </div>
</template>

<style scoped>
/* 拖拽中：被拖拽的行半透明 */
.dragging {
  opacity: 0.4;
}
/* drop before：上方插入线 */
.drop-before {
  box-shadow: inset 0 2px 0 0 var(--taskjian-primary);
}
/* drop after：下方插入线 */
.drop-after {
  box-shadow: inset 0 -2px 0 0 var(--taskjian-primary);
}
/* drop inside：高亮整行 */
.drop-inside {
  background-color: color-mix(in srgb, var(--taskjian-primary) 12%, transparent);
  border-radius: var(--taskjian-radius-medium);
}
</style>
