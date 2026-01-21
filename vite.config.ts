
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // GitHub Pagesなどの相対パス環境に対応
  build: {
    outDir: 'dist',
    target: 'esnext'
  },
  server: {
    port: 3000
  }
});
