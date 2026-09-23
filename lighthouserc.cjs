// Lighthouse CI budget for the public marketing routes (US-257, US-388).
//
// What runs: the production build (prerendered, see docs/SEO_PRERENDER.md)
// served by `vite preview`, which answers /pricing with dist/pricing.html the
// way Cloudflare Pages does. LHCI's own staticDistDir server can't be used any
// more: its SPA fallback would hand every route the prerendered home page.
//
// Conditions: no `preset` and no `throttling` override, so this is Lighthouse's
// default mobile form factor with simulated slow-4G and 4x CPU slowdown (the
// same conditions as the brikly.net_2026-01-01 report).
//
// Three kinds of assertion, see docs/LIGHTHOUSE_BUDGET.md for the numbers:
//   1. hard gates on every route (CLS, TBT, CSS/font/image bytes, categories);
//   2. per-route ratchets: LCP, JS transfer and total bytes at the 2026-09-23
//      measurement plus headroom, so a regression fails the PR today;
//   3. the US-257 targets (LCP < 2.5 s, performance 90) as warnings, because
//      every route is currently far above them.
// When a route gets faster, lower its ratchet to the new measurement plus the
// same headroom. Never raise one to make a PR pass.

const HOST = '127.0.0.1';
const PORT = 4173;
const ORIGIN = `http://${HOST}:${PORT}`;

// Median of 3 runs: one noisy run (a 0.196 CLS on /features was seen once
// locally) neither fails nor rescues the check.
const aggregationMethod = 'median';

// Per-route ratchets. Measured = median of 3 local runs, 2026-09-23.
const ROUTES = [
  // path, url pattern, LCP cap (measured 13,700 ms), JS cap (measured 1,294,276 B), total cap (1,408,353 B)
  { path: '/', pattern: `^${ORIGIN}/$`, lcp: 16000, js: 1400000, total: 1550000 },
  // measured LCP 11,920 ms, JS 1,002,229 B, total 1,105,984 B
  { path: '/pricing', pattern: `^${ORIGIN}/pricing$`, lcp: 14000, js: 1100000, total: 1250000 },
  // measured LCP 11,803 ms, JS 994,406 B, total 1,093,901 B
  { path: '/features', pattern: `^${ORIGIN}/features$`, lcp: 14000, js: 1100000, total: 1250000 },
  // measured LCP 8,104 ms, JS 627,534 B, total 728,922 B
  { path: '/job-costing-software', pattern: `^${ORIGIN}/job-costing-software$`, lcp: 9500, js: 700000, total: 850000 },
];

const opt = (extra) => ({ aggregationMethod, ...extra });

module.exports = {
  ci: {
    collect: {
      startServerCommand: `npx vite preview --host ${HOST} --port ${PORT} --strictPort`,
      startServerReadyPattern: 'Local',
      startServerReadyTimeout: 60000,
      url: ROUTES.map((r) => `${ORIGIN}${r.path}`),
      numberOfRuns: 3,
      settings: {
        // Root in CI containers and the sandbox here; harmless elsewhere.
        chromeFlags: '--no-sandbox --headless=new',
      },
    },
    assert: {
      assertMatrix: [
        // 1. Hard gates, every route.
        {
          matchingUrlPattern: '.*',
          aggregationMethod,
          assertions: {
            // Measured 0.000-0.003 median on all four routes.
            'cumulative-layout-shift': ['error', opt({ maxNumericValue: 0.1 })],
            // US-257 AC. Measured median 0-156 ms (job-costing-software is the high one).
            'total-blocking-time': ['error', opt({ maxNumericValue: 300 })],
            // Floor under today's 52-59 so a collapse fails; target is below.
            'categories:performance': ['error', opt({ minScore: 0.5 })],
            'categories:accessibility': ['error', opt({ minScore: 0.95 })],
            'categories:best-practices': ['error', opt({ minScore: 0.9 })],
            'categories:seo': ['error', opt({ minScore: 0.95 })],

            // Measured: CSS 32,068 B, fonts 35,132 B, images 9,102 B on every route.
            'resource-summary:stylesheet:size': ['error', opt({ maxNumericValue: 40000 })],
            'resource-summary:font:size': ['error', opt({ maxNumericValue: 50000 })],
            'resource-summary:image:size': ['error', opt({ maxNumericValue: 100000 })],

            'uses-text-compression': 'error',
            'unminified-css': 'error',
            'unminified-javascript': 'error',
          },
        },

        // 2. Per-route ratchets.
        ...ROUTES.map((r) => ({
          matchingUrlPattern: r.pattern,
          aggregationMethod,
          assertions: {
            'largest-contentful-paint': ['error', opt({ maxNumericValue: r.lcp })],
            'resource-summary:script:size': ['error', opt({ maxNumericValue: r.js })],
            'total-byte-weight': ['error', opt({ maxNumericValue: r.total })],
          },
        })),

        // 3. US-257 / CORE-WEB-VITALS targets. Warnings until the routes get there.
        {
          matchingUrlPattern: '.*',
          aggregationMethod,
          assertions: {
            'categories:performance': ['warn', opt({ minScore: 0.9 })],
            'largest-contentful-paint': ['warn', opt({ maxNumericValue: 2500 })],
            'first-contentful-paint': ['warn', opt({ maxNumericValue: 1800 })],
            'speed-index': ['warn', opt({ maxNumericValue: 3400 })],
            'interactive': ['warn', opt({ maxNumericValue: 3800 })],
            'resource-summary:script:size': ['warn', opt({ maxNumericValue: 300000 })],
            'unused-javascript': 'warn',
            'duplicated-javascript': 'warn',
            'legacy-javascript': 'warn',
            'mainthread-work-breakdown': ['warn', opt({ maxNumericValue: 4000 })],
            'bootup-time': ['warn', opt({ maxNumericValue: 3500 })],
            'unused-css-rules': 'warn',
            'uses-responsive-images': 'warn',
            'uses-optimized-images': 'warn',
            'modern-image-formats': 'warn',
            'efficient-animated-content': 'warn',
            'uses-rel-preconnect': 'warn',
            // uses-http2 and uses-long-cache-ttl are left out on purpose: they
            // measure `vite preview`, not Cloudflare Pages, and would always warn.
          },
        },
      ],
    },
    upload: {
      // Report links are printed in the job log (public, short-lived storage).
      target: 'temporary-public-storage',
    },
  },
};
