module.exports = {
  ci: {
    collect: {
      // Test against local build
      staticDistDir: './dist',
      // Number of runs to average
      numberOfRuns: 3,
      // Served by LHCI's static server; the SPA fallback returns index.html
      // for /pricing the way Cloudflare Pages' 404.html copy does.
      isSinglePageApplication: true,
      url: [
        'http://localhost/',
        'http://localhost/pricing',
      ],
      // US-388: no `preset` and no `throttling` override means Lighthouse's
      // default mobile form factor with simulated slow-4G / 4x CPU throttling,
      // the same conditions as the brikly.net_2026-01-01 report (perf 26,
      // LCP 13.9 s). The old desktop preset with throttling disabled could
      // not see the mobile numbers at all.
    },
    assert: {
      // Set performance budgets
      assertions: {
        // Performance. On mobile throttling these start as warnings; only
        // LCP is a hard gate (US-388 starting ratchet: <= 4 s on / and
        // /pricing). Tighten toward 2.5 s as the landing page gets lighter.
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.95 }],

        // Core Web Vitals
        'largest-contentful-paint': ['error', { maxNumericValue: 4000 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'speed-index': ['warn', { maxNumericValue: 3500 }],

        // Resource sizes
        'resource-summary:script:size': ['error', { maxNumericValue: 500000 }],
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 100000 }],
        'resource-summary:image:size': ['error', { maxNumericValue: 300000 }],
        'resource-summary:font:size': ['error', { maxNumericValue: 150000 }],

        // Additional metrics
        'interactive': ['warn', { maxNumericValue: 3500 }],
        'uses-responsive-images': 'warn',
        'uses-optimized-images': 'warn',
        'modern-image-formats': 'warn',
        'uses-text-compression': 'error',
        'uses-rel-preconnect': 'warn',
        'uses-http2': 'warn',
        'efficient-animated-content': 'warn',
        'duplicated-javascript': 'warn',
        'legacy-javascript': 'warn',
        'mainthread-work-breakdown': ['warn', { maxNumericValue: 4000 }],
        'bootup-time': ['warn', { maxNumericValue: 3500 }],
        'uses-long-cache-ttl': 'warn',
        'total-byte-weight': ['error', { maxNumericValue: 1500000 }],
        'unused-css-rules': 'warn',
        'unused-javascript': 'warn',
        'unminified-css': 'error',
        'unminified-javascript': 'error',
      },
    },
    upload: {
      // Upload results to temporary public storage
      target: 'temporary-public-storage',
    },
  },
};
