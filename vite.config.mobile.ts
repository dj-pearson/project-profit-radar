import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Vite configuration for Capacitor mobile builds.
 *
 * This config is isolated from the web production build (vite.config.ts)
 * to ensure mobile-specific optimizations don't affect the live web version.
 *
 * Usage: npm run build:mobile
 * Output: dist-mobile/ (used by Capacitor sync)
 */
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Exclude React Native / Expo from Capacitor builds — these are web fallbacks
      "react-native": path.resolve(__dirname, "./src/lib/react-native-web-fallback.ts"),
      "react-native-web": path.resolve(__dirname, "./src/lib/react-native-web-fallback.ts"),
      "@react-native-async-storage/async-storage": path.resolve(__dirname, "./src/lib/storage-web-fallback.ts"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
  define: {
    // Flag to detect mobile builds at runtime
    '__MOBILE_BUILD__': JSON.stringify(true),
    '__APP_VERSION__': JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
  build: {
    outDir: "dist-mobile",
    target: "es2020", // Broader compatibility for older devices
    minify: "esbuild",
    sourcemap: false,
    emptyOutDir: true,
    chunkSizeWarningLimit: 600, // Mobile has more tolerance for initial load
    reportCompressedSize: true,

    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },

    cssCodeSplit: true,
    cssMinify: true,
    assetsInlineLimit: 4096, // Smaller inline limit for mobile (4KB)
    modulePreload: {
      polyfill: false,
    },

    rollupOptions: {
      output: {
        manualChunks: undefined,
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];

          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp|avif/i.test(ext || '')) {
            return 'assets/images/[name]-[hash].[ext]';
          }
          if (/woff2?|eot|ttf|otf/i.test(ext || '')) {
            return 'assets/fonts/[name]-[hash].[ext]';
          }
          return 'assets/[name]-[hash].[ext]';
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-router-dom",
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
      "expo-constants",
    ],
  },
  esbuild: {
    logOverride: { "this-is-undefined-in-esm": "silent" },
    target: "es2020",
    treeShaking: true,
    // Keep console in mobile builds for debugging via Safari Web Inspector
    // Strip only debugger statements in production
    drop: mode === 'production' ? ['debugger'] : [],
  },
}));
