/**
 * Automated Testing Tool - Configuration
 *
 * Default configuration and configuration utilities for the testing framework.
 * Designed to be generic and easily customizable for different platforms.
 */

import type { TestConfig, ViewportConfig, SelectorConfig, ReporterConfig, ParallelConfig } from './types';

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_VIEWPORT: ViewportConfig = {
  width: 1280,
  height: 720,
  deviceScaleFactor: 1,
  isMobile: false,
};

export const MOBILE_VIEWPORT: ViewportConfig = {
  width: 375,
  height: 667,
  deviceScaleFactor: 2,
  isMobile: true,
};

export const TABLET_VIEWPORT: ViewportConfig = {
  width: 768,
  height: 1024,
  deviceScaleFactor: 2,
  isMobile: true,
};

export const DEFAULT_SELECTORS: SelectorConfig = {
  forms: [
    'form',
    '[role="form"]',
    '[data-testid*="form"]',
    '.form',
  ],
  buttons: [
    'button',
    '[role="button"]',
    'input[type="submit"]',
    'input[type="button"]',
    '[data-testid*="button"]',
    '.btn',
    'a.button',
  ],
  links: [
    'a[href]',
    '[role="link"]',
  ],
  inputs: [
    'input:not([type="hidden"])',
    'textarea',
    'select',
    '[contenteditable="true"]',
    '[role="textbox"]',
    '[role="combobox"]',
    '[role="listbox"]',
  ],
  interactive: [
    'button',
    'a[href]',
    'input',
    'select',
    'textarea',
    '[tabindex]:not([tabindex="-1"])',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="switch"]',
    '[role="slider"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[onclick]',
    '[data-clickable]',
  ],
  ignore: [
    '[aria-hidden="true"]',
    '[disabled]',
    '[style*="display: none"]',
    '[style*="visibility: hidden"]',
    '.hidden',
    '.invisible',
    '[data-test-ignore]',
  ],
};

export const DEFAULT_REPORTERS: ReporterConfig = {
  html: true,
  json: true,
  markdown: true,
  filenamePrefix: 'test-report',
  includeScreenshots: true,
  includePerformance: true,
  includeAccessibility: true,
};

export const DEFAULT_PARALLEL: ParallelConfig = {
  enabled: false,
  workers: 4,
};

export const DEFAULT_CONFIG: TestConfig = {
  baseUrl: 'http://localhost:8080',
  routesDir: './src/routes',
  edgeFunctionsDir: './supabase/functions',
  timeout: 30000,
  retries: 2,
  headless: true,
  browser: 'chromium',
  viewport: DEFAULT_VIEWPORT,
  auth: undefined,
  excludePatterns: [
    '/api/',
    '/static/',
    '/_next/',
    '/favicon',
    '.ico',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.css',
    '.js',
    '.map',
    '/logout',
    '/signout',
  ],
  includePatterns: [],
  screenshots: true,
  video: false,
  outputDir: './test-reports/automated',
  depth: 'medium',
  maxPages: 100,
  navigationDelay: 500,
  accessibilityTesting: true,
  performanceTesting: true,
  edgeFunctionTesting: true,
  consoleMonitoring: true,
  networkMonitoring: true,
  selectors: DEFAULT_SELECTORS,
  reporters: DEFAULT_REPORTERS,
  parallel: DEFAULT_PARALLEL,
};

// ============================================================================
// Configuration Presets
// ============================================================================

export const PRESETS = {
  /** Quick smoke test - fast, shallow coverage */
  smoke: {
    ...DEFAULT_CONFIG,
    depth: 'shallow' as const,
    maxPages: 20,
    accessibilityTesting: false,
    performanceTesting: false,
    edgeFunctionTesting: false,
    screenshots: false,
    timeout: 15000,
  },

  /** Standard test - balanced coverage */
  standard: {
    ...DEFAULT_CONFIG,
    depth: 'medium' as const,
    maxPages: 50,
  },

  /** Full test - comprehensive coverage */
  full: {
    ...DEFAULT_CONFIG,
    depth: 'deep' as const,
    maxPages: 0, // unlimited
    accessibilityTesting: true,
    performanceTesting: true,
    edgeFunctionTesting: true,
    screenshots: true,
    video: true,
  },

  /** Mobile test - mobile-focused */
  mobile: {
    ...DEFAULT_CONFIG,
    viewport: MOBILE_VIEWPORT,
    depth: 'medium' as const,
    maxPages: 50,
  },

  /** Accessibility audit - focus on a11y */
  accessibility: {
    ...DEFAULT_CONFIG,
    depth: 'shallow' as const,
    accessibilityTesting: true,
    performanceTesting: false,
    edgeFunctionTesting: false,
    maxPages: 0,
  },

  /** Performance audit - focus on performance */
  performance: {
    ...DEFAULT_CONFIG,
    depth: 'shallow' as const,
    accessibilityTesting: false,
    performanceTesting: true,
    edgeFunctionTesting: false,
    maxPages: 50,
  },

  /** Edge function test - API focused */
  api: {
    ...DEFAULT_CONFIG,
    depth: 'shallow' as const,
    maxPages: 5,
    accessibilityTesting: false,
    performanceTesting: false,
    edgeFunctionTesting: true,
    screenshots: false,
  },

  /** CI/CD - optimized for continuous integration */
  ci: {
    ...DEFAULT_CONFIG,
    headless: true,
    depth: 'medium' as const,
    maxPages: 30,
    screenshots: true,
    video: false,
    retries: 3,
    timeout: 60000,
    parallel: {
      enabled: true,
      workers: 4,
    },
  },
};

