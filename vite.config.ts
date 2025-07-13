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
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // More aggressive code splitting for better loading
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react';
            }
            if (id.includes('@radix-ui')) {
              return 'radix';
            }
            if (id.includes('recharts')) {
              return 'charts';
            }
            if (id.includes('jspdf') || id.includes('xlsx')) {
              return 'documents';
            }
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            if (id.includes('@tanstack')) {
              return 'query';
            }
            return 'vendor';
          }
          // Split by features for lazy loading
          if (id.includes('/pages/admin/')) {
            return 'admin';
          }
          if (id.includes('/pages/reports/') || id.includes('/components/reports/')) {
            return 'reports';
          }
          if (id.includes('/pages/crm/') || id.includes('/components/crm/')) {
            return 'crm';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
      external: mode === 'production' ? ['@capacitor/core', '@capacitor/android', '@capacitor/ios', '@capacitor/cli'] : []
    },
    chunkSizeWarningLimit: 500, // Stricter chunk size limit
    reportCompressedSize: false,
    emptyOutDir: true,
    // Additional mobile optimizations
    cssCodeSplit: true,
    assetsInlineLimit: 4096, // Inline smaller assets
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['@capacitor/core', '@capacitor/android', '@capacitor/ios', '@capacitor/cli']
  },
  // Reduce memory usage during build
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
}));
