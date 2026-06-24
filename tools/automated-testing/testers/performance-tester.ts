/**
 * Automated Testing Tool - Performance Tester
 *
 * Measures Core Web Vitals and other performance metrics.
 */

import type { Page } from 'playwright';
import type { TestConfig, TestResult, PerformanceResult } from '../types';
import { Logger } from '../utils/logger';
import { generateId } from '../utils/helpers';

// ============================================================================
// Performance Thresholds (based on Google's recommendations)
// ============================================================================

const THRESHOLDS = {
  lcp: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint
  fid: { good: 100, needsImprovement: 300 }, // First Input Delay
  cls: { good: 0.1, needsImprovement: 0.25 }, // Cumulative Layout Shift
  fcp: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint
  ttfb: { good: 800, needsImprovement: 1800 }, // Time to First Byte
  tti: { good: 3800, needsImprovement: 7300 }, // Time to Interactive
  domContentLoaded: { good: 2000, needsImprovement: 4000 },
  loadComplete: { good: 3000, needsImprovement: 6000 },
};

// ============================================================================
// Performance Tester
// ============================================================================

export class PerformanceTester {
  private logger: Logger;
  private config: TestConfig;

  constructor(config: TestConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || new Logger({ context: 'PerformanceTester' });
  }

  /**
   * Measure performance metrics for a page
   */
  async measurePerformance(page: Page, pageUrl: string): Promise<PerformanceResult> {
    this.logger.debug(`Measuring performance for: ${pageUrl}`);

    // Get navigation timing
    const navigationTiming = await this.getNavigationTiming(page);

    // Get Core Web Vitals
    const webVitals = await this.getWebVitals(page);

    // Get resource metrics
    const resources = await this.getResourceMetrics(page);

    // Get memory usage (if available)
    const memory = await this.getMemoryUsage(page);

    return {
      url: pageUrl,
      webVitals,
      navigation: navigationTiming,
      resources,
      memory,
      timestamp: new Date(),
    };
  }

