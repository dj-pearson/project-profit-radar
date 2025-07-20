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
  // Build optimizations for mobile performance
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React libraries
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          // UI libraries - split into smaller chunks for better caching
          if (id.includes('@radix-ui')) {
            if (id.includes('dialog') || id.includes('popover') || id.includes('select')) {
              return 'ui-interactive';
            }
            return 'ui-display';
          }
          // Utilities that rarely change
          if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority')) {
            return 'utils';
          }
          // Heavy libraries that should be separate
          if (id.includes('recharts')) return 'charts';
          if (id.includes('jspdf') || id.includes('xlsx')) return 'document-export';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('@tanstack/react-query')) return 'query';
          if (id.includes('react-router-dom')) return 'router';
          // Node modules that aren't core
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
      // Reduce bundle size by excluding heavy dependencies not needed in production
      external: mode === 'production' ? ['@capacitor/core', '@capacitor/android', '@capacitor/ios', '@capacitor/cli'] : []
    },
    chunkSizeWarningLimit: 500,
    // Optimize for mobile performance
    reportCompressedSize: false,
    emptyOutDir: true,
    // Enable aggressive compression
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
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
