import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@tanstack/react-query')) {
            return 'query-vendor';
          }
          if (id.includes('lucide-react')) {
            return 'icons-vendor';
          }
          return 'vendor';
        },
      },
    },
  },
});
