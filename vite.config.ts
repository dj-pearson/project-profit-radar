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
  // Build optimizations for Cloudflare Pages
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-slot', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-popover'],
          radix: ['@radix-ui/react-accordion', '@radix-ui/react-alert-dialog', '@radix-ui/react-tabs', '@radix-ui/react-toast', '@radix-ui/react-tooltip'],
          utils: ['clsx', 'tailwind-merge', 'class-variance-authority'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          router: ['react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          charts: ['recharts'],
          pdf: ['jspdf', 'jspdf-autotable'],
          excel: ['xlsx'],
          query: ['@tanstack/react-query']
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
      // Reduce bundle size by excluding heavy dependencies not needed in production
      external: mode === 'production' ? ['@capacitor/core', '@capacitor/android', '@capacitor/ios', '@capacitor/cli'] : []
    },
    chunkSizeWarningLimit: 1000,
    // Optimize for faster builds
    reportCompressedSize: false,
    // Enable build caching
    emptyOutDir: true
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
