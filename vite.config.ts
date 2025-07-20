import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Aggressive mobile performance optimization
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: false,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React - smallest possible bundle
          if (id.includes('react/') || id.includes('react-dom/')) {
            return 'react-core';
          }
          // Critical UI components
          if (id.includes('@radix-ui/react-dialog') || id.includes('@radix-ui/react-button')) {
            return 'ui-critical';
          }
          // Non-critical UI
          if (id.includes('@radix-ui')) {
            return 'ui-extended';
          }
          // Router - separate for caching
          if (id.includes('react-router')) {
            return 'router';
          }
          // Heavy features - load on demand
          if (id.includes('recharts') || id.includes('jspdf') || id.includes('xlsx')) {
            return 'heavy-features';
          }
          // Database
          if (id.includes('@supabase') || id.includes('@tanstack/react-query')) {
            return 'database';
          }
          // Icons - separate chunk
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          // Utils - small and cacheable
          if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority')) {
            return 'utils';
          }
          // Everything else
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
      external: mode === 'production' ? ['@capacitor/core', '@capacitor/android', '@capacitor/ios'] : []
    },
    chunkSizeWarningLimit: 300,
    reportCompressedSize: false,
    emptyOutDir: true,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
        passes: 2,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
  },
  // Optimize dependency pre-bundling for mobile
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['@capacitor/core', '@capacitor/android', '@capacitor/ios', '@capacitor/cli'],
    esbuildOptions: {
      target: 'es2020',
    },
  },
  // Reduce memory usage during build
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
}));
