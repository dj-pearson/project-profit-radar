/**
 * Automated Testing Tool - Metrics Storage
 *
 * Stores historical test metrics for trend analysis, performance
 * tracking, and regression detection over time.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { TestResult, PerformanceMetrics, PageTestReport } from '../types';
import { Logger } from '../utils/logger';
import { generateId } from '../utils/helpers';

// ============================================================================
// Types
// ============================================================================

export interface TestRun {
  /** Run ID */
  id: string;
  /** Timestamp */
  timestamp: Date;
  /** Git commit hash */
  commitHash?: string;
  /** Git branch */
  branch?: string;
  /** Environment */
  environment: string;
  /** Duration (ms) */
  duration: number;
  /** Summary */
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
  };
  /** Performance metrics (averages) */
  performance?: {
    avgLoadTime: number;
    avgLCP: number;
    avgFCP: number;
    avgCLS: number;
    avgTTFB: number;
  };
  /** Coverage (if available) */
  coverage?: {
    pages: number;
    routes: number;
    forms: number;
    buttons: number;
  };
  /** Tags */
  tags?: string[];
}

export interface MetricPoint {
  timestamp: Date;
  value: number;
}

export interface MetricSeries {
  name: string;
  points: MetricPoint[];
}

export interface TrendAnalysis {
  metric: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'improving' | 'stable' | 'degrading';
  stdDev: number;
  isAnomaly: boolean;
}

export interface StorageConfig {
  /** Storage directory */
  storageDir: string;
  /** Maximum runs to keep */
  maxRuns: number;
  /** Retention days */
  retentionDays: number;
  /** Enable compression */
  compress: boolean;
}

// ============================================================================
// Metrics Storage
// ============================================================================

export class MetricsStorage {
  private logger: Logger;
  private config: StorageConfig;
  private runsDir: string;
  private indexPath: string;
  private runIndex: Map<string, TestRun> = new Map();

  constructor(config: Partial<StorageConfig> = {}, logger?: Logger) {
    this.logger = logger || new Logger({ context: 'MetricsStorage' });
    this.config = {
      storageDir: config.storageDir || './test-results/metrics',
      maxRuns: config.maxRuns ?? 100,
      retentionDays: config.retentionDays ?? 30,
      compress: config.compress ?? false,
    };

    this.runsDir = path.join(this.config.storageDir, 'runs');
    this.indexPath = path.join(this.config.storageDir, 'index.json');

    this.ensureDirectories();
    this.loadIndex();
  }

