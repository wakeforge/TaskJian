<script setup lang="ts">
import { computed } from 'vue';
import { Sun, Moon, Monitor } from 'lucide-vue-next';
import { useUiStore } from '../stores/ui';
import { useAppStore } from '../stores/app';
import type { ThemeMode } from '@taskjian/shared';

const ui = useUiStore();
const app = useAppStore();

const themeOptions: { value: ThemeMode; label: string; icon: unknown }[] = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
];

const currentTheme = computed<ThemeMode>(() => app.theme);

function onThemeSelect(t: ThemeMode) {
  void app.setTheme(t);
}

function onClose() {
  ui.settingsOpen = false;
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="ui.settingsOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="onClose"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="全局配置"
        class="relative w-full max-w-[420px] mx-4 bg-card rounded-lg border border-border flex flex-col shadow-2"
      >
        <div class="px-4 pt-4 pb-2 border-b border-border">
          <h2 class="text-base font-semibold text-foreground">全局配置</h2>
        </div>

        <div class="px-4 py-4">
          <!-- 外观 -->
          <h3 class="mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            外观
          </h3>
          <div class="text-sm text-foreground mb-2">主题</div>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="opt in themeOptions"
              :key="opt.value"
              type="button"
              class="flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-md border text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              :class="
                currentTheme === opt.value
                  ? 'border-primary text-primary bg-primary/10 font-medium'
                  : 'border-border text-foreground hover:bg-muted'
              "
              :aria-pressed="currentTheme === opt.value"
              @click="onThemeSelect(opt.value)"
            >
              <component :is="opt.icon" class="w-4 h-4" />
              <span>{{ opt.label }}</span>
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
