/**
 * Automated Testing Tool
 *
 * A comprehensive, dynamic testing framework that crawls web applications
 * and tests all functionality including pages, forms, buttons, links,
 * edge functions, and more.
 *
 * @example
 * ```typescript
 * import { TestOrchestrator, createTester, runSmokeTest } from './tools/automated-testing';
 *
 * // Quick smoke test
 * const report = await runSmokeTest('http://localhost:8080');
 *
 * // Full test with custom config
 * const tester = createTester('full', {
 *   baseUrl: 'http://localhost:8080',
 *   maxPages: 50,
 * });
 * const report = await tester.run();
 *
 * // Custom configuration
 * const orchestrator = new TestOrchestrator({
 *   baseUrl: 'http://localhost:8080',
 *   depth: 'deep',
 *   accessibilityTesting: true,
 *   performanceTesting: true,
 * });
 * const report = await orchestrator.run();
 *
 * // Parallel execution
 * const runner = new ParallelRunner(config);
 * await runner.initialize();
 * const reports = await runner.runAll(testPage);
 *
 * // Watch mode
 * const watchMode = createWatchMode(config);
 * watchMode.setTestRunner(testRunner);
 * await watchMode.start();
 *
 * // Environment management
 * const envManager = createEnvironmentManager('./environments.json');
 * envManager.setEnvironment('staging');
 *
 * // Metrics and trending
 * const storage = new MetricsStorage();
 * const run = storage.storeRun(reports, { duration: 5000 });
 * const trends = storage.getTrendReport();
 * ```
 */

// Core
export {
  TestOrchestrator,
  createTester,
  runSmokeTest,
  runFullTest,
  ParallelRunner,
  TestFilterManager,
  EnvironmentManager,
  createEnvironmentManager,
  BaselineManager,
  baselineCommands,
  WatchMode,
  createWatchMode,
} from './core';

// Configuration
export {
  DEFAULT_CONFIG,
  PRESETS,
  mergeConfig,
  getPreset,
  validateConfig,
  shouldTestUrl,
  createPlatformConfig,
} from './config';

// Types
export type {
  TestConfig,
  TestResult,
  TestReport,
  PageTestReport,
  DiscoveredPage,
  DiscoveredRoute,
  DiscoveredForm,
  DiscoveredButton,
  DiscoveredElement,
  EdgeFunction,
  EdgeFunctionTestResult,
  ConsoleEntry,
  NetworkRequest,
  AccessibilityResult,
  AccessibilityViolation,
  PerformanceResult,
  CategorizedError,
  Recommendation,
  TestStatus,
  TestType,
  ErrorClassification,
  ViewportConfig,
  AuthConfig,
  PerformanceMetrics,
} from './types';

// Crawlers
export { PageCrawler, RouteAnalyzer } from './crawlers';

// Testers
export {
  FormTester,
  ElementTester,
  EdgeFunctionTester,
  PerformanceTester,
  AccessibilityTester,
  AuthTester,
  VisualTester,
  ApiTester,
} from './testers';

// Monitors
export { ConsoleMonitor, NetworkMonitor } from './monitors';

// Reporters
export { ReportGenerator } from './reporters';

// Analyzers
export { HookAnalyzer } from './analyzers';

// Fixtures
export {
  FixtureManager,
  SMOKE_TEST_FIXTURES,
  FULL_TEST_FIXTURES,
  DEFAULT_TEST_USER,
  DEFAULT_TEST_COMPANY,
  DEFAULT_TEST_PROJECT,
} from './fixtures';

// Storage
export { MetricsStorage } from './storage';

// Utils
export { Logger, helpers } from './utils';

// Default export
export { TestOrchestrator as default } from './core';
