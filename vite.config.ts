import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwind()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['lenis'],
    esbuildOptions: {
      // Explicitly support import.meta to prevent warnings during dependency optimization
      // This tells esbuild that the target environment supports import.meta
      supported: {
        'import-meta': true
      },
      format: 'esm'
    }
  },
  build: {
    // Ensure ESM format for import.meta support
    // This prevents esbuild warnings about import.meta not being available with CJS format
    target: 'esnext',
    rollupOptions: {
      output: {
        format: 'es'
      }
    }
  }
})
