import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from 'rollup-plugin-visualizer';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    mode === "production" && visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true
    }),
    mode === "production" && ViteImageOptimizer({
      png: { quality: 80 },
      jpeg: { quality: 80 },
      jpg: { quality: 80 },
      webp: { quality: 80 },
      avif: { quality: 70 }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Exclude React Native and Expo from web build
      "react-native": path.resolve(__dirname, "./src/lib/react-native-web-fallback.ts"),
      "react-native-web": path.resolve(__dirname, "./src/lib/react-native-web-fallback.ts"),
      "@react-native-async-storage/async-storage": path.resolve(__dirname, "./src/lib/storage-web-fallback.ts"),
      // Provide web fallbacks for Capacitor modules
      "@capacitor/core": path.resolve(
        __dirname,
        "./src/lib/capacitor-web-fallback.ts"
      ),
      "@capacitor/app": path.resolve(
        __dirname,
        "./src/lib/capacitor-web-fallback.ts"
      ),
      "@capacitor/camera": path.resolve(
        __dirname,
        "./src/lib/capacitor-web-fallback.ts"
      ),
      "@capacitor/device": path.resolve(
        __dirname,
        "./src/lib/capacitor-web-fallback.ts"
      ),
      "@capacitor/filesystem": path.resolve(
        __dirname,
        "./src/lib/capacitor-web-fallback.ts"
      ),
      "@capacitor/geolocation": path.resolve(
        __dirname,
        "./src/lib/capacitor-web-fallback.ts"
      ),
      "@capacitor/local-notifications": path.resolve(
        __dirname,
        "./src/lib/capacitor-web-fallback.ts"
      ),
      "@capacitor/preferences": path.resolve(
        __dirname,
        "./src/lib/capacitor-web-fallback.ts"
      ),
      "@capacitor/push-notifications": path.resolve(
        __dirname,
        "./src/lib/capacitor-web-fallback.ts"
      ),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
  // Build optimizations for mobile performance
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: false,
    chunkSizeWarningLimit: 400, // More aggressive warning
    reportCompressedSize: true,
    emptyOutDir: true,

    // Improve compilation performance
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },

    // Advanced compression and optimization
    cssCodeSplit: true,
    cssMinify: true,
    assetsInlineLimit: 8192, // Inline assets up to 8KB
    modulePreload: {
      polyfill: false, // Remove polyfill for modern browsers
    },
    
    // Performance optimizations
    rollupOptions: {
      output: {
        // More granular chunking for better caching
        manualChunks: {
          // Core framework
          'react-core': ['react', 'react-dom'],
          'react-router': ['react-router-dom'],
          
          // UI framework  
          'ui-core': [
            '@radix-ui/react-slot',
            '@radix-ui/react-dialog', 
            '@radix-ui/react-dropdown-menu'
          ],
          'ui-extended': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip'
          ],
          
          // Utilities
          'utils': ['clsx', 'tailwind-merge', 'class-variance-authority'],
          'date-utils': ['date-fns'],
          
          // Feature chunks
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'auth': ['@supabase/supabase-js'],
          'charts': ['recharts'],
          'documents': ['jspdf', 'jspdf-autotable', 'xlsx'],
          'query': ['@tanstack/react-query'],
          'three': ['three', '@react-three/fiber', '@react-three/drei'],
          'dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities', '@hello-pangea/dnd'],
          'media': ['qr-scanner', 'qrcode', 'signature_pad', 'tesseract.js'],
          'markdown': ['react-markdown'],
          
          // Performance and monitoring
          'performance': [
            '@/components/performance/LazyComponents',
            '@/hooks/usePerformanceMonitor'
          ],
          
          // SEO and analytics
          'seo': [
            'react-helmet-async',
            '@/components/SEOMetaTags',
            '@/components/EnhancedSchemaMarkup'
          ]
        },
        
        // Optimized file naming for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? 
            chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '') : 
            'chunk';
          return `assets/${facadeModuleId}-[hash].js`;
        },
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return 'assets/images/[name]-[hash].[ext]';
          }
          if (/woff2?|eot|ttf|otf/i.test(ext || '')) {
            return 'assets/fonts/[name]-[hash].[ext]';
          }
          return 'assets/[name]-[hash].[ext]';
        }
      }
    }
  },
  // Optimize dependency pre-bundling for mobile
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-router-dom",
      "react-helmet-async",
      "@radix-ui/react-slot",
      "clsx",
      "tailwind-merge",
    ],
    exclude: [
      "react-native",
      "react-native-web", 
      "@react-native-async-storage/async-storage",
      "expo",
      "expo-router",
      "expo-constants"
    ],
  },

  // Mobile-optimized esbuild settings
  esbuild: {
    logOverride: { "this-is-undefined-in-esm": "silent" },
    target: "esnext",
    treeShaking: true,
    // Strip console logs in production for better performance
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));
