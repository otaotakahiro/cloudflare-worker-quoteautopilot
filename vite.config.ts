import { createHash } from 'node:crypto';
import { fileURLToPath, URL } from 'node:url';
import { cloudflare } from '@cloudflare/vite-plugin';
import basicSslPlugin from '@vitejs/plugin-basic-ssl';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { beasties } from 'vite-plugin-beasties';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import vueDevTools from 'vite-plugin-vue-devtools';

// https://vite.dev/config/
export default defineConfig({
  appType: 'spa',
  build: {
    minify: 'esbuild',
    cssMinify: 'lightningcss',
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            const match = id.match(/node_modules\/(.*?)\//);
            const packageName = match ? match[1] : 'unknown';
            const hash = createHash('sha256').update(packageName).digest('hex').slice(0, 8);

            return `vendor-${hash}`;
          }

          return null;
        },
      },
    },
  },
  server: {
    host: true,
    fs: {
      allow: ['..'],
    },
  },
  plugins: [
    vue(),
    vueDevTools(),
    ViteImageOptimizer({
      png: { quality: 80 },
      jpeg: { quality: 80 },
      jpg: { quality: 80 },
      webp: { quality: 80 },
      avif: { quality: 80 },
    }),
    cssInjectedByJsPlugin(),
    beasties(),
    basicSslPlugin(),
    cloudflare({ configPath: './wrangler.jsonc' }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@prisma/client': fileURLToPath(new URL('./node_modules/.prisma/client', import.meta.url)),
    },
  },
  define: {
    'process.env.PRISMA_CLIENT_FORCE_WASM': true,
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  publicDir: 'public',
});