  /**
   * Get navigation timing metrics
   */
  private async getNavigationTiming(page: Page): Promise<PerformanceResult['navigation']> {
    const timing = await page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;

      if (!navigation) {
        return {
          domContentLoaded: 0,
          loadComplete: 0,
          domInteractive: 0,
        };
      }

      return {
        domContentLoaded: Math.round(
          navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
        ),
        loadComplete: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
        domInteractive: Math.round(navigation.domInteractive - navigation.fetchStart),
      };
    });

    return timing;
  }

  /**
   * Get Core Web Vitals metrics
   */
  private async getWebVitals(page: Page): Promise<PerformanceResult['webVitals']> {
    const vitals = await page.evaluate(() => {
      return new Promise<{
        lcp?: number;
        fid?: number;
        cls?: number;
        fcp?: number;
        ttfb?: number;
        tti?: number;
      }>((resolve) => {
        const metrics: {
          lcp?: number;
          fid?: number;
          cls?: number;
          fcp?: number;
          ttfb?: number;
          tti?: number;
        } = {};

        // Get TTFB
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        if (navigation) {
          metrics.ttfb = Math.round(navigation.responseStart - navigation.requestStart);
        }

        // Get FCP
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          metrics.fcp = Math.round(fcpEntry.startTime);
        }

        // Try to get LCP using PerformanceObserver
        let clsValue = 0;

        try {
          // LCP Observer
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              metrics.lcp = Math.round(lastEntry.startTime);
            }
          });
          lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

          // CLS Observer
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
            metrics.cls = Math.round(clsValue * 1000) / 1000;
          });
          clsObserver.observe({ type: 'layout-shift', buffered: true });
        } catch {
          // PerformanceObserver not available
        }

        // Estimate TTI based on navigation timing
        if (navigation) {
          metrics.tti = Math.round(navigation.domInteractive - navigation.fetchStart);
        }

        // Give observers time to collect data
        setTimeout(() => resolve(metrics), 500);
      });
    });

    return vitals;
  }

  /**
   * Get resource loading metrics
   */
  private async getResourceMetrics(page: Page): Promise<PerformanceResult['resources']> {
    const resources = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      let totalSize = 0;
      const byType: Record<string, { count: number; size: number }> = {};

      for (const entry of entries) {
        const size = entry.transferSize || entry.encodedBodySize || 0;
        totalSize += size;

        const type = entry.initiatorType || 'other';
        if (!byType[type]) {
          byType[type] = { count: 0, size: 0 };
        }
        byType[type].count++;
        byType[type].size += size;
      }

      return {
        totalSize,
        totalCount: entries.length,
        byType,
      };
    });

    return resources;
  }

  /**
   * Get memory usage (Chrome only)
   */
  private async getMemoryUsage(page: Page): Promise<PerformanceResult['memory']> {
    try {
      const memory = await page.evaluate(() => {
        const perf = performance as any;
        if (perf.memory) {
          return {
            usedJSHeapSize: perf.memory.usedJSHeapSize,
            totalJSHeapSize: perf.memory.totalJSHeapSize,
          };
        }
        return undefined;
      });
      return memory;
    } catch {
      return undefined;
    }
  }

  /**
   * Generate test results from performance metrics
   */
  generateTestResults(result: PerformanceResult): TestResult[] {
    const tests: TestResult[] = [];

    // LCP test
    if (result.webVitals.lcp !== undefined) {
      tests.push(
        this.createMetricTestResult(
          'LCP (Largest Contentful Paint)',
          result.webVitals.lcp,
          THRESHOLDS.lcp,
          result.url,
          'ms'
        )
      );
    }

    // FCP test
    if (result.webVitals.fcp !== undefined) {
      tests.push(
        this.createMetricTestResult(
          'FCP (First Contentful Paint)',
          result.webVitals.fcp,
          THRESHOLDS.fcp,
          result.url,
          'ms'
        )
      );
    }

    // CLS test
    if (result.webVitals.cls !== undefined) {
      tests.push(
        this.createMetricTestResult('CLS (Cumulative Layout Shift)', result.webVitals.cls, THRESHOLDS.cls, result.url)
      );
    }

    // TTFB test
    if (result.webVitals.ttfb !== undefined) {
      tests.push(
        this.createMetricTestResult(
          'TTFB (Time to First Byte)',
          result.webVitals.ttfb,
          THRESHOLDS.ttfb,
          result.url,
          'ms'
        )
      );
    }

    // TTI test
    if (result.webVitals.tti !== undefined) {
      tests.push(
        this.createMetricTestResult(
          'TTI (Time to Interactive)',
          result.webVitals.tti,
          THRESHOLDS.tti,
          result.url,
          'ms'
        )
      );
    }

    // DOM Content Loaded test
    tests.push(
      this.createMetricTestResult(
        'DOM Content Loaded',
        result.navigation.domContentLoaded,
        THRESHOLDS.domContentLoaded,
        result.url,
        'ms'
      )
    );

    // Page Load Complete test
    tests.push(
      this.createMetricTestResult(
        'Page Load Complete',
        result.navigation.loadComplete,
        THRESHOLDS.loadComplete,
        result.url,
        'ms'
      )
    );

    return tests;
  }

  /**
   * Create a test result for a metric
   */
  private createMetricTestResult(
    name: string,
    value: number,
    thresholds: { good: number; needsImprovement: number },
    url: string,
    unit?: string
  ): TestResult {
    const status = value <= thresholds.good ? 'passed' : value <= thresholds.needsImprovement ? 'warning' : 'failed';

    return {
      id: generateId(),
      type: 'performance',
      name: `Performance: ${name}`,
      status,
      url,
      duration: 0,
      timestamp: new Date(),
      retryCount: 0,
      data: {
        metric: name,
        value,
        unit,
        thresholds,
        rating: status === 'passed' ? 'good' : status === 'warning' ? 'needs-improvement' : 'poor',
      },
    };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(results: PerformanceResult[]): {
    avgLcp: number;
    avgFcp: number;
    avgCls: number;
    avgTtfb: number;
    avgLoadTime: number;
    totalResourceSize: number;
    pagesAboveThreshold: number;
  } {
    const lcpValues = results.filter((r) => r.webVitals.lcp).map((r) => r.webVitals.lcp!);
    const fcpValues = results.filter((r) => r.webVitals.fcp).map((r) => r.webVitals.fcp!);
    const clsValues = results.filter((r) => r.webVitals.cls).map((r) => r.webVitals.cls!);
    const ttfbValues = results.filter((r) => r.webVitals.ttfb).map((r) => r.webVitals.ttfb!);
    const loadTimes = results.map((r) => r.navigation.loadComplete);
    const resourceSizes = results.map((r) => r.resources.totalSize);

    const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

    const pagesAboveThreshold = results.filter((r) => {
      const lcp = r.webVitals.lcp || 0;
      const fcp = r.webVitals.fcp || 0;
      return lcp > THRESHOLDS.lcp.needsImprovement || fcp > THRESHOLDS.fcp.needsImprovement;
    }).length;

    return {
      avgLcp: Math.round(avg(lcpValues)),
      avgFcp: Math.round(avg(fcpValues)),
      avgCls: Math.round(avg(clsValues) * 1000) / 1000,
      avgTtfb: Math.round(avg(ttfbValues)),
      avgLoadTime: Math.round(avg(loadTimes)),
      totalResourceSize: resourceSizes.reduce((a, b) => a + b, 0),
      pagesAboveThreshold,
    };
  }
}

// ============================================================================
// Export
// ============================================================================

export default PerformanceTester;
