import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const appRoot = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  root: appRoot,
  build: {
    outDir: resolve(appRoot, '../dist'),
    emptyOutDir: true,
  },
});
