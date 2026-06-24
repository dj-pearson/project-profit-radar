/**
 * Automated Testing Tool - Report Generator
 *
 * Generates comprehensive test reports in multiple formats.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  TestConfig,
  TestReport,
  ReportMeta,
  ReportSummary,
  PageTestReport,
  TestResult,
  CategorizedError,
  Recommendation,
  ErrorClassification,
  ConsoleEntry,
  NetworkRequest,
  AccessibilityResult,
  PerformanceResult,
  EdgeFunctionTestResult,
} from '../types';
import { Logger } from '../utils/logger';
import {
  ensureDir,
  writeJsonFile,
  formatDuration,
  formatBytes,
  escapeHtml,
  classifyError,
  getSeverityFromClassification,
  groupBy,
  countBy,
} from '../utils/helpers';

// ============================================================================
// Report Generator
// ============================================================================

export class ReportGenerator {
  private logger: Logger;
  private config: TestConfig;

  constructor(config: TestConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || new Logger({ context: 'ReportGenerator' });
  }

  /**
   * Generate the complete test report
   */
  generateReport(
    pageReports: PageTestReport[],
    edgeFunctionResults: EdgeFunctionTestResult[] = [],
    allConsoleEntries: ConsoleEntry[] = [],
    allNetworkRequests: NetworkRequest[] = [],
    startTime: number
  ): TestReport {
    const endTime = Date.now();

    // Generate metadata
    const meta = this.generateMeta(startTime, endTime);

    // Generate summary
    const summary = this.generateSummary(pageReports, edgeFunctionResults);

    // Categorize all errors
    const errors = this.categorizeErrors(pageReports, allConsoleEntries, allNetworkRequests);

    // Generate recommendations
    const recommendations = this.generateRecommendations(pageReports, errors, summary);

    // Get failed network requests
    const failedNetworkRequests = allNetworkRequests.filter(
      (r) => r.failed || (r.status && r.status >= 400)
    );

    // Get accessibility results
    const accessibilityResults = pageReports
      .filter((p) => p.accessibility)
      .map((p) => p.accessibility!);

    // Get performance results
    const performanceResults = pageReports
      .filter((p) => p.performance)
      .map((p) => p.performance!);

    return {
      meta,
      summary,
      pages: pageReports,
      edgeFunctions: edgeFunctionResults,
      consoleEntries: allConsoleEntries,
      failedNetworkRequests,
      accessibilityResults,
      performanceResults,
      errors,
      recommendations,
    };
  }

  /**
   * Generate report metadata
   */
  private generateMeta(startTime: number, endTime: number): ReportMeta {
    return {
      generatedAt: new Date(),
      duration: endTime - startTime,
      config: {
        baseUrl: this.config.baseUrl,
        depth: this.config.depth,
        maxPages: this.config.maxPages,
        browser: this.config.browser,
      },
      environment: {
        browser: this.config.browser,
        viewport: this.config.viewport,
        platform: process.platform,
        nodeVersion: process.version,
      },
    };
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(
    pageReports: PageTestReport[],
    edgeFunctionResults: EdgeFunctionTestResult[]
  ): ReportSummary {
    const allTests = pageReports.flatMap((p) => p.tests);

    const passed = allTests.filter((t) => t.status === 'passed').length;
    const failed = allTests.filter((t) => t.status === 'failed').length;
    const skipped = allTests.filter((t) => t.status === 'skipped').length;
    const warnings = allTests.filter((t) => t.status === 'warning').length;
    const errors = allTests.filter((t) => t.status === 'error').length;

    const totalTests = allTests.length;
    const passRate = totalTests > 0 ? (passed / totalTests) * 100 : 0;

    // Count errors by classification
    const errorsByClassification: Record<ErrorClassification, number> = {
      critical: 0,
      functional: 0,
      visual: 0,
      performance: 0,
      accessibility: 0,
      network: 0,
      validation: 0,
      console: 0,
      unknown: 0,
    };

    allTests
      .filter((t) => t.error)
      .forEach((t) => {
        const classification = t.error!.classification;
        errorsByClassification[classification]++;
      });

    // Count errors by type
    const errorsByType = countBy(
      allTests.filter((t) => t.status === 'failed' || t.status === 'error'),
      'type'
    ) as Record<string, number>;

    // Calculate average load time
    const loadTimes = pageReports.map((p) => p.loadTime).filter((t) => t > 0);
    const avgPageLoadTime =
      loadTimes.length > 0 ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length : 0;

    // Pages with errors
    const pagesWithErrors = pageReports.filter(
      (p) => p.tests.some((t) => t.status === 'failed' || t.status === 'error')
    ).length;

    // Edge function stats
    const edgeFunctionsPassing = edgeFunctionResults.filter(
      (r) => r.reachable && r.statusCode && r.statusCode < 500
    ).length;

    return {
      totalPages: pageReports.length,
      totalTests,
      passed,
      failed: failed + errors,
      skipped,
      warnings,
      passRate: Math.round(passRate * 100) / 100,
      totalErrors: failed + errors,
      errorsByClassification,
      errorsByType,
      avgPageLoadTime: Math.round(avgPageLoadTime),
      pagesWithErrors,
      edgeFunctionsTested: edgeFunctionResults.length,
      edgeFunctionsPassing,
    };
  }

  /**
   * Categorize all errors
   */
  private categorizeErrors(
    pageReports: PageTestReport[],
    consoleEntries: ConsoleEntry[],
    networkRequests: NetworkRequest[]
  ): CategorizedError[] {
    const errors: CategorizedError[] = [];
    const errorCounts = new Map<string, CategorizedError>();

    // Process test errors
    for (const page of pageReports) {
      for (const test of page.tests) {
        if (test.error) {
          const key = `${test.error.classification}:${test.error.message}`;
          const existing = errorCounts.get(key);

          if (existing) {
            existing.occurrences++;
            if (!existing.relatedErrors) {
              existing.relatedErrors = [];
            }
            existing.relatedErrors.push(test.id);
          } else {
            errorCounts.set(key, {
              classification: test.error.classification,
              severity: getSeverityFromClassification(test.error.classification),
              message: test.error.message,
              url: test.url,
              stack: test.error.stack,
              selector: test.error.selector,
              testId: test.id,
              timestamp: test.timestamp,
              occurrences: 1,
            });
          }
        }
      }
    }

    // Process console errors
    const criticalConsoleErrors = consoleEntries.filter((e) => e.isCritical);
    for (const entry of criticalConsoleErrors) {
      const classification = classifyError(entry.text, 'console');
      const key = `console:${entry.text.substring(0, 100)}`;
      const existing = errorCounts.get(key);

      if (existing) {
        existing.occurrences++;
      } else {
        errorCounts.set(key, {
          classification,
          severity: getSeverityFromClassification(classification),
          message: entry.text.substring(0, 500),
          url: entry.url,
          stack: entry.stack,
          timestamp: entry.timestamp,
          occurrences: 1,
        });
      }
    }

    // Process network errors
    const failedRequests = networkRequests.filter(
      (r) => r.failed || (r.status && r.status >= 400)
    );
    for (const request of failedRequests) {
      const message = request.failed
        ? `Network error: ${request.failureReason}`
        : `HTTP ${request.status}: ${request.url}`;

      const key = `network:${request.status || 'failed'}:${new URL(request.url).pathname}`;
      const existing = errorCounts.get(key);

      if (existing) {
        existing.occurrences++;
      } else {
        errorCounts.set(key, {
          classification: 'network',
          severity: request.status && request.status >= 500 ? 2 : 3,
          message,
          url: request.pageUrl,
          timestamp: request.timestamp,
          occurrences: 1,
        });
      }
    }

    // Convert to array and sort by severity
    return Array.from(errorCounts.values()).sort((a, b) => a.severity - b.severity);
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(
    pageReports: PageTestReport[],
    errors: CategorizedError[],
    summary: ReportSummary
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Critical errors recommendation
    const criticalErrors = errors.filter((e) => e.severity === 1);
    if (criticalErrors.length > 0) {
      recommendations.push({
        type: 'critical',
        category: 'functionality',
        title: 'Fix Critical Errors',
        description: `${criticalErrors.length} critical error(s) detected that may crash the application or block user workflows.`,
        affectedPages: [...new Set(criticalErrors.map((e) => e.url))],
        suggestedFix: 'Review the error stack traces and fix the root causes immediately.',
        relatedErrors: criticalErrors.map((e) => e.testId || '').filter(Boolean),
      });
    }

    // Performance recommendation
    if (summary.avgPageLoadTime > 3000) {
      const slowPages = pageReports
        .filter((p) => p.loadTime > 3000)
        .map((p) => p.url);

      recommendations.push({
        type: 'high',
        category: 'performance',
        title: 'Improve Page Load Times',
        description: `Average page load time is ${formatDuration(summary.avgPageLoadTime)}, which exceeds the recommended 3 second threshold.`,
        affectedPages: slowPages,
        suggestedFix:
          'Optimize images, enable lazy loading, reduce JavaScript bundle size, and consider code splitting.',
      });
    }

    // Accessibility recommendation
    const accessibilityErrors = errors.filter((e) => e.classification === 'accessibility');
    if (accessibilityErrors.length > 0) {
      recommendations.push({
        type: 'medium',
        category: 'accessibility',
        title: 'Address Accessibility Issues',
        description: `${accessibilityErrors.length} accessibility violation(s) found that may prevent users with disabilities from using the application.`,
        affectedPages: [...new Set(accessibilityErrors.map((e) => e.url))],
        suggestedFix:
          'Ensure all images have alt text, form inputs have labels, buttons have accessible names, and color contrast meets WCAG guidelines.',
      });
    }

    // Network errors recommendation
    const networkErrors = errors.filter((e) => e.classification === 'network');
    if (networkErrors.length > 5) {
      recommendations.push({
        type: 'high',
        category: 'functionality',
        title: 'Fix Network Request Failures',
        description: `${networkErrors.length} network request(s) failed, indicating potential API or connectivity issues.`,
        affectedPages: [...new Set(networkErrors.map((e) => e.url))],
        suggestedFix:
          'Review API endpoints, ensure proper error handling, and check server availability.',
      });
    }

    // Console errors recommendation
    const consoleErrors = errors.filter((e) => e.classification === 'console');
    if (consoleErrors.length > 0) {
      recommendations.push({
        type: 'medium',
        category: 'functionality',
        title: 'Resolve Console Errors',
        description: `${consoleErrors.length} JavaScript error(s) logged to the console.`,
        affectedPages: [...new Set(consoleErrors.map((e) => e.url))],
        suggestedFix:
          'Check browser console for error details, add proper error handling, and fix any undefined variable issues.',
      });
    }

    // Low pass rate recommendation
    if (summary.passRate < 80) {
      recommendations.push({
        type: 'high',
        category: 'functionality',
        title: 'Improve Overall Test Pass Rate',
        description: `Test pass rate is ${summary.passRate.toFixed(1)}%, which is below the recommended 80% threshold.`,
        affectedPages: pageReports.filter((p) =>
          p.tests.some((t) => t.status === 'failed' || t.status === 'error')
        ).map((p) => p.url),
        suggestedFix: 'Review failing tests and prioritize fixes based on severity and user impact.',
      });
    }

    // Edge functions recommendation
    if (summary.edgeFunctionsTested && summary.edgeFunctionsPassing) {
      const failingFunctions =
        (summary.edgeFunctionsTested || 0) - (summary.edgeFunctionsPassing || 0);
      if (failingFunctions > 0) {
        recommendations.push({
          type: 'high',
          category: 'functionality',
          title: 'Fix Failing Edge Functions',
          description: `${failingFunctions} edge function(s) are not responding correctly.`,
          affectedPages: [],
          suggestedFix:
            'Check edge function logs, verify environment variables, and ensure proper error handling.',
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priority = { critical: 0, high: 1, medium: 2, low: 3 };
      return priority[a.type] - priority[b.type];
    });
  }

  /**
   * Save report in all configured formats
   */
  async saveReport(report: TestReport): Promise<string[]> {
    const savedFiles: string[] = [];

    ensureDir(this.config.outputDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const prefix = this.config.reporters.filenamePrefix;

    // Save JSON report
    if (this.config.reporters.json) {
      const jsonPath = path.join(this.config.outputDir, `${prefix}-${timestamp}.json`);
      writeJsonFile(jsonPath, report);
      savedFiles.push(jsonPath);
      this.logger.info(`JSON report saved: ${jsonPath}`);
    }

    // Save HTML report
    if (this.config.reporters.html) {
      const htmlPath = path.join(this.config.outputDir, `${prefix}-${timestamp}.html`);
      const html = this.generateHtmlReport(report);
      fs.writeFileSync(htmlPath, html);
      savedFiles.push(htmlPath);
      this.logger.info(`HTML report saved: ${htmlPath}`);
    }

    // Save Markdown report
    if (this.config.reporters.markdown) {
      const mdPath = path.join(this.config.outputDir, `${prefix}-${timestamp}.md`);
      const markdown = this.generateMarkdownReport(report);
      fs.writeFileSync(mdPath, markdown);
      savedFiles.push(mdPath);
      this.logger.info(`Markdown report saved: ${mdPath}`);
    }

    return savedFiles;
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(report: TestReport): string {
    const { summary, meta, pages, errors, recommendations } = report;

    const statusColors = {
      passed: '#22c55e',
      failed: '#ef4444',
      warning: '#f59e0b',
      skipped: '#6b7280',
      error: '#dc2626',
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Automated Test Report - ${meta.generatedAt.toLocaleDateString()}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; background: #f9fafb; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.5rem; margin: 2rem 0 1rem; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
    h3 { font-size: 1.25rem; margin: 1.5rem 0 0.75rem; }
    .header { background: #1f2937; color: white; padding: 2rem; margin-bottom: 2rem; border-radius: 8px; }
    .header p { opacity: 0.8; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .stat-card .value { font-size: 2rem; font-weight: bold; }
    .stat-card .label { color: #6b7280; font-size: 0.875rem; }
    .stat-card.success .value { color: ${statusColors.passed}; }
    .stat-card.danger .value { color: ${statusColors.failed}; }
    .stat-card.warning .value { color: ${statusColors.warning}; }
    .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 1rem; }
    .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
    .badge-passed { background: #dcfce7; color: #166534; }
    .badge-failed { background: #fee2e2; color: #991b1b; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-critical { background: #fee2e2; color: #991b1b; }
    .badge-high { background: #ffedd5; color: #9a3412; }
    .badge-medium { background: #fef3c7; color: #92400e; }
    .badge-low { background: #e0f2fe; color: #075985; }
    .progress-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin: 0.5rem 0; }
    .progress-bar .fill { height: 100%; transition: width 0.3s; }
    .progress-bar .fill.success { background: ${statusColors.passed}; }
    .progress-bar .fill.danger { background: ${statusColors.failed}; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    .error-item { border-left: 4px solid #ef4444; padding-left: 1rem; margin-bottom: 1rem; }
    .error-item.warning { border-color: #f59e0b; }
    .error-message { font-family: monospace; font-size: 0.875rem; background: #f3f4f6; padding: 0.5rem; border-radius: 4px; overflow-x: auto; }
    .recommendation { padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
    .recommendation.critical { background: #fee2e2; border-left: 4px solid #ef4444; }
    .recommendation.high { background: #ffedd5; border-left: 4px solid #f97316; }
    .recommendation.medium { background: #fef3c7; border-left: 4px solid #f59e0b; }
    .recommendation.low { background: #e0f2fe; border-left: 4px solid #0ea5e9; }
    .collapsible { cursor: pointer; }
    .collapsible::after { content: ' ▼'; font-size: 0.75rem; }
    .collapsible.collapsed::after { content: ' ▶'; }
    .content { overflow: hidden; transition: max-height 0.3s; }
    .content.collapsed { max-height: 0 !important; }
    code { background: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 4px; font-size: 0.875rem; }
    .footer { text-align: center; padding: 2rem; color: #6b7280; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧪 Automated Test Report</h1>
      <p>Generated: ${meta.generatedAt.toLocaleString()}</p>
      <p>Duration: ${formatDuration(meta.duration)} | Browser: ${meta.environment.browser} | Pages: ${summary.totalPages}</p>
    </div>

    <div class="summary-grid">
      <div class="stat-card success">
        <div class="value">${summary.passRate.toFixed(1)}%</div>
        <div class="label">Pass Rate</div>
      </div>
      <div class="stat-card">
        <div class="value">${summary.totalTests}</div>
        <div class="label">Total Tests</div>
      </div>
      <div class="stat-card success">
        <div class="value">${summary.passed}</div>
        <div class="label">Passed</div>
      </div>
      <div class="stat-card danger">
        <div class="value">${summary.failed}</div>
        <div class="label">Failed</div>
      </div>
      <div class="stat-card warning">
        <div class="value">${summary.warnings}</div>
        <div class="label">Warnings</div>
      </div>
      <div class="stat-card">
        <div class="value">${formatDuration(summary.avgPageLoadTime)}</div>
        <div class="label">Avg Load Time</div>
      </div>
    </div>

    <div class="card">
      <h3>Test Results Distribution</h3>
      <div class="progress-bar" style="height: 24px;">
        <div class="fill success" style="width: ${(summary.passed / summary.totalTests) * 100}%; display: inline-block;"></div>
        <div class="fill danger" style="width: ${(summary.failed / summary.totalTests) * 100}%; display: inline-block;"></div>
      </div>
      <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
        <span><span style="color: ${statusColors.passed}">■</span> Passed: ${summary.passed}</span>
        <span><span style="color: ${statusColors.failed}">■</span> Failed: ${summary.failed}</span>
        <span><span style="color: ${statusColors.warning}">■</span> Warnings: ${summary.warnings}</span>
        <span><span style="color: ${statusColors.skipped}">■</span> Skipped: ${summary.skipped}</span>
      </div>
    </div>

    ${recommendations.length > 0 ? `
    <h2>📋 Recommendations</h2>
    ${recommendations.map((rec) => `
      <div class="recommendation ${rec.type}">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <strong>${escapeHtml(rec.title)}</strong>
          <span class="badge badge-${rec.type}">${rec.type.toUpperCase()}</span>
        </div>
        <p>${escapeHtml(rec.description)}</p>
        ${rec.suggestedFix ? `<p style="margin-top: 0.5rem;"><strong>Suggested Fix:</strong> ${escapeHtml(rec.suggestedFix)}</p>` : ''}
        ${rec.affectedPages.length > 0 ? `<p style="margin-top: 0.5rem;"><strong>Affected Pages:</strong> ${rec.affectedPages.length}</p>` : ''}
      </div>
    `).join('')}
    ` : ''}

    ${errors.length > 0 ? `
    <h2>❌ Errors (${errors.length})</h2>
    ${errors.slice(0, 20).map((err) => `
      <div class="error-item ${err.severity > 2 ? 'warning' : ''}">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong>${escapeHtml(err.classification.toUpperCase())}</strong>
          <span class="badge badge-${err.severity <= 2 ? 'failed' : 'warning'}">Severity ${err.severity}</span>
        </div>
        <p class="error-message">${escapeHtml(err.message)}</p>
        <p style="font-size: 0.75rem; color: #6b7280;">URL: ${escapeHtml(err.url)} | Occurrences: ${err.occurrences}</p>
      </div>
    `).join('')}
    ${errors.length > 20 ? `<p>... and ${errors.length - 20} more errors</p>` : ''}
    ` : ''}

    <h2>📄 Pages Tested (${pages.length})</h2>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>URL</th>
            <th>Load Time</th>
            <th>Tests</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${pages.slice(0, 50).map((page) => {
            const passed = page.tests.filter((t) => t.status === 'passed').length;
            const failed = page.tests.filter((t) => t.status === 'failed' || t.status === 'error').length;
            const status = failed > 0 ? 'failed' : passed === page.tests.length ? 'passed' : 'warning';
            return `
            <tr>
              <td><code>${escapeHtml(page.url)}</code></td>
              <td>${formatDuration(page.loadTime)}</td>
              <td>${passed}/${page.tests.length}</td>
              <td><span class="badge badge-${status}">${status}</span></td>
            </tr>
          `;}).join('')}
        </tbody>
      </table>
      ${pages.length > 50 ? `<p style="margin-top: 1rem;">... and ${pages.length - 50} more pages</p>` : ''}
    </div>

    ${report.edgeFunctions && report.edgeFunctions.length > 0 ? `
    <h2>⚡ Edge Functions (${report.edgeFunctions.length})</h2>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Function</th>
            <th>Status</th>
            <th>Response Time</th>
            <th>Auth Required</th>
          </tr>
        </thead>
        <tbody>
          ${report.edgeFunctions.map((func) => {
            const status = func.reachable && func.statusCode && func.statusCode < 500 ? 'passed' : 'failed';
            return `
            <tr>
              <td><code>${escapeHtml(func.name)}</code></td>
              <td><span class="badge badge-${status}">${func.statusCode || 'N/A'}</span></td>
              <td>${func.responseTime ? formatDuration(func.responseTime) : 'N/A'}</td>
              <td>${func.authTest?.withoutAuth.status === 401 ? 'Yes' : 'No'}</td>
            </tr>
          `;}).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="footer">
      <p>Generated by Automated Testing Tool</p>
      <p>Test run completed in ${formatDuration(meta.duration)}</p>
    </div>
  </div>

  <script>
    document.querySelectorAll('.collapsible').forEach(el => {
      el.addEventListener('click', () => {
        el.classList.toggle('collapsed');
        const content = el.nextElementSibling;
        if (content) content.classList.toggle('collapsed');
      });
    });
  </script>
</body>
</html>`;
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdownReport(report: TestReport): string {
    const { summary, meta, pages, errors, recommendations } = report;

    let md = `# Automated Test Report

**Generated:** ${meta.generatedAt.toLocaleString()}
**Duration:** ${formatDuration(meta.duration)}
**Browser:** ${meta.environment.browser}
**Base URL:** ${meta.config.baseUrl}

---

## Summary

| Metric | Value |
|--------|-------|
| Total Pages | ${summary.totalPages} |
| Total Tests | ${summary.totalTests} |
| Passed | ${summary.passed} |
| Failed | ${summary.failed} |
| Warnings | ${summary.warnings} |
| Pass Rate | ${summary.passRate.toFixed(1)}% |
| Avg Load Time | ${formatDuration(summary.avgPageLoadTime)} |

`;

    if (recommendations.length > 0) {
      md += `## Recommendations

`;
      for (const rec of recommendations) {
        md += `### ${rec.type.toUpperCase()}: ${rec.title}

${rec.description}

${rec.suggestedFix ? `**Suggested Fix:** ${rec.suggestedFix}` : ''}

${rec.affectedPages.length > 0 ? `**Affected Pages:** ${rec.affectedPages.length}` : ''}

`;
      }
    }

    if (errors.length > 0) {
      md += `## Errors (${errors.length})

| Classification | Message | URL | Occurrences |
|---------------|---------|-----|-------------|
`;
      for (const err of errors.slice(0, 30)) {
        md += `| ${err.classification} | ${err.message.substring(0, 60)}... | ${err.url} | ${err.occurrences} |
`;
      }
      if (errors.length > 30) {
        md += `\n*... and ${errors.length - 30} more errors*\n`;
      }
    }

    md += `## Pages Tested (${pages.length})

| URL | Load Time | Tests | Status |
|-----|-----------|-------|--------|
`;
    for (const page of pages.slice(0, 30)) {
      const passed = page.tests.filter((t) => t.status === 'passed').length;
      const failed = page.tests.filter((t) => t.status === 'failed' || t.status === 'error').length;
      const status = failed > 0 ? '❌ Failed' : passed === page.tests.length ? '✅ Passed' : '⚠️ Warning';
      md += `| ${page.url} | ${formatDuration(page.loadTime)} | ${passed}/${page.tests.length} | ${status} |
`;
    }
    if (pages.length > 30) {
      md += `\n*... and ${pages.length - 30} more pages*\n`;
    }

    if (report.edgeFunctions && report.edgeFunctions.length > 0) {
      md += `
## Edge Functions (${report.edgeFunctions.length})

| Function | Status | Response Time |
|----------|--------|---------------|
`;
      for (const func of report.edgeFunctions) {
        const status = func.reachable && func.statusCode && func.statusCode < 500 ? '✅' : '❌';
        md += `| ${func.name} | ${status} ${func.statusCode || 'N/A'} | ${func.responseTime ? formatDuration(func.responseTime) : 'N/A'} |
`;
      }
    }

    md += `
---

*Generated by Automated Testing Tool*
`;

    return md;
  }
}

// ============================================================================
// Export
// ============================================================================

export default ReportGenerator;
