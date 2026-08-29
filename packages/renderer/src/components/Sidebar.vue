<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Archive } from 'lucide-vue-next';
import { useAppStore } from '../stores/app';
import { useWorkspaceStore, type TreeNode } from '../stores/workspace';
import { useUiStore } from '../stores/ui';
import type { Workspace } from '@taskjian/shared';

const app = useAppStore();
const workspaceStore = useWorkspaceStore();
const uiStore = useUiStore();
const router = useRouter();

// —— 响应式模式：sm=Drawer / md=窄轨悬停展开 / lg=220 / 2xl=240 ——
type SidebarMode = 'drawer' | 'rail' | 'full';
const mode = computed<SidebarMode>(() => {
  if (app.viewport === 'sm') return 'drawer';
  if (app.viewport === 'md') return 'rail';
  return 'full';
});
const fullWidth = computed(() => (app.viewport === '2xl' ? '240px' : '220px'));
const isDrawerOpen = computed(() => app.sidebarDrawerOpen);

const asideStyle = computed(() => {
  if (mode.value === 'drawer') {
    return {
      position: 'fixed' as const,
      top: '36px',
      left: '0',
      bottom: '0',
      width: fullWidth.value,
      transform: isDrawerOpen.value ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform 0.2s ease',
      zIndex: 40,
      boxShadow: 'var(--taskjian-shadow-2)',
    };
  }
  // rail 模式：56px → hover 时 220px（在 flex 流中，悬停挤压 main；过渡平滑）
  if (mode.value === 'rail') {
    return {
      width: '56px',
      transition: 'width 0.15s ease',
    };
  }
  return { width: fullWidth.value };
});

const asideClass = computed(() => {
  const base =
    'sidebar flex-shrink-0 border-r border-border bg-card flex flex-col overflow-y-auto overflow-x-hidden p-3 gap-3 select-none whitespace-nowrap';
  if (mode.value === 'drawer') return base;
  if (mode.value === 'rail') return `${base} hover:w-[220px]`;
  return base;
});

// Drawer 模式下点击遮罩关闭
function onDrawerBackdropClick() {
  app.closeSidebarDrawer();
}

// 选中工作区 / 进入归档后，自动收起 Drawer（移动端体验）
function collapseDrawerIfAny() {
  if (mode.value === 'drawer') app.closeSidebarDrawer();
}

// —— 分组计数：递归统计每个根任务子树，归到根任务的 groupId（含递归子任务） ——
function countDescendants(node: TreeNode): number {
  return 1 + node.children.reduce((sum, c) => sum + countDescendants(c), 0);
}
const groupCounts = computed(() => {
  const m = new Map<string, number>();
  for (const root of workspaceStore.taskTree) {
    const gid = root.task.groupId;
    if (gid) m.set(gid, (m.get(gid) ?? 0) + countDescendants(root));
  }
  return m;
});

// 点击分组 → 设置过滤器，再次点击同组 → 取消过滤
function onGroupClick(groupId: string) {
  if (workspaceStore.filter.groupId !== groupId) {
    workspaceStore.setFilter({ groupId });
  } else {
    workspaceStore.setFilter({ groupId: null });
  }
}

// —— 分组右键菜单：重命名 / 删除 ——
const groupCtxMenu = ref<{ x: number; y: number; groupId: string } | null>(null);
function onGroupContext(e: MouseEvent, groupId: string) {
  e.preventDefault();
  groupCtxMenu.value = { x: e.clientX, y: e.clientY, groupId };
}
function closeGroupCtxMenu() {
  groupCtxMenu.value = null;
}
async function onRenameGroup() {
  const id = groupCtxMenu.value?.groupId;
  closeGroupCtxMenu();
  if (!id) return;
  const g = workspaceStore.groupMap.get(id);
  const name = window.prompt('重命名分组', g?.name ?? '');
  if (name && name.trim()) await workspaceStore.updateGroup(id, { name: name.trim() });
}
function onDeleteGroup() {
  const id = groupCtxMenu.value?.groupId;
  closeGroupCtxMenu();
  if (!id) return;
  const g = workspaceStore.groupMap.get(id);
  uiStore.openConfirm(
    '删除分组',
    `确定删除分组「${g?.name ?? ''}」吗？该分组下的任务将变为未分组，任务本身不会被删除。`,
    () => workspaceStore.deleteGroup(id),
  );
}

// —— 工作区 ——
async function onAddWorkspace() {
  const name = window.prompt('新建工作区名称');
  if (name && name.trim()) await workspaceStore.createWorkspace(name.trim());
}
async function onSelectWorkspace(id: string) {
  await workspaceStore.setActive(id);
  collapseDrawerIfAny();
}

// —— 工作区右键菜单：重命名 / 删除 ——
const ctxMenu = ref<{ x: number; y: number; workspaceId: string } | null>(null);
function onWorkspaceContext(e: MouseEvent, w: Workspace) {
  e.preventDefault();
  ctxMenu.value = { x: e.clientX, y: e.clientY, workspaceId: w.id };
}
function closeCtxMenu() {
  ctxMenu.value = null;
}
async function onRenameWorkspace() {
  const id = ctxMenu.value?.workspaceId;
  closeCtxMenu();
  if (!id) return;
  const w = workspaceStore.workspaces.find((x) => x.id === id);
  const name = window.prompt('重命名工作区', w?.name ?? '');
  if (name && name.trim()) await workspaceStore.renameWorkspace(id, name.trim());
}
function onDeleteWorkspace() {
  const id = ctxMenu.value?.workspaceId;
  closeCtxMenu();
  if (!id) return;
  const w = workspaceStore.workspaces.find((x) => x.id === id);
  uiStore.openConfirm('删除工作区', `确定删除工作区「${w?.name ?? ''}」吗？该操作不可撤销。`, () =>
    workspaceStore.deleteWorkspace(id),
  );
}

