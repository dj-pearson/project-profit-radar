/**
 * Automated Testing Tool - Test Orchestrator
 *
 * Main orchestrator that coordinates all testing components.
 */

import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';
import type {
  TestConfig,
  TestReport,
  PageTestReport,
  DiscoveredPage,
  DiscoveredRoute,
  TestResult,
  EdgeFunctionTestResult,
  ConsoleEntry,
  NetworkRequest,
} from '../types';
import { Logger } from '../utils/logger';
import { mergeConfig, validateConfig, getPreset } from '../config';
import { PageCrawler, RouteAnalyzer } from '../crawlers';
import { FormTester, ElementTester, EdgeFunctionTester, PerformanceTester, AccessibilityTester } from '../testers';
import { ConsoleMonitor, NetworkMonitor } from '../monitors';
import { ReportGenerator } from '../reporters';
import { ensureDir, sleep } from '../utils/helpers';

// ============================================================================
// Test Orchestrator
// ============================================================================

export class TestOrchestrator {
  private config: TestConfig;
  private logger: Logger;
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;

  // Components
  private pageCrawler: PageCrawler;
  private routeAnalyzer: RouteAnalyzer;
  private formTester: FormTester;
  private elementTester: ElementTester;
  private edgeFunctionTester: EdgeFunctionTester;
  private performanceTester: PerformanceTester;
  private accessibilityTester: AccessibilityTester;
  private consoleMonitor: ConsoleMonitor;
  private networkMonitor: NetworkMonitor;
  private reportGenerator: ReportGenerator;

  // Results
  private pageReports: PageTestReport[] = [];
  private edgeFunctionResults: EdgeFunctionTestResult[] = [];
  private allConsoleEntries: ConsoleEntry[] = [];
  private allNetworkRequests: NetworkRequest[] = [];
  private startTime: number = 0;

