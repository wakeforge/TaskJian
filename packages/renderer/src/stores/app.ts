import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { ThemeMode } from '@taskjian/shared';

export type Viewport = 'sm' | 'md' | 'lg' | '2xl';

/** 宽度区间 → viewport 断点（对齐设计 §5.5） */
function calcViewport(width: number): Viewport {
  if (width >= 1440) return '2xl';
  if (width >= 1024) return 'lg';
  if (width >= 768) return 'md';
  return 'sm';
}

export const useAppStore = defineStore('app', () => {
  const theme = ref<ThemeMode>('system');
  const sidebarCollapsed = ref(false);
  const viewport = ref<Viewport>('sm');
  // sm 断点下 Sidebar 变为 Drawer 时的打开状态（非持久化，仅运行时）
  const sidebarDrawerOpen = ref(false);
  // 跟踪系统颜色偏好，使 'system' 主题可响应式切换
  const systemDark = ref(false);

  const isDark = computed(() => {
    if (theme.value === 'dark') return true;
    if (theme.value === 'system') return systemDark.value;
    return false;
  });

  // 暗主题 CSS 变量在 theme.css 中挂在 html.dark 下，
  // 需要在 <html> 上同步切换 dark 类（同时 App.vue 根 div 也绑 dark 类覆盖 Tailwind dark: 变体）
  watch(
    isDark,
    (v) => {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', v);
      }
    },
    { immediate: true },
  );

  async function init() {
    // viewport 监听（resize 即时更新）
    const onResize = () => {
      viewport.value = calcViewport(window.innerWidth);
      // 离开 sm 断点时自动收起 Drawer，避免大屏残留 Drawer 态
      if (viewport.value !== 'sm') sidebarDrawerOpen.value = false;
    };
    onResize();
    window.addEventListener('resize', onResize);

    // 系统颜色方案监听（system 主题响应式）
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (mq) {
      systemDark.value = mq.matches;
      mq.addEventListener('change', (e) => {
        systemDark.value = e.matches;
      });
    }

    // 读取持久化设置
    if (typeof window.api === 'undefined') return;
    const res = await window.api.settings.get();
    if (res.code === 0 && res.data) {
      theme.value = res.data.theme;
      sidebarCollapsed.value = res.data.sidebarCollapsed;
    }
  }

  async function setTheme(t: ThemeMode) {
    theme.value = t;
    if (typeof window.api !== 'undefined') {
      await window.api.settings.update({ theme: t });
    }
  }

  // 三态循环：light → dark → system → light
  async function cycleTheme() {
    const order: ThemeMode[] = ['light', 'dark', 'system'];
    const idx = order.indexOf(theme.value);
    const next = order[(idx + 1) % order.length];
    await setTheme(next);
  }

  async function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value;
    if (typeof window.api !== 'undefined') {
      await window.api.settings.update({ sidebarCollapsed: sidebarCollapsed.value });
    }
  }

  function openSidebarDrawer() {
    sidebarDrawerOpen.value = true;
  }
  function closeSidebarDrawer() {
    sidebarDrawerOpen.value = false;
  }
  function toggleSidebarDrawer() {
    sidebarDrawerOpen.value = !sidebarDrawerOpen.value;
  }

  return {
    theme,
    sidebarCollapsed,
    viewport,
    sidebarDrawerOpen,
    isDark,
    init,
    setTheme,
    cycleTheme,
    toggleSidebar,
    openSidebarDrawer,
    closeSidebarDrawer,
    toggleSidebarDrawer,
  };
});
