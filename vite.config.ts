import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from 'rollup-plugin-visualizer';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { addCspReporting, sentrySecurityEndpoint } from './scripts/csp-reporting.mjs';
import {
  findEagerLazyOnlyChunks,
  manualChunkFor,
  MANUAL_CHUNK_NAMES,
} from './scripts/vite-chunking';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env for the target mode (Cloudflare Pages injects [vars] as process.env;
  // local builds read .env files). No prefix filter so we can read any key.
  const env = loadEnv(mode, process.cwd(), "");

  // Fail the production build FAST if required public runtime config is missing.
  // These values are injected via the Cloudflare Pages environment (per env),
  // NOT committed to wrangler.toml. See docs/DEPLOYMENT_ENV.md.
  if (mode === "production") {
    const REQUIRED_PUBLIC_VARS = ["VITE_SUPABASE_PUBLISHABLE_KEY"];
    const missing = REQUIRED_PUBLIC_VARS.filter(
      (k) => !env[k] || env[k].trim() === ""
    );
    if (missing.length > 0) {
      throw new Error(
        `[build] Missing required environment variable(s): ${missing.join(", ")}. ` +
          "Set them in the Cloudflare Pages environment for this deployment " +
          "(Production and Preview) — see docs/DEPLOYMENT_ENV.md."
      );
    }
  }

  return {
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    // The lovable-tagger dev plugin used to sit here, commented out, with a
    // live import of it at the top of the file. The import was the only thing
    // eslint could see, so it failed as unused on every commit that touched
    // this file. Re-add both together if the plugin is ever wanted back.
    // Bundle treemap, only for `npm run build:analyze`. It used to land in
    // dist/stats.html on every production build and deploy with the site
    // (2.9 MB, public). It is written outside dist/ now (US-388).
    process.env.npm_lifecycle_event === "build:analyze" && visualizer({
      filename: '.bundle-stats/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true
    }),
    // Fail the build if index.html would modulepreload three/recharts/xlsx.
    // Those are only ever needed behind a lazy import(); a helper leaking into
    // their chunk is enough to put them on every marketing route's first
    // paint (US-388). See scripts/vite-chunking.ts.
    ({
      name: 'guard-lazy-only-chunks',
      apply: 'build',
      generateBundle(_options, bundle) {
        const eager = findEagerLazyOnlyChunks(bundle);
        if (eager.length > 0) {
          this.error(
            `[US-388] entry statically imports lazy-only chunk(s): ${eager.join(', ')}. ` +
              'Something shared was captured by that manual chunk; route it to ' +
              '`framework` in scripts/vite-chunking.ts.'
          );
        }
      },
    } satisfies Plugin),
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
    },
    // CSP violation reports go to Sentry's security endpoint (US-202). The
    // endpoint is per-environment, so public/_headers carries no report-uri
    // and it is appended to dist/_headers here, only when VITE_SENTRY_DSN is
    // set. See scripts/csp-reporting.mjs.
    mode === "production" && (() => {
      let outDir = 'dist';
      return {
        name: 'csp-reporting',
        apply: 'build',
        configResolved(config) {
          outDir = path.resolve(config.root, config.build.outDir);
        },
        closeBundle() {
          const file = path.join(outDir, '_headers');
          const dsn = env.VITE_SENTRY_DSN;
          if (!dsn || !existsSync(file)) return;
          const endpoint = sentrySecurityEndpoint(dsn, mode);
          if (!endpoint) {
            this.warn('[csp-reporting] VITE_SENTRY_DSN did not parse; CSP ships without report-uri.');
            return;
          }
          writeFileSync(file, addCspReporting(readFileSync(file, 'utf8'), endpoint));
        },
      } satisfies Plugin;
    })(),
    // Upload sourcemaps to Sentry so production stack traces de-minify.
    // Only active when SENTRY_AUTH_TOKEN is present (CI release build), so
    // normal/local builds are unaffected. Must be the LAST plugin.
    mode === "production" && process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: { name: process.env.VITE_APP_VERSION || undefined },
      // We emit hidden sourcemaps via build.sourcemap below; delete them from
      // the deployed assets after upload so they aren't served publicly.
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // jsPDF dynamically imports canvg for addSvgAsImage(), which nothing here
      // calls. Rollup emitted it anyway - 50.3 KB gzipped with core-js inlined -
      // for a code path that never runs. See src/lib/canvg-web-stub.ts.
      canvg: path.resolve(__dirname, "./src/lib/canvg-web-stub.ts"),
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
      "@capacitor/haptics": path.resolve(
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
    // Emit hidden sourcemaps (no //# sourceMappingURL comment in the bundle)
    // when explicitly requested OR when a Sentry upload is configured, so the
    // release build can de-minify stack traces. The Sentry plugin deletes the
    // .map files after upload so they aren't served publicly from Cloudflare.
    sourcemap:
      process.env.VITE_SOURCEMAP === "true" || !!process.env.SENTRY_AUTH_TOKEN
        ? "hidden"
        : false,
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
        // Chunk rules and the reason the runtime helpers are pinned to
        // `framework` live in scripts/vite-chunking.ts (US-388).
        manualChunks: manualChunkFor,

        // Optimized file naming for better caching
        chunkFileNames: (chunkInfo) => {
          // Use manual chunk name when available (framework, ui-library, etc.)
          if (MANUAL_CHUNK_NAMES.includes(chunkInfo.name)) {
            return `assets/${chunkInfo.name}-[hash].js`;
          }
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
  };
});
