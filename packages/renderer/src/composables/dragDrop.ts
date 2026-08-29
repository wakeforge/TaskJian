// 拖拽状态管理：原生 HTML5 拖拽，支持同级排序与跨级嵌套。
// drop 位置判定：行上 1/3 → before（排序），行下 1/3 → after（排序），中间 1/3 → inside（作为子任务）。
import { ref } from 'vue';

export type DropPosition = 'before' | 'after' | 'inside';

export interface DragState {
  draggingId: string | null;
  /** 当前拖拽悬停的目标行 id */
  hoverId: string | null;
  /** 悬停位置 */
  hoverPos: DropPosition | null;
}

const state = ref<DragState>({
  draggingId: null,
  hoverId: null,
  hoverPos: null,
});

/** 判断鼠标在行内属于上/中/下哪个区域 */
export function calcDropPosition(e: DragEvent, el: HTMLElement): DropPosition {
  const rect = el.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const h = rect.height;
  if (y < h * 0.33) return 'before';
  if (y > h * 0.67) return 'after';
  return 'inside';
}

export function useDragDrop() {
  function startDrag(id: string) {
    state.value = { draggingId: id, hoverId: null, hoverPos: null };
  }

  function setHover(id: string, pos: DropPosition) {
    state.value.hoverId = id;
    state.value.hoverPos = pos;
  }

  function clearHover() {
    state.value.hoverId = null;
    state.value.hoverPos = null;
  }

  function endDrag() {
    state.value = { draggingId: null, hoverId: null, hoverPos: null };
  }

  function isDragging(id: string): boolean {
    return state.value.draggingId === id;
  }

  return {
    dragState: state,
    startDrag,
    setHover,
    clearHover,
    endDrag,
    isDragging,
  };
}
