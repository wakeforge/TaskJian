import { onMounted, onUnmounted } from 'vue';
import { useUiStore } from '../stores/ui';

/**
 * 全局快捷键 composable（设计 §5.4.8）：
 * - Ctrl/Cmd+Enter → 打开 TaskEdit 新建
 * - Esc → 关闭最上层浮层/弹窗（栈式）
 * - Ctrl/Cmd+S → 若 TaskEdit 打开则保存（派发自定义事件，TaskEditDialog 在 T7 监听）
 */
export function useShortcuts() {
  const ui = useUiStore();

  const onKeydown = (e: KeyboardEvent) => {
    const ctrl = e.ctrlKey || e.metaKey;

    // Ctrl/Cmd + Enter → 新建任务编辑
    if (ctrl && e.key === 'Enter') {
      e.preventDefault();
      ui.openTaskEdit(null);
      return;
    }

    // Ctrl/Cmd + S → 保存当前编辑中的任务
    if (ctrl && (e.key === 's' || e.key === 'S')) {
      if (ui.taskEditOpen) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('taskjian:save-task-edit'));
      }
      return;
    }

    // Esc → 栈式关闭最上层浮层/弹窗
    if (e.key === 'Escape') {
      if (ui.confirmDialog.open) {
        ui.closeConfirm();
        return;
      }
      if (ui.tagManagementOpen) {
        ui.tagManagementOpen = false;
        return;
      }
      if (ui.taskEditOpen) {
        ui.closeTaskEdit();
        return;
      }
      if (ui.tagFilterOpen) {
        ui.tagFilterOpen = false;
        return;
      }
      if (ui.statusFilterOpen) {
        ui.statusFilterOpen = false;
        return;
      }
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', onKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown);
  });
}