  /**
   * Ensure directories exist
   */
  private ensureDirectories(): void {
    [this.config.storageDir, this.runsDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Load run index
   */
  private loadIndex(): void {
    if (fs.existsSync(this.indexPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.indexPath, 'utf-8'));
        for (const run of data.runs || []) {
          this.runIndex.set(run.id, {
            ...run,
            timestamp: new Date(run.timestamp),
          });
        }
        this.logger.debug(`Loaded ${this.runIndex.size} test runs from index`);
      } catch (error) {
        this.logger.warn(`Failed to load index: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Save run index
   */
  private saveIndex(): void {
    const data = {
      version: '1.0',
      updatedAt: new Date().toISOString(),
      runs: Array.from(this.runIndex.values()).sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      ),
    };
    fs.writeFileSync(this.indexPath, JSON.stringify(data, null, 2));
  }

  /**
   * Store a test run
   */
  storeRun(reports: PageTestReport[], metadata: {
    duration: number;
    environment?: string;
    commitHash?: string;
    branch?: string;
    tags?: string[];
  }): TestRun {
    const id = generateId();
    const timestamp = new Date();

    // Calculate summary
    let totalTests = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let flaky = 0;

    // Calculate performance averages
    let loadTimes: number[] = [];
    let lcpValues: number[] = [];
    let fcpValues: number[] = [];
    let clsValues: number[] = [];
    let ttfbValues: number[] = [];

    // Coverage tracking
    let totalPages = 0;
    let totalForms = 0;
    let totalButtons = 0;

    for (const report of reports) {
      totalPages++;

      for (const test of report.tests) {
        totalTests++;
        if (test.status === 'passed') passed++;
        else if (test.status === 'failed') failed++;
        else if (test.status === 'skipped') skipped++;
        if (test.retryCount > 0) flaky++;
      }

      // Collect performance data
      if (report.loadTime) {
        loadTimes.push(report.loadTime);
      }

      // Check for performance test results
      for (const test of report.tests) {
        if (test.type === 'performance' && test.data) {
          const metrics = test.data as PerformanceMetrics;
          if (metrics.lcp) lcpValues.push(metrics.lcp);
          if (metrics.fcp) fcpValues.push(metrics.fcp);
          if (metrics.cls) clsValues.push(metrics.cls);
          if (metrics.ttfb) ttfbValues.push(metrics.ttfb);
        }

        // Count forms and buttons tested
        if (test.type === 'form-submission' || test.type === 'form-validation') {
          totalForms++;
        }
        if (test.type === 'button-click') {
          totalButtons++;
        }
      }
    }

    // Calculate averages
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const run: TestRun = {
      id,
      timestamp,
      commitHash: metadata.commitHash,
      branch: metadata.branch,
      environment: metadata.environment || 'unknown',
      duration: metadata.duration,
      summary: {
        totalTests,
        passed,
        failed,
        skipped,
        flaky,
      },
      performance: {
        avgLoadTime: Math.round(avg(loadTimes)),
        avgLCP: Math.round(avg(lcpValues)),
        avgFCP: Math.round(avg(fcpValues)),
        avgCLS: Number(avg(clsValues).toFixed(3)),
        avgTTFB: Math.round(avg(ttfbValues)),
      },
      coverage: {
        pages: totalPages,
        routes: totalPages,
        forms: totalForms,
        buttons: totalButtons,
      },
      tags: metadata.tags,
    };

    // Store run data
    this.runIndex.set(id, run);
    this.saveRunData(id, reports);
    this.saveIndex();

    // Cleanup old runs
    this.cleanup();

    this.logger.info(`Stored test run: ${id}`);
    return run;
  }

  /**
   * Save full run data to file
   */
  private saveRunData(id: string, reports: PageTestReport[]): void {
    const filePath = path.join(this.runsDir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(reports, null, 2));
  }

  /**
   * Load run data
   */
  loadRunData(id: string): PageTestReport[] | undefined {
    const filePath = path.join(this.runsDir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    return undefined;
  }

  /**
   * Get a run by ID
   */
  getRun(id: string): TestRun | undefined {
    return this.runIndex.get(id);
  }

  /**
   * Get all runs
   */
  getAllRuns(): TestRun[] {
    return Array.from(this.runIndex.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Get runs for a time period
   */
  getRunsInRange(startDate: Date, endDate: Date): TestRun[] {
    return this.getAllRuns().filter(
      (run) => run.timestamp >= startDate && run.timestamp <= endDate
    );
  }

  /**
   * Get last N runs
   */
  getLastRuns(count: number): TestRun[] {
    return this.getAllRuns().slice(0, count);
  }

  /**
   * Get metric series for trending
   */
  getMetricSeries(
    metricPath: string,
    lastN: number = 20
  ): MetricSeries {
    const runs = this.getLastRuns(lastN).reverse();
    const points: MetricPoint[] = [];

    for (const run of runs) {
      let value: number | undefined;

      // Parse metric path (e.g., "summary.passed", "performance.avgLCP")
      const parts = metricPath.split('.');
      let obj: unknown = run;

      for (const part of parts) {
        if (obj && typeof obj === 'object' && part in obj) {
          obj = (obj as Record<string, unknown>)[part];
        } else {
          obj = undefined;
          break;
        }
      }

      if (typeof obj === 'number') {
        value = obj;
      }

      if (value !== undefined) {
        points.push({
          timestamp: run.timestamp,
          value,
        });
      }
    }

    return { name: metricPath, points };
  }

  /**
   * Analyze trends for a metric
   */
  analyzeTrend(metricPath: string, lastN: number = 10): TrendAnalysis | undefined {
    const series = this.getMetricSeries(metricPath, lastN);

    if (series.points.length < 2) {
      return undefined;
    }

    const values = series.points.map((p) => p.value);
    const current = values[values.length - 1];
    const previous = values[values.length - 2];
    const change = current - previous;
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0;

    // Calculate standard deviation
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);

    // Determine trend
    let trend: 'improving' | 'stable' | 'degrading';

    // For metrics where lower is better (LCP, FCP, load time)
    const lowerIsBetter = metricPath.includes('LCP') ||
      metricPath.includes('FCP') ||
      metricPath.includes('TTFB') ||
      metricPath.includes('LoadTime') ||
      metricPath.includes('failed');

    if (Math.abs(changePercent) < 5) {
      trend = 'stable';
    } else if (lowerIsBetter) {
      trend = change < 0 ? 'improving' : 'degrading';
    } else {
      trend = change > 0 ? 'improving' : 'degrading';
    }

    // Detect anomaly (more than 2 standard deviations from mean)
    const isAnomaly = Math.abs(current - mean) > 2 * stdDev;

    return {
      metric: metricPath,
      current,
      previous,
      change,
      changePercent: Number(changePercent.toFixed(2)),
      trend,
      stdDev: Number(stdDev.toFixed(2)),
      isAnomaly,
    };
  }

  /**
   * Get comprehensive trend report
   */
  getTrendReport(): {
    passRate: TrendAnalysis | undefined;
    failRate: TrendAnalysis | undefined;
    avgLoadTime: TrendAnalysis | undefined;
    avgLCP: TrendAnalysis | undefined;
    avgFCP: TrendAnalysis | undefined;
    avgCLS: TrendAnalysis | undefined;
    coverage: TrendAnalysis | undefined;
  } {
    return {
      passRate: this.analyzeTrend('summary.passed'),
      failRate: this.analyzeTrend('summary.failed'),
      avgLoadTime: this.analyzeTrend('performance.avgLoadTime'),
      avgLCP: this.analyzeTrend('performance.avgLCP'),
      avgFCP: this.analyzeTrend('performance.avgFCP'),
      avgCLS: this.analyzeTrend('performance.avgCLS'),
      coverage: this.analyzeTrend('coverage.pages'),
    };
  }

  /**
   * Compare two runs
   */
  compareRuns(runId1: string, runId2: string): {
    run1: TestRun;
    run2: TestRun;
    differences: Record<string, { before: number; after: number; change: number }>;
  } | undefined {
    const run1 = this.getRun(runId1);
    const run2 = this.getRun(runId2);

    if (!run1 || !run2) {
      return undefined;
    }

    const differences: Record<string, { before: number; after: number; change: number }> = {};

    // Compare summary
    differences['tests.passed'] = {
      before: run1.summary.passed,
      after: run2.summary.passed,
      change: run2.summary.passed - run1.summary.passed,
    };
    differences['tests.failed'] = {
      before: run1.summary.failed,
      after: run2.summary.failed,
      change: run2.summary.failed - run1.summary.failed,
    };

    // Compare performance
    if (run1.performance && run2.performance) {
      differences['performance.avgLoadTime'] = {
        before: run1.performance.avgLoadTime,
        after: run2.performance.avgLoadTime,
        change: run2.performance.avgLoadTime - run1.performance.avgLoadTime,
      };
      differences['performance.avgLCP'] = {
        before: run1.performance.avgLCP,
        after: run2.performance.avgLCP,
        change: run2.performance.avgLCP - run1.performance.avgLCP,
      };
    }

    return { run1, run2, differences };
  }

  /**
   * Get flaky tests
   */
  getFlakyTests(lastN: number = 10): { url: string; name: string; flakyCount: number }[] {
    const flakyMap = new Map<string, number>();
    const runs = this.getLastRuns(lastN);

    for (const run of runs) {
      const reports = this.loadRunData(run.id);
      if (!reports) continue;

      for (const report of reports) {
        for (const test of report.tests) {
          if (test.retryCount > 0) {
            const key = `${report.url}:${test.name}`;
            flakyMap.set(key, (flakyMap.get(key) || 0) + 1);
          }
        }
      }
    }

    return Array.from(flakyMap.entries())
      .filter(([, count]) => count >= 2)
      .map(([key, count]) => {
        const [url, name] = key.split(':');
        return { url, name, flakyCount: count };
      })
      .sort((a, b) => b.flakyCount - a.flakyCount);
  }

  /**
   * Cleanup old runs
   */
  private cleanup(): void {
    const runs = this.getAllRuns();
    const now = Date.now();
    const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;

    let deleted = 0;

    // Delete by retention policy
    for (const run of runs) {
      if (now - run.timestamp.getTime() > retentionMs) {
        this.deleteRun(run.id);
        deleted++;
      }
    }

    // Delete excess runs
    const remainingRuns = this.getAllRuns();
    if (remainingRuns.length > this.config.maxRuns) {
      const toDelete = remainingRuns.slice(this.config.maxRuns);
      for (const run of toDelete) {
        this.deleteRun(run.id);
        deleted++;
      }
    }

    if (deleted > 0) {
      this.logger.debug(`Cleaned up ${deleted} old runs`);
    }
  }

  /**
   * Delete a run
   */
  private deleteRun(id: string): void {
    const filePath = path.join(this.runsDir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    this.runIndex.delete(id);
  }

  /**
   * Get storage summary
   */
  getSummary(): {
    totalRuns: number;
    oldestRun?: Date;
    newestRun?: Date;
    storageSize: string;
    avgPassRate: number;
  } {
    const runs = this.getAllRuns();

    let storageSize = 0;
    try {
      const files = fs.readdirSync(this.runsDir);
      for (const file of files) {
        const stat = fs.statSync(path.join(this.runsDir, file));
        storageSize += stat.size;
      }
    } catch {
      // Ignore
    }

    const formatSize = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const passRates = runs.map((r) =>
      r.summary.totalTests > 0
        ? (r.summary.passed / r.summary.totalTests) * 100
        : 0
    );
    const avgPassRate = passRates.length > 0
      ? passRates.reduce((a, b) => a + b, 0) / passRates.length
      : 0;

    return {
      totalRuns: runs.length,
      oldestRun: runs.length > 0 ? runs[runs.length - 1].timestamp : undefined,
      newestRun: runs.length > 0 ? runs[0].timestamp : undefined,
      storageSize: formatSize(storageSize),
      avgPassRate: Number(avgPassRate.toFixed(1)),
    };
  }

  /**
   * Generate trend chart data (for visualization)
   */
  generateChartData(metricPath: string, lastN: number = 30): {
    labels: string[];
    data: number[];
  } {
    const series = this.getMetricSeries(metricPath, lastN);

    return {
      labels: series.points.map((p) =>
        p.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ),
      data: series.points.map((p) => p.value),
    };
  }
}

// ============================================================================
// Export
// ============================================================================

export default MetricsStorage;
