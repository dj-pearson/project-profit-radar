/**
 * Automated Testing Tool - Test Filter
 *
 * Provides test tagging, filtering, and selective execution capabilities.
 */

import type { TestConfig, TestType, TestResult } from '../types';
import { Logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export type TestTag =
  | 'a11y'           // Accessibility tests
  | 'perf'           // Performance tests
  | 'forms'          // Form tests
  | 'links'          // Link tests
  | 'buttons'        // Button tests
  | 'navigation'     // Navigation tests
  | 'auth'           // Authentication tests
  | 'visual'         // Visual regression tests
  | 'edge'           // Edge function tests
  | 'console'        // Console error tests
  | 'network'        // Network error tests
  | 'smoke'          // Smoke tests (critical paths)
  | 'regression'     // Regression tests
  | 'critical'       // Critical priority tests
  | 'fast'           // Fast-running tests
  | 'slow';          // Slow-running tests

export interface TestFilter {
  /** Tags to include (if specified, only tests with these tags run) */
  includeTags?: TestTag[];
  /** Tags to exclude (tests with these tags are skipped) */
  excludeTags?: TestTag[];
  /** Test types to include */
  includeTypes?: TestType[];
  /** Test types to exclude */
  excludeTypes?: TestType[];
  /** URL patterns to include */
  includeUrls?: string[];
  /** URL patterns to exclude */
  excludeUrls?: string[];
  /** Only run failed tests from previous run */
  onlyFailed?: boolean;
  /** Skip tests that passed in previous run */
  skipPassed?: boolean;
  /** Maximum test duration (skip slower tests) */
  maxDuration?: number;
  /** Test name pattern (regex) */
  namePattern?: string;
}

export interface TaggedTest {
  type: TestType;
  tags: TestTag[];
  name: string;
  url?: string;
}

// ============================================================================
// Tag Mappings
// ============================================================================

const TYPE_TO_TAGS: Record<TestType, TestTag[]> = {
  'page-load': ['smoke', 'critical', 'fast'],
  'navigation': ['navigation', 'smoke'],
  'form-submission': ['forms', 'critical'],
  'form-validation': ['forms'],
  'button-click': ['buttons'],
  'link-click': ['links', 'fast'],
  'element-visibility': ['fast'],
  'element-interaction': ['buttons'],
  'console-error': ['console', 'regression'],
  'network-error': ['network', 'regression'],
  'accessibility': ['a11y', 'slow'],
  'performance': ['perf', 'slow'],
  'edge-function': ['edge', 'critical'],
  'api-call': ['network', 'critical'],
  'authentication': ['auth', 'critical', 'smoke'],
  'custom': [],
};

const TAG_DESCRIPTIONS: Record<TestTag, string> = {
  'a11y': 'Accessibility tests (WCAG compliance)',
  'perf': 'Performance tests (Core Web Vitals)',
  'forms': 'Form interaction and validation tests',
  'links': 'Link validity tests',
  'buttons': 'Button interaction tests',
  'navigation': 'Navigation and routing tests',
  'auth': 'Authentication and authorization tests',
  'visual': 'Visual regression tests',
  'edge': 'Edge function/API tests',
  'console': 'Console error detection',
  'network': 'Network request tests',
  'smoke': 'Critical path smoke tests',
  'regression': 'Regression detection tests',
  'critical': 'High priority tests',
  'fast': 'Quick-running tests (<1s)',
  'slow': 'Slow-running tests (>3s)',
};

// ============================================================================
// Test Filter
// ============================================================================

export class TestFilterManager {
  private logger: Logger;
  private filter: TestFilter;
  private previousResults?: TestResult[];

  constructor(filter: TestFilter = {}, logger?: Logger) {
    this.filter = filter;
    this.logger = logger || new Logger({ context: 'TestFilter' });
  }

  /**
   * Set filter configuration
   */
  setFilter(filter: TestFilter): void {
    this.filter = { ...this.filter, ...filter };
  }

  /**
   * Set previous test results (for onlyFailed/skipPassed)
   */
  setPreviousResults(results: TestResult[]): void {
    this.previousResults = results;
  }

  /**
   * Check if a test type should run based on filters
   */
  shouldRunTestType(type: TestType): boolean {
    // Check type exclusions
    if (this.filter.excludeTypes?.includes(type)) {
      return false;
    }

    // Check type inclusions
    if (this.filter.includeTypes && this.filter.includeTypes.length > 0) {
      if (!this.filter.includeTypes.includes(type)) {
        return false;
      }
    }

    // Check tag filters
    const typeTags = TYPE_TO_TAGS[type] || [];

    // Exclude tags
    if (this.filter.excludeTags?.some((tag) => typeTags.includes(tag))) {
      return false;
    }

    // Include tags
    if (this.filter.includeTags && this.filter.includeTags.length > 0) {
      if (!this.filter.includeTags.some((tag) => typeTags.includes(tag))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a URL should be tested based on filters
   */
  shouldTestUrl(url: string): boolean {
    // Check URL exclusions
    if (this.filter.excludeUrls?.some((pattern) => this.matchesPattern(url, pattern))) {
      return false;
    }

    // Check URL inclusions
    if (this.filter.includeUrls && this.filter.includeUrls.length > 0) {
      if (!this.filter.includeUrls.some((pattern) => this.matchesPattern(url, pattern))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a specific test should run
   */
  shouldRunTest(test: TaggedTest): boolean {
    // Check test type
    if (!this.shouldRunTestType(test.type)) {
      return false;
    }

    // Check URL
    if (test.url && !this.shouldTestUrl(test.url)) {
      return false;
    }

    // Check name pattern
    if (this.filter.namePattern) {
      const regex = new RegExp(this.filter.namePattern, 'i');
      if (!regex.test(test.name)) {
        return false;
      }
    }

    // Check tag exclusions
    if (this.filter.excludeTags?.some((tag) => test.tags.includes(tag))) {
      return false;
    }

    // Check tag inclusions
    if (this.filter.includeTags && this.filter.includeTags.length > 0) {
      if (!this.filter.includeTags.some((tag) => test.tags.includes(tag))) {
        return false;
      }
    }

    // Check previous results
    if (this.previousResults && (this.filter.onlyFailed || this.filter.skipPassed)) {
      const previousResult = this.previousResults.find(
        (r) => r.type === test.type && r.name === test.name && r.url === test.url
      );

      if (previousResult) {
        if (this.filter.onlyFailed && previousResult.status !== 'failed') {
          return false;
        }
        if (this.filter.skipPassed && previousResult.status === 'passed') {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Filter test results after execution
   */
  filterResults(results: TestResult[]): TestResult[] {
    return results.filter((result) => {
      // Filter by duration
      if (this.filter.maxDuration && result.duration > this.filter.maxDuration) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get tags for a test type
   */
  getTagsForType(type: TestType): TestTag[] {
    return TYPE_TO_TAGS[type] || [];
  }

  /**
   * Get all available tags
   */
  static getAvailableTags(): { tag: TestTag; description: string }[] {
    return Object.entries(TAG_DESCRIPTIONS).map(([tag, description]) => ({
      tag: tag as TestTag,
      description,
    }));
  }

  /**
   * Parse tag string (e.g., "a11y,perf,!slow")
   */
  static parseTags(tagString: string): { include: TestTag[]; exclude: TestTag[] } {
    const include: TestTag[] = [];
    const exclude: TestTag[] = [];

    const tags = tagString.split(',').map((t) => t.trim()).filter(Boolean);

    for (const tag of tags) {
      if (tag.startsWith('!') || tag.startsWith('-')) {
        exclude.push(tag.slice(1) as TestTag);
      } else {
        include.push(tag as TestTag);
      }
    }

    return { include, exclude };
  }

  /**
   * Create filter from CLI arguments
   */
  static fromCliArgs(args: {
    tags?: string;
    types?: string;
    urls?: string;
    excludeUrls?: string;
    pattern?: string;
    onlyFailed?: boolean;
    skipPassed?: boolean;
  }): TestFilter {
    const filter: TestFilter = {};

    if (args.tags) {
      const { include, exclude } = this.parseTags(args.tags);
      filter.includeTags = include.length > 0 ? include : undefined;
      filter.excludeTags = exclude.length > 0 ? exclude : undefined;
    }

    if (args.types) {
      filter.includeTypes = args.types.split(',').map((t) => t.trim()) as TestType[];
    }

    if (args.urls) {
      filter.includeUrls = args.urls.split(',').map((u) => u.trim());
    }

    if (args.excludeUrls) {
      filter.excludeUrls = args.excludeUrls.split(',').map((u) => u.trim());
    }

    if (args.pattern) {
      filter.namePattern = args.pattern;
    }

    if (args.onlyFailed) {
      filter.onlyFailed = true;
    }

    if (args.skipPassed) {
      filter.skipPassed = true;
    }

    return filter;
  }

  /**
   * Match URL against pattern
   */
  private matchesPattern(url: string, pattern: string): boolean {
    try {
      const regex = new RegExp(pattern);
      return regex.test(url);
    } catch {
      return url.includes(pattern);
    }
  }

  /**
   * Get current filter summary
   */
  getSummary(): string {
    const parts: string[] = [];

    if (this.filter.includeTags?.length) {
      parts.push(`Include tags: ${this.filter.includeTags.join(', ')}`);
    }
    if (this.filter.excludeTags?.length) {
      parts.push(`Exclude tags: ${this.filter.excludeTags.join(', ')}`);
    }
    if (this.filter.includeTypes?.length) {
      parts.push(`Include types: ${this.filter.includeTypes.join(', ')}`);
    }
    if (this.filter.includeUrls?.length) {
      parts.push(`Include URLs: ${this.filter.includeUrls.join(', ')}`);
    }
    if (this.filter.onlyFailed) {
      parts.push('Only failed tests');
    }
    if (this.filter.skipPassed) {
      parts.push('Skip passed tests');
    }

    return parts.length > 0 ? parts.join(' | ') : 'No filters applied';
  }
}

// ============================================================================
// Export
// ============================================================================

export default TestFilterManager;
