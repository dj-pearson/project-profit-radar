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
        // Optimized chunking strategy for better performance
        manualChunks: (id) => {
          // Node modules chunking
          if (id.includes('node_modules')) {
            // Core React - smallest possible initial bundle
            if (id.includes('react-dom') || id.includes('/react/')) {
              return 'react-core';
            }

            // Router - needed for navigation
            if (id.includes('react-router')) {
              return 'react-router';
            }

            // Core UI components (Radix) - essential
            if (id.includes('@radix-ui/react-slot') ||
                id.includes('@radix-ui/react-dialog') ||
                id.includes('@radix-ui/react-dropdown-menu')) {
              return 'ui-core';
            }

            // Extended UI components - load on demand
            if (id.includes('@radix-ui')) {
              return 'ui-extended';
            }

            // Utilities - small, commonly used
            if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority')) {
              return 'utils';
            }

            // Date utilities
            if (id.includes('date-fns')) {
              return 'date-utils';
            }

            // Forms - load when forms are used
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('/zod/')) {
              return 'forms';
            }

            // Auth/Supabase - load on auth pages
            if (id.includes('@supabase')) {
              return 'auth';
            }

            // TanStack Query - data fetching
            if (id.includes('@tanstack/react-query')) {
              return 'query';
            }

            // Charts - heavy, load only when needed
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'charts';
            }

            // 3D - very heavy, load only for 3D views
            if (id.includes('three') || id.includes('@react-three')) {
              return 'three';
            }

            // Documents - heavy, load for export features
            if (id.includes('jspdf') || id.includes('xlsx')) {
              return 'documents';
            }

            // Drag and drop - load for interactive features
            if (id.includes('@dnd-kit') || id.includes('@hello-pangea/dnd')) {
              return 'dnd';
            }

            // Media processing - heavy, load on demand
            if (id.includes('qr-scanner') || id.includes('qrcode') ||
                id.includes('signature_pad') || id.includes('tesseract')) {
              return 'media';
            }

            // Markdown - load for content pages
            if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype')) {
              return 'markdown';
            }

            // Sentry and monitoring - can be deferred
            if (id.includes('@sentry')) {
              return 'monitoring';
            }

            // PostHog analytics - can be deferred
            if (id.includes('posthog')) {
              return 'analytics';
            }

            // SEO
            if (id.includes('react-helmet-async')) {
              return 'seo';
            }

            // Remaining vendor code
            return 'vendor';
          }

          // App code chunking - let Vite handle route-based splitting
          return undefined;
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
