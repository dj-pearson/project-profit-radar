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
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      "react/jsx-runtime": path.resolve(__dirname, "node_modules/react/jsx-runtime.js"),
      "react/jsx-dev-runtime": path.resolve(__dirname, "node_modules/react/jsx-dev-runtime.js"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  // Build optimizations for mobile performance
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React chunks
          vendor: ['react', 'react-dom'],
          
          // UI Library chunks
          ui: ['@radix-ui/react-slot', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-popover'],
          radix: ['@radix-ui/react-accordion', '@radix-ui/react-alert-dialog', '@radix-ui/react-tabs', '@radix-ui/react-toast', '@radix-ui/react-tooltip'],
          
          // Utility chunks
          utils: ['clsx', 'tailwind-merge', 'class-variance-authority'],
          
          // Feature-specific chunks
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          router: ['react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          charts: ['recharts'],
          pdf: ['jspdf', 'jspdf-autotable'],
          excel: ['xlsx'],
          query: ['@tanstack/react-query'],
          
          // Mobile-specific chunks
          pwa: ['@/hooks/usePWA', '@/components/PWAInstallPrompt', '@/components/OfflineIndicator'],
          performance: ['@/components/performance/LazyComponents', '@/hooks/usePerformanceMonitor']
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
      // Do not externalize runtime deps; let Vite bundle everything to avoid unresolved module specifiers in the browser
    },
    chunkSizeWarningLimit: 800, // Reduced for mobile optimization
    reportCompressedSize: false,
    emptyOutDir: true,
    
    // Aggressive compression for mobile
    cssCodeSplit: true,
    assetsInlineLimit: 4096, // Inline small assets
  },
  // Optimize dependency pre-bundling for mobile
  optimizeDeps: {
    include: [
      'react', 
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      '@radix-ui/react-slot',
      'clsx',
      'tailwind-merge'
    ],
    exclude: []
  },
  
  // Mobile-optimized esbuild settings
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    target: 'esnext',
    treeShaking: true
  }
}));