// 点击任意处关闭所有右键菜单
function onGlobalClick() {
  closeCtxMenu();
  closeGroupCtxMenu();
}
onMounted(() => window.addEventListener('click', onGlobalClick));
onUnmounted(() => window.removeEventListener('click', onGlobalClick));

// —— 归档：进入归档路由（load 由 ArchiveView onMounted 完成） ——
async function onArchive() {
  collapseDrawerIfAny();
  await router.push('/archive');
}
</script>

<template>
  <!-- sm 模式：Drawer 遮罩 -->
  <Teleport v-if="mode === 'drawer'" to="body">
    <div
      v-if="isDrawerOpen"
      class="fixed inset-0 z-30"
      style="top: 36px; background-color: color-mix(in srgb, var(--taskjian-ink) 35%, transparent);"
      @click="onDrawerBackdropClick"
    />
  </Teleport>
  <aside :class="asideClass" :style="asideStyle" data-dom-id="app-sidebar">
    <!-- 任务导航 -->
    <section>
      <h2 class="px-2 mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        任务导航
      </h2>
      <nav class="space-y-0.5">
        <button
          v-for="g in workspaceStore.activeGroups"
          :key="g.id"
          type="button"
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors overflow-hidden"
          :class="
            workspaceStore.filter.groupId === g.id
              ? 'font-medium text-foreground bg-muted'
              : 'text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          "
          @click="onGroupClick(g.id)"
          @contextmenu="onGroupContext($event, g.id)"
        >
          <span class="flex-1 text-left truncate">{{ g.name }}</span>
          <span class="text-xs text-muted-foreground tabular-nums shrink-0">{{ groupCounts.get(g.id) ?? 0 }}</span>
        </button>
        <p
          v-if="workspaceStore.activeGroups.length === 0"
          class="px-2 py-1.5 text-xs text-muted-foreground"
        >
          暂无分组
        </p>
      </nav>
    </section>

    <hr class="border-border" />

    <!-- 工作区 -->
    <section>
      <div class="flex items-center justify-between px-2 mb-1.5">
        <h2 class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">工作区</h2>
        <button
          type="button"
          aria-label="添加工作区"
          data-dom-id="btn-workspace-add"
          class="flex items-center justify-center w-5 h-5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors shrink-0"
          @click="onAddWorkspace"
        >
          <Plus class="w-3.5 h-3.5" />
        </button>
      </div>
      <nav class="space-y-0.5">
        <button
          v-for="w in workspaceStore.workspaces"
          :key="w.id"
          type="button"
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors overflow-hidden"
          :class="
            workspaceStore.activeWorkspaceId === w.id
              ? 'font-medium text-primary'
              : 'text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          "
          :style="
            workspaceStore.activeWorkspaceId === w.id
              ? { backgroundColor: 'color-mix(in srgb, var(--taskjian-primary) 10%, transparent)' }
              : {}
          "
          @click="onSelectWorkspace(w.id)"
          @contextmenu="onWorkspaceContext($event, w)"
        >
          <span
            class="w-1.5 h-1.5 rounded-full shrink-0"
            :class="workspaceStore.activeWorkspaceId === w.id ? 'bg-primary' : 'bg-muted-foreground'"
          />
          <span class="flex-1 text-left truncate">{{ w.name }}</span>
        </button>
        <p v-if="workspaceStore.workspaces.length === 0" class="px-2 py-1.5 text-xs text-muted-foreground">
          暂无工作区
        </p>
      </nav>
    </section>

    <hr class="border-border" />

    <button
      type="button"
      data-dom-id="btn-archive"
      class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors overflow-hidden"
      @click="onArchive"
    >
      <Archive class="w-4 h-4 text-muted-foreground shrink-0" />
      <span class="flex-1 text-left truncate">归档</span>
    </button>

    <!-- 工作区右键菜单 -->
    <Teleport to="body">
      <div
        v-if="ctxMenu"
        class="fixed z-50 min-w-[120px] bg-popover border border-border rounded-md shadow-2 py-1"
        :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }"
        @click.stop
      >
        <button
          type="button"
          class="block w-full text-left text-sm text-foreground px-3 py-1.5 hover:bg-muted transition-colors"
          @click="onRenameWorkspace"
        >
          重命名
        </button>
        <button
          type="button"
          class="block w-full text-left text-sm text-foreground px-3 py-1.5 hover:bg-muted transition-colors"
          @click="onDeleteWorkspace"
        >
          删除
        </button>
      </div>
    </Teleport>

    <!-- 分组右键菜单 -->
    <Teleport to="body">
      <div
        v-if="groupCtxMenu"
        class="fixed z-50 min-w-[120px] bg-popover border border-border rounded-md shadow-2 py-1"
        :style="{ left: groupCtxMenu.x + 'px', top: groupCtxMenu.y + 'px' }"
        @click.stop
      >
        <button
          type="button"
          class="block w-full text-left text-sm text-foreground px-3 py-1.5 hover:bg-muted transition-colors"
          @click="onRenameGroup"
        >
          重命名
        </button>
        <button
          type="button"
          class="block w-full text-left text-sm text-foreground px-3 py-1.5 hover:bg-muted transition-colors"
          @click="onDeleteGroup"
        >
          删除
        </button>
      </div>
    </Teleport>
  </aside>
</template>
