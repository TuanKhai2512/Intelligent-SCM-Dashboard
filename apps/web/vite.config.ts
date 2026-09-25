import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const sharedSrc = fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url));
const appSrc = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@ims/shared': sharedSrc, '@': appSrc } },
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
