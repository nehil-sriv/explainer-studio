import { defineConfig } from 'vite';

// Phase 5: two entries — the LEGACY builder (index.html, untouched default)
// and the new React shell (editor.html). Either can be removed independently.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: './',
  server: { port: 8000 },
  preview: { port: 4173 },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        legacy: resolve(root, 'index.html'),
        editor: resolve(root, 'editor.html'),
        popout: resolve(root, 'popout.html'),
      },
    },
  },
});