  constructor(userConfig: Partial<TestConfig> = {}) {
    this.config = mergeConfig(userConfig);
    this.logger = new Logger({
      context: 'Orchestrator',
      minLevel: 'info',
      colors: true,
      timestamps: true,
    });

    // Validate configuration
    const validation = validateConfig(this.config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    // Initialize components
    this.pageCrawler = new PageCrawler(this.config, this.logger.child('Crawler'));
    this.routeAnalyzer = new RouteAnalyzer(this.logger.child('RouteAnalyzer'));
    this.formTester = new FormTester(this.config, this.logger.child('FormTester'));
    this.elementTester = new ElementTester(this.config, this.logger.child('ElementTester'));
    this.edgeFunctionTester = new EdgeFunctionTester(this.config, this.logger.child('EdgeFunctionTester'));
    this.performanceTester = new PerformanceTester(this.config, this.logger.child('PerformanceTester'));
    this.accessibilityTester = new AccessibilityTester(this.config, this.logger.child('AccessibilityTester'));
    this.consoleMonitor = new ConsoleMonitor(this.logger.child('ConsoleMonitor'));
    this.networkMonitor = new NetworkMonitor(this.logger.child('NetworkMonitor'));
    this.reportGenerator = new ReportGenerator(this.config, this.logger.child('ReportGenerator'));
  }

  /**
   * Run the full test suite
   */
  async run(): Promise<TestReport> {
    this.startTime = Date.now();

    this.logger.section('AUTOMATED TESTING TOOL');
    this.logger.info(`Base URL: ${this.config.baseUrl}`);
    this.logger.info(`Test depth: ${this.config.depth}`);
    this.logger.info(`Max pages: ${this.config.maxPages || 'unlimited'}`);

    try {
      // Initialize browser
      await this.initBrowser();

      // Discover routes
      const routes = await this.discoverRoutes();

      // Crawl pages
      const pages = await this.crawlPages(routes);

      // Test each page
      await this.testPages(pages);

      // Test edge functions
      if (this.config.edgeFunctionTesting) {
        await this.testEdgeFunctions();
      }

      // Generate report
      const report = await this.generateReport();

      // Print summary
      this.printSummary(report);

      return report;
    } catch (error) {
      this.logger.error(`Test run failed: ${(error as Error).message}`);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Initialize browser
   */
  private async initBrowser(): Promise<void> {
    this.logger.subsection('Initializing Browser');

    const browserTypes = {
      chromium,
      firefox,
      webkit,
    };

    const browserType = browserTypes[this.config.browser];

    this.browser = await browserType.launch({
      headless: this.config.headless,
    });

    this.context = await this.browser.newContext({
      viewport: this.config.viewport,
      ignoreHTTPSErrors: true,
    });

    this.page = await this.context.newPage();

    // Attach monitors
    this.consoleMonitor.attach(this.page);
    this.networkMonitor.attach(this.page);

    // Set default timeout
    this.page.setDefaultTimeout(this.config.timeout);

    this.logger.success(`Browser initialized: ${this.config.browser}`);
  }

  /**
   * Discover routes from route files
   */
  private async discoverRoutes(): Promise<DiscoveredRoute[]> {
    this.logger.subsection('Discovering Routes');

    let routes: DiscoveredRoute[] = [];

    if (this.config.routesDir) {
      routes = await this.routeAnalyzer.analyzeRoutes(this.config.routesDir);
    }

    // Also check for pages directory
    const pagesDir = this.config.routesDir?.replace('/routes', '/pages');
    if (pagesDir) {
      const pageRoutes = await this.routeAnalyzer.analyzePagesDirectory(pagesDir);
      routes = [...routes, ...pageRoutes];
    }

    this.logger.success(`Discovered ${routes.length} routes`);

    return routes;
  }

  /**
   * Crawl pages
   */
  private async crawlPages(routes: DiscoveredRoute[]): Promise<DiscoveredPage[]> {
    this.logger.subsection('Crawling Pages');

    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    // Get testable route URLs
    const routeUrls = this.routeAnalyzer
      .getTestableRoutes(routes)
      .map((r) => `${this.config.baseUrl}${r.path}`);

    // Add base URL if not in routes
    if (!routeUrls.includes(this.config.baseUrl)) {
      routeUrls.unshift(this.config.baseUrl);
    }

    // Start crawling
    const pages = await this.pageCrawler.crawl(this.page, routeUrls.slice(0, 10));

    // If we have more routes than crawled pages, add them to queue
    if (routeUrls.length > 10) {
      this.pageCrawler.addToQueue(routeUrls.slice(10), 1);
      const additionalPages = await this.pageCrawler.crawl(this.page, []);
      pages.push(...additionalPages);
    }

    this.logger.success(`Crawled ${pages.length} pages`);

    return pages;
  }

  /**
   * Test all pages
   */
  private async testPages(pages: DiscoveredPage[]): Promise<void> {
    this.logger.subsection('Testing Pages');

    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    let testedCount = 0;

    for (const pageInfo of pages) {
      testedCount++;
      this.logger.progress(testedCount, pages.length, `Testing: ${pageInfo.url.substring(0, 50)}...`);

      const pageReport = await this.testPage(pageInfo);
      this.pageReports.push(pageReport);

      // Collect console and network entries for this page
      this.allConsoleEntries.push(...this.consoleMonitor.getEntriesForUrl(pageInfo.url));
      this.allNetworkRequests.push(...this.networkMonitor.getRequestsForUrl(pageInfo.url));

      // Delay between pages
      if (this.config.navigationDelay > 0) {
        await sleep(this.config.navigationDelay);
      }
    }

    this.logger.success(`Tested ${pages.length} pages`);
  }

  /**
   * Test a single page
   */
  private async testPage(pageInfo: DiscoveredPage): Promise<PageTestReport> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const tests: TestResult[] = [];

    try {
      // Navigate to page
      this.consoleMonitor.setCurrentUrl(pageInfo.url);
      this.networkMonitor.setCurrentUrl(pageInfo.url);

      const response = await this.page.goto(pageInfo.url, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout,
      });

      const loadTime = pageInfo.loadTime;
      const statusCode = response?.status() || 0;

      // Page load test
      tests.push({
        id: `page-load-${Date.now()}`,
        type: 'page-load',
        name: 'Page Load',
        status: statusCode >= 200 && statusCode < 400 ? 'passed' : 'failed',
        url: pageInfo.url,
        duration: loadTime,
        timestamp: new Date(),
        retryCount: 0,
        data: {
          statusCode,
          loadTime,
        },
      });

      // Test forms
      if (pageInfo.forms.length > 0) {
        const formResults = await this.formTester.testForms(this.page, pageInfo.forms, pageInfo.url);
        tests.push(...formResults);
      }

      // Test elements (buttons, links)
      const elementResults = await this.elementTester.testElements(this.page, pageInfo, pageInfo.url);
      tests.push(...elementResults);

      // Test navigation
      const navResults = await this.elementTester.testNavigation(this.page, pageInfo.url);
      tests.push(...navResults);

      // Performance testing
      let performance;
      if (this.config.performanceTesting) {
        performance = await this.performanceTester.measurePerformance(this.page, pageInfo.url);
        const perfResults = this.performanceTester.generateTestResults(performance);
        tests.push(...perfResults);
      }

      // Accessibility testing
      let accessibility;
      if (this.config.accessibilityTesting) {
        accessibility = await this.accessibilityTester.testAccessibility(this.page, pageInfo.url);
        const a11yResults = this.accessibilityTester.generateTestResults(accessibility);
        tests.push(...a11yResults);
      }

      // Console error tests
      const consoleResults = this.consoleMonitor.generateTestResults();
      tests.push(...consoleResults);

      // Network error tests
      const networkResults = this.networkMonitor.generateTestResults();
      tests.push(...networkResults);

      return {
        url: pageInfo.url,
        title: pageInfo.title,
        loadTime,
        tests,
        screenshotPath: pageInfo.screenshotPath,
        consoleEntries: this.consoleMonitor.getEntriesForUrl(pageInfo.url),
        networkRequests: this.networkMonitor.getRequestsForUrl(pageInfo.url),
        performance,
        accessibility,
      };
    } catch (error) {
      tests.push({
        id: `page-error-${Date.now()}`,
        type: 'page-load',
        name: 'Page Load Error',
        status: 'error',
        url: pageInfo.url,
        duration: 0,
        timestamp: new Date(),
        retryCount: 0,
        error: {
          message: (error as Error).message,
          stack: (error as Error).stack,
          classification: 'critical',
        },
      });

      return {
        url: pageInfo.url,
        title: '',
        loadTime: 0,
        tests,
        consoleEntries: [],
        networkRequests: [],
      };
    }
  }

  /**
   * Test edge functions
   */
  private async testEdgeFunctions(): Promise<void> {
    this.logger.subsection('Testing Edge Functions');

    if (!this.config.edgeFunctionsDir) {
      this.logger.info('No edge functions directory configured');
      return;
    }

    // Discover functions
    const functions = await this.edgeFunctionTester.discoverFunctions(this.config.edgeFunctionsDir);

    if (functions.length === 0) {
      this.logger.info('No edge functions found');
      return;
    }

    // Test functions
    this.edgeFunctionResults = await this.edgeFunctionTester.testFunctions(functions);

    const summary = this.edgeFunctionTester.generateSummary(this.edgeFunctionResults);
    this.logger.success(
      `Tested ${summary.total} edge functions: ${summary.healthy} healthy, ${summary.failing} failing`
    );
  }

  /**
   * Generate the test report
   */
  private async generateReport(): Promise<TestReport> {
    this.logger.subsection('Generating Report');

    // Generate report
    const report = this.reportGenerator.generateReport(
      this.pageReports,
      this.edgeFunctionResults,
      this.allConsoleEntries,
      this.allNetworkRequests,
      this.startTime
    );

    // Save report files
    ensureDir(this.config.outputDir);
    const savedFiles = await this.reportGenerator.saveReport(report);

    this.logger.success(`Report saved to: ${this.config.outputDir}`);
    savedFiles.forEach((file) => this.logger.info(`  - ${file}`));

    return report;
  }

  /**
   * Print summary to console
   */
  private printSummary(report: TestReport): void {
    this.logger.section('TEST SUMMARY');

    this.logger.summary('Results', {
      'Total Pages': report.summary.totalPages,
      'Total Tests': report.summary.totalTests,
      'Passed': report.summary.passed,
      'Failed': report.summary.failed,
      'Warnings': report.summary.warnings,
      'Pass Rate': `${report.summary.passRate.toFixed(1)}%`,
    });

    if (report.errors.length > 0) {
      this.logger.subsection('Top Errors');
      report.errors.slice(0, 5).forEach((error) => {
        this.logger.error(`${error.classification.toUpperCase()}: ${error.message.substring(0, 80)}...`);
      });
    }

    if (report.recommendations.length > 0) {
      this.logger.subsection('Recommendations');
      report.recommendations.slice(0, 3).forEach((rec) => {
        this.logger.warn(`[${rec.type.toUpperCase()}] ${rec.title}`);
      });
    }

    const duration = Date.now() - this.startTime;
    this.logger.info(`\nTest run completed in ${Math.round(duration / 1000)}s`);
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    if (this.page) {
      this.consoleMonitor.detach(this.page);
    }

    if (this.context) {
      await this.context.close();
    }

    if (this.browser) {
      await this.browser.close();
    }

    this.logger.close();
  }

  /**
   * Get the current configuration
   */
  getConfig(): TestConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a test orchestrator with a preset configuration
 */
export function createTester(
  preset: 'smoke' | 'standard' | 'full' | 'mobile' | 'accessibility' | 'performance' | 'api' | 'ci',
  overrides: Partial<TestConfig> = {}
): TestOrchestrator {
  const config = { ...getPreset(preset), ...overrides };
  return new TestOrchestrator(config);
}

/**
 * Run a quick smoke test
 */
export async function runSmokeTest(baseUrl: string): Promise<TestReport> {
  const tester = createTester('smoke', { baseUrl });
  return tester.run();
}

/**
 * Run a full test
 */
export async function runFullTest(baseUrl: string, options: Partial<TestConfig> = {}): Promise<TestReport> {
  const tester = createTester('full', { baseUrl, ...options });
  return tester.run();
}

// ============================================================================
// Export
// ============================================================================

export default TestOrchestrator;
