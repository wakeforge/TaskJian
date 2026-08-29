<script setup lang="ts">
import { computed } from 'vue';
import { CheckSquare, Globe, Github, ExternalLink } from 'lucide-vue-next';
import { useUiStore } from '../stores/ui';

const ui = useUiStore();

// vite.config.ts define 注入：__APP_VERSION__ 来自根 package.json；__BUILD_DATE__ 为构建时刻
const version = __APP_VERSION__;
const buildDate = computed(() => {
  const d = new Date(__BUILD_DATE__);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
});

const links = [
  { label: '介绍网站', url: 'https://wakeforge.github.io/TaskJian', icon: Globe },
  { label: 'GitHub', url: 'https://github.com/wakeforge/TaskJian', icon: Github },
];

// 链接通过主进程 shell.openExternal 用系统默认浏览器打开；
// 纯 Vite dev（无 Electron preload）下 window.api 为 undefined，静默无操作。
function onOpenLink(url: string) {
  if (typeof window.api !== 'undefined') void window.api.window.openExternal(url);
}

function onClose() {
  ui.aboutOpen = false;
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="ui.aboutOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="onClose"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="关于"
        class="relative w-full max-w-[380px] mx-4 bg-card rounded-lg border border-border flex flex-col shadow-2"
      >
        <div class="px-4 pt-4 pb-2 border-b border-border">
          <h2 class="text-base font-semibold text-foreground">关于</h2>
        </div>

        <div class="px-4 py-4">
          <!-- 程序名称 -->
          <div class="flex items-center gap-3 mb-4">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <CheckSquare class="w-5 h-5 text-primary" />
            </div>
            <div class="text-sm font-semibold text-foreground">任笺 TaskJian</div>
          </div>

          <!-- 版本信息 / 发布时间 -->
          <div class="flex flex-col gap-2 mb-4 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">版本</span>
              <span class="font-medium text-foreground">v{{ version }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">发布时间</span>
              <span class="font-medium text-foreground">{{ buildDate }}</span>
            </div>
          </div>

          <!-- 链接 -->
          <div class="flex flex-col gap-1">
            <button
              v-for="link in links"
              :key="link.url"
              type="button"
              class="flex items-center justify-between px-3 py-2 rounded-md border border-border text-sm text-foreground hover:bg-muted active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
              @click="onOpenLink(link.url)"
            >
              <span class="flex items-center gap-2">
                <component :is="link.icon" class="w-4 h-4 text-muted-foreground" />
                <span>{{ link.label }}</span>
              </span>
              <ExternalLink class="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div class="flex items-center justify-end px-4 py-3 border-t border-border">
          <button
            type="button"
            class="px-3 py-1.5 rounded-md border border-border bg-card text-foreground text-xs font-medium hover:bg-muted active:scale-[0.98] transition-colors"
            @click="onClose"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