// ============================================================================
// Configuration Utilities
// ============================================================================

/**
 * Merges user configuration with defaults
 */
export function mergeConfig(userConfig: Partial<TestConfig>): TestConfig {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    viewport: {
      ...DEFAULT_VIEWPORT,
      ...userConfig.viewport,
    },
    selectors: {
      ...DEFAULT_SELECTORS,
      ...userConfig.selectors,
    },
    reporters: {
      ...DEFAULT_REPORTERS,
      ...userConfig.reporters,
    },
    parallel: {
      ...DEFAULT_PARALLEL,
      ...userConfig.parallel,
    },
  };
}

/**
 * Gets a configuration preset by name
 */
export function getPreset(presetName: keyof typeof PRESETS): TestConfig {
  return PRESETS[presetName] || DEFAULT_CONFIG;
}

/**
 * Validates configuration
 */
export function validateConfig(config: TestConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.baseUrl) {
    errors.push('baseUrl is required');
  } else {
    try {
      new URL(config.baseUrl);
    } catch {
      errors.push('baseUrl must be a valid URL');
    }
  }

  if (config.timeout <= 0) {
    errors.push('timeout must be positive');
  }

  if (config.retries < 0) {
    errors.push('retries cannot be negative');
  }

  if (config.maxPages < 0) {
    errors.push('maxPages cannot be negative');
  }

  if (config.navigationDelay < 0) {
    errors.push('navigationDelay cannot be negative');
  }

  if (config.viewport.width <= 0 || config.viewport.height <= 0) {
    errors.push('viewport dimensions must be positive');
  }

  if (config.parallel.enabled && config.parallel.workers <= 0) {
    errors.push('parallel workers must be positive when enabled');
  }

  if (!['chromium', 'firefox', 'webkit'].includes(config.browser)) {
    errors.push('browser must be one of: chromium, firefox, webkit');
  }

  if (!['shallow', 'medium', 'deep'].includes(config.depth)) {
    errors.push('depth must be one of: shallow, medium, deep');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Determines if a URL should be tested based on include/exclude patterns
 */
export function shouldTestUrl(url: string, config: TestConfig): boolean {
  const urlPath = new URL(url, config.baseUrl).pathname;

  // Check exclude patterns
  for (const pattern of config.excludePatterns) {
    if (urlPath.includes(pattern) || new RegExp(pattern).test(urlPath)) {
      return false;
    }
  }

  // Check include patterns (if specified, URL must match at least one)
  if (config.includePatterns.length > 0) {
    return config.includePatterns.some(
      (pattern) => urlPath.includes(pattern) || new RegExp(pattern).test(urlPath)
    );
  }

  return true;
}

/**
 * Gets the configuration for authentication
 */
export function getAuthConfig(config: TestConfig): Required<TestConfig>['auth'] | undefined {
  return config.auth;
}

/**
 * Creates a platform-specific configuration
 */
export function createPlatformConfig(
  platform: 'builddesk' | 'generic',
  overrides: Partial<TestConfig> = {}
): TestConfig {
  const platformConfigs: Record<string, Partial<TestConfig>> = {
    builddesk: {
      baseUrl: 'http://localhost:8080',
      routesDir: './src/routes',
      edgeFunctionsDir: './supabase/functions',
      auth: {
        loginUrl: '/auth',
        usernameSelector: 'input[name="email"], input[type="email"]',
        passwordSelector: 'input[name="password"], input[type="password"]',
        submitSelector: 'button[type="submit"]',
        credentials: {
          username: process.env.TEST_USER_EMAIL || 'test@example.com',
          password: process.env.TEST_USER_PASSWORD || 'testpassword',
        },
        successUrl: '/dashboard',
      },
      excludePatterns: [
        ...DEFAULT_CONFIG.excludePatterns,
        '/auth/callback',
        '/stripe/',
        '/api/webhooks',
      ],
    },
    generic: DEFAULT_CONFIG,
  };

  return mergeConfig({
    ...platformConfigs[platform],
    ...overrides,
  });
}

// ============================================================================
// Error Patterns Configuration
// ============================================================================

/**
 * Console error patterns to ignore (non-critical)
 */
export const IGNORED_CONSOLE_ERRORS = [
  'ResizeObserver loop',
  'chrome-extension://',
  'moz-extension://',
  'Extension context invalidated',
  'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT',
  'favicon.ico',
  'Download the React DevTools',
  'Warning: ReactDOM.render',
  'Warning: componentWillMount',
  'Warning: componentWillReceiveProps',
  'Warning: componentWillUpdate',
];

/**
 * Network request patterns to ignore
 */
export const IGNORED_NETWORK_PATTERNS = [
  /analytics/i,
  /tracking/i,
  /telemetry/i,
  /sentry/i,
  /posthog/i,
  /google-analytics/i,
  /gtag/i,
  /facebook/i,
  /twitter/i,
  /linkedin/i,
];

/**
 * Checks if a console error should be ignored
 */
export function shouldIgnoreConsoleError(message: string): boolean {
  return IGNORED_CONSOLE_ERRORS.some((pattern) =>
    message.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Checks if a network request should be ignored
 */
export function shouldIgnoreNetworkRequest(url: string): boolean {
  return IGNORED_NETWORK_PATTERNS.some((pattern) => pattern.test(url));
}

// ============================================================================
// Export
// ============================================================================

export type { TestConfig };
