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
 * ```
 */

// Core
export {
  TestOrchestrator,
  createTester,
  runSmokeTest,
  runFullTest,
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
} from './testers';

// Monitors
export { ConsoleMonitor, NetworkMonitor } from './monitors';

// Reporters
export { ReportGenerator } from './reporters';

// Utils
export { Logger, helpers } from './utils';

// Default export
export { TestOrchestrator as default } from './core';
