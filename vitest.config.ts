import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Use happy-dom for faster tests (or jsdom for more complete browser API)
    environment: 'happy-dom',

    // Global test APIs (describe, it, expect)
    globals: true,

    // Setup files
    setupFiles: ['./src/test/setup.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      // Measure every source file, not only the ones a test happens to import.
      // Without `include`, vitest 4 reports on loaded files only, and the
      // percentage describes the tested corner of the tree rather than src/.
      include: ['src/**/*.{ts,tsx}'],
      // text-summary rather than text: the per-file table is ~1,400 rows and
      // buries the four numbers the CI log needs. Open coverage/index.html
      // for the per-file view.
      reporter: ['text-summary', 'json', 'json-summary', 'html', 'lcov'],
      // Print the summary even when a test fails, so a red run still shows
      // where coverage stood.
      reportOnFailure: true,
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/__tests__',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        'dist/',
        '.github/',
        'public/',
      ],
      // US-215: a ratchet, not a target. These are the measured values over
      // all of src/ on 2026-09-23 (statements 22.26%, branches 18.83%,
      // functions 18.32%, lines 22.80%; 287 test files), floored to the
      // whole percent. Not one decimal: a second run the same day, with other
      // work landing, read 22.19/18.76/18.15/22.74 and failed a one-decimal
      // gate on noise. A whole point is ~550 lines of slack, not a loophole.
      // `npm run test:coverage` fails below them, and CI runs it in the Unit
      // Tests job. The old 60% was never enforced and the tree was a
      // third of the way there. Raise these when coverage rises; never lower
      // them to get a PR through. 60% stays the goal (CLAUDE.md, Known Gaps).
      thresholds: {
        statements: 22,
        branches: 18,
        functions: 18,
        lines: 22,
      },
    },

    // Include test files
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/**/__tests__/**/*.{ts,tsx}',
      // Dependency-free edge-function shared logic (e.g. workflow-auth) that is
      // safe to run under node/vitest — must NOT import Deno globals or URLs.
      'supabase/functions/_shared/**/*.{test,spec}.ts',
    ],

    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
    ],

    // Test timeout
    testTimeout: 10000,

    // Reporter
    reporters: ['verbose'],

    // Watch mode
    watch: false,

    // Benchmark
    benchmark: {
      include: ['**/*.{bench,benchmark}.{ts,tsx}'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
