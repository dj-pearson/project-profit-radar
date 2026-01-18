import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from 'rollup-plugin-visualizer';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import { copyFileSync, existsSync, mkdirSync } from 'fs';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    // mode === "development" && componentTagger(),
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
    }),
    // Copy service worker during build
    mode === "production" && {
      name: 'copy-sw',
      writeBundle() {
        try {
          // Ensure dist directory exists
          if (!existsSync('dist')) {
            mkdirSync('dist', { recursive: true });
          }
          if (existsSync('public/sw.js')) {
            copyFileSync('public/sw.js', 'dist/sw.js');
          }
        } catch (err) {
          // Non-fatal: service worker copy failed
        }
      }
    }
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

    // Exclude mobile-app directory from web builds
    exclude: ['mobile-app/**/*'],

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
        // DISABLE manual chunking to prevent React dependency issues
        // Let Vite's automatic chunking handle everything
        // This ensures React and components that depend on it stay together
        manualChunks: undefined,
        
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
