module.exports = {
  ci: {
    collect: {
      // Test against local build
      staticDistDir: './dist',
      // Number of runs to average
      numberOfRuns: 3,
      // URLs to test
      url: [
        'http://localhost/index.html',
      ],
      settings: {
        // Use mobile emulation
        preset: 'desktop',
        // Disable throttling for faster local testing
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },
      },
    },
    assert: {
      // Set performance budgets
      assertions: {
        // Performance
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.95 }],

        // Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'speed-index': ['error', { maxNumericValue: 3500 }],

        // Resource sizes
        'resource-summary:script:size': ['error', { maxNumericValue: 500000 }],
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 100000 }],
        'resource-summary:image:size': ['error', { maxNumericValue: 300000 }],
        'resource-summary:font:size': ['error', { maxNumericValue': 150000 }],

        // Additional metrics
        'interactive': ['error', { maxNumericValue: 3500 }],
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
