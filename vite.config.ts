/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative base so the built assets work both on static hosting (sub-paths)
  // and inside the Capacitor Android webview (served from the bundled file://).
  base: './',
  plugins: [react()],
  // Honour a PORT supplied by the environment (e.g. the preview harness) so the
  // dev server lands on the expected port instead of auto-incrementing.
  server: {
    port: Number(process.env.PORT) || 5173,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
