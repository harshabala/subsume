import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Chrome loads manifest content scripts as classic scripts, so this entry must be a
// self-contained IIFE. The main build shares chunks between entries (ES imports),
// which content scripts cannot use. The iife lib format already disables code
// splitting, so dynamic imports are inlined without extra options.
export default defineConfig({
  base: './',
  plugins: [preact()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/content/index.ts'),
      formats: ['iife'],
      name: 'SubsumeContent',
      fileName: () => 'content.js',
      cssFileName: 'content',
    },
    minify: true,
  },
});
