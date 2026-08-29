import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// 注入应用版本（根 package.json）与构建时间，供「关于」弹窗展示
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));

export default defineConfig({
  plugins: [vue()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@taskjian/shared': resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist-renderer',
    emptyOutDir: true,
  },
});
