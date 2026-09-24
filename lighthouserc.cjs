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
//   1. hard gates on every route (CLS, CSS/font/image bytes, categories);
//   2. per-route ratchets: LCP, TBT, JS transfer and total bytes at the
//      2026-09-24 measurement plus headroom, so a regression fails the PR today;
//   3. the US-257 targets (LCP < 2.5 s, TBT < 300 ms, performance 90) as
//      warnings, because every route is currently above them.
// When a route gets faster, lower its ratchet to the new measurement plus the
// same headroom. Never raise one to make a PR pass.

const HOST = '127.0.0.1';
const PORT = 4173;
const ORIGIN = `http://${HOST}:${PORT}`;

// Median of 3 runs: one noisy run (a 0.196 CLS on /features was seen once
// locally) neither fails nor rescues the check.
const aggregationMethod = 'median';

// Per-route ratchets. Measured = median of 3 local runs, 2026-09-24, after
// US-388 stopped the prerender from baking 227 modulepreloads into the HTML.
// TBT is per route since then: first paint now lands before the app's script
// work instead of after it, so that work is counted for the first time.
const ROUTES = [
  // LCP 6,378 ms (runs 6,019-7,098), JS 454,225 B, total 580,798 B, TBT 1,328 ms (373-1,460)
  { path: '/', pattern: `^${ORIGIN}/$`, lcp: 8000, js: 500000, total: 640000, tbt: 1600 },
  // LCP 5,873 ms, JS 419,980 B, total 536,445 B, TBT 539 ms (355-777)
  { path: '/pricing', pattern: `^${ORIGIN}/pricing$`, lcp: 7000, js: 465000, total: 590000, tbt: 900 },
  // LCP 5,771 ms, JS 400,174 B, total 512,798 B, TBT 384 ms (313-837)
  { path: '/features', pattern: `^${ORIGIN}/features$`, lcp: 7000, js: 445000, total: 565000, tbt: 900 },
  // LCP 6,006 ms (runs 2,977-6,030), JS 408,551 B, total 523,985 B, TBT 474 ms (458-641)
  { path: '/job-costing-software', pattern: `^${ORIGIN}/job-costing-software$`, lcp: 7000, js: 450000, total: 580000, tbt: 900 },
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
            // Measured 0.000-0.003 median on all four routes. Keep an eye on it:
            // with first paint early, a late font swap shows up here (0.2 before
            // index.html preloaded inter-600).
            'cumulative-layout-shift': ['error', opt({ maxNumericValue: 0.1 })],
            // TBT is a per-route ratchet below; the US-257 300 ms is a warning.
            // Floor under today's 0.46-0.65 so a collapse fails; target is below.
            'categories:performance': ['error', opt({ minScore: 0.4 })],
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
            'total-blocking-time': ['error', opt({ maxNumericValue: r.tbt })],
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
            'total-blocking-time': ['warn', opt({ maxNumericValue: 300 })],
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
