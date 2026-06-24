/**
 * Automated Testing Tool - Type Definitions
 *
 * Comprehensive types for the dynamic automated testing framework.
 * This tool is designed to be generic and reusable across platforms.
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface TestConfig {
  /** Base URL of the application to test */
  baseUrl: string;
  /** Routes directory path (for static route analysis) */
  routesDir?: string;
  /** Edge functions directory path */
  edgeFunctionsDir?: string;
  /** Test timeout in milliseconds */
  timeout: number;
  /** Number of retries for failed tests */
  retries: number;
  /** Run tests in headless mode */
  headless: boolean;
  /** Browser to use: chromium, firefox, webkit */
  browser: 'chromium' | 'firefox' | 'webkit';
  /** Viewport configuration */
  viewport: ViewportConfig;
  /** Authentication configuration */
  auth?: AuthConfig;
  /** Pages to exclude from testing (regex patterns) */
  excludePatterns: string[];
  /** Pages to specifically include (if empty, all pages are included) */
  includePatterns: string[];
  /** Enable screenshot capture */
  screenshots: boolean;
  /** Enable video recording */
  video: boolean;
  /** Output directory for reports */
  outputDir: string;
  /** Test depth: 'shallow' (links only), 'medium' (forms), 'deep' (everything) */
  depth: 'shallow' | 'medium' | 'deep';
  /** Maximum pages to crawl (0 = unlimited) */
  maxPages: number;
  /** Delay between page navigations in ms */
  navigationDelay: number;
  /** Enable accessibility testing */
  accessibilityTesting: boolean;
  /** Enable performance testing */
  performanceTesting: boolean;
  /** Enable edge function testing */
  edgeFunctionTesting: boolean;
  /** Enable console error monitoring */
  consoleMonitoring: boolean;
  /** Enable network request monitoring */
  networkMonitoring: boolean;
  /** Custom selectors for elements */
  selectors: SelectorConfig;
  /** Reporter configuration */
  reporters: ReporterConfig;
  /** Parallel execution settings */
  parallel: ParallelConfig;
}

export interface ViewportConfig {
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
}

export interface AuthConfig {
  /** Login URL */
  loginUrl: string;
  /** Selector for email/username field */
  usernameSelector: string;
  /** Selector for password field */
  passwordSelector: string;
  /** Selector for submit button */
  submitSelector: string;
  /** Test user credentials */
  credentials: {
    username: string;
    password: string;
  };
  /** URL to redirect after successful login */
  successUrl?: string;
  /** Session storage key for auth token */
  sessionKey?: string;
}

export interface SelectorConfig {
  /** Selectors for forms */
  forms: string[];
  /** Selectors for buttons */
  buttons: string[];
  /** Selectors for links */
  links: string[];
  /** Selectors for inputs */
  inputs: string[];
  /** Selectors for interactive elements */
  interactive: string[];
  /** Selectors to ignore */
  ignore: string[];
}

export interface ReporterConfig {
  /** Generate HTML report */
  html: boolean;
  /** Generate JSON report */
  json: boolean;
  /** Generate Markdown report */
  markdown: boolean;
  /** Report filename prefix */
  filenamePrefix: string;
  /** Include screenshots in report */
  includeScreenshots: boolean;
  /** Include performance metrics in report */
  includePerformance: boolean;
  /** Include accessibility results in report */
  includeAccessibility: boolean;
}

export interface ParallelConfig {
  /** Enable parallel execution */
  enabled: boolean;
  /** Number of parallel workers */
  workers: number;
}

// ============================================================================
// Discovery Types
// ============================================================================

export interface DiscoveredRoute {
  /** Route path (e.g., /dashboard) */
  path: string;
  /** Component name if available */
  componentName?: string;
  /** Source file path */
  sourceFile?: string;
  /** Whether route requires authentication */
  requiresAuth: boolean;
  /** Route parameters if any */
  params?: string[];
  /** Child routes */
  children?: DiscoveredRoute[];
  /** Route metadata */
  meta?: Record<string, unknown>;
}

export interface DiscoveredPage {
  /** Page URL */
  url: string;
  /** Page title */
  title: string;
  /** HTTP status code */
  statusCode: number;
  /** Load time in ms */
  loadTime: number;
  /** Source of discovery (crawl, route, sitemap) */
  source: 'crawl' | 'route' | 'sitemap' | 'manual';
  /** Discovered links on this page */
  links: string[];
  /** Discovered forms on this page */
  forms: DiscoveredForm[];
  /** Discovered buttons on this page */
  buttons: DiscoveredButton[];
  /** Discovered interactive elements */
  interactiveElements: DiscoveredElement[];
  /** Page screenshot path */
  screenshotPath?: string;
  /** Depth from starting page */
  depth: number;
}

export interface DiscoveredForm {
  /** Form identifier (id or generated) */
  id: string;
  /** Form action URL */
  action?: string;
  /** Form method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | string;
  /** Form fields */
  fields: FormField[];
  /** Form selector */
  selector: string;
  /** Whether form has submit button */
  hasSubmitButton: boolean;
}

export interface FormField {
  /** Field name */
  name: string;
  /** Field type */
  type: string;
  /** Field label if found */
  label?: string;
  /** Whether field is required */
  required: boolean;
  /** Field placeholder */
  placeholder?: string;
  /** Field selector */
  selector: string;
  /** Validation pattern if any */
  pattern?: string;
  /** Min/Max constraints */
  constraints?: {
    min?: number | string;
    max?: number | string;
    minLength?: number;
    maxLength?: number;
  };
}

export interface DiscoveredButton {
  /** Button identifier */
  id: string;
  /** Button text */
  text: string;
  /** Button type */
  type: 'submit' | 'button' | 'reset' | string;
  /** Button selector */
  selector: string;
  /** Whether button is disabled */
  disabled: boolean;
  /** Button aria-label if any */
  ariaLabel?: string;
}

export interface DiscoveredElement {
  /** Element tag name */
  tagName: string;
  /** Element identifier */
  id: string;
  /** Element classes */
  classes: string[];
  /** Element selector */
  selector: string;
  /** Element role if any */
  role?: string;
  /** Element aria-label if any */
  ariaLabel?: string;
  /** Whether element is visible */
  visible: boolean;
  /** Whether element is enabled */
  enabled: boolean;
}

// ============================================================================
// Edge Function Types
// ============================================================================

export interface EdgeFunction {
  /** Function name (directory name) */
  name: string;
  /** Function path */
  path: string;
  /** Function endpoint URL */
  endpoint: string;
  /** HTTP methods supported */
  methods: string[];
  /** Whether function requires auth */
  requiresAuth: boolean;
  /** Function source code (for analysis) */
  sourceCode?: string;
  /** Detected request schema */
  requestSchema?: Record<string, unknown>;
  /** Detected response schema */
  responseSchema?: Record<string, unknown>;
}

export interface EdgeFunctionTestResult {
  /** Function name */
  name: string;
  /** Test timestamp */
  timestamp: Date;
  /** Whether function is reachable */
  reachable: boolean;
  /** HTTP status code */
  statusCode?: number;
  /** Response time in ms */
  responseTime?: number;
  /** Response body (truncated) */
  responseBody?: string;
  /** Error if any */
  error?: string;
  /** CORS headers present */
  corsHeaders?: Record<string, string>;
  /** Auth test result */
  authTest?: {
    withoutAuth: { status: number; error?: string };
    withAuth?: { status: number; error?: string };
  };
}

// ============================================================================
// Test Result Types
// ============================================================================

export interface TestResult {
  /** Test identifier */
  id: string;
  /** Test type */
  type: TestType;
  /** Test name/description */
  name: string;
  /** Test status */
  status: TestStatus;
  /** Page URL where test was run */
  url: string;
  /** Test duration in ms */
  duration: number;
  /** Error details if failed */
  error?: TestError;
  /** Screenshot path if captured */
  screenshotPath?: string;
  /** Additional test data */
  data?: Record<string, unknown>;
  /** Timestamp */
  timestamp: Date;
  /** Retry count */
  retryCount: number;
}

export type TestType =
  | 'page-load'
  | 'navigation'
  | 'form-submission'
  | 'form-validation'
  | 'button-click'
  | 'link-click'
  | 'element-visibility'
  | 'element-interaction'
  | 'console-error'
  | 'network-error'
  | 'accessibility'
  | 'performance'
  | 'edge-function'
  | 'api-call'
  | 'authentication'
  | 'custom';

export type TestStatus = 'passed' | 'failed' | 'skipped' | 'warning' | 'error';

export interface TestError {
  /** Error message */
  message: string;
  /** Error stack trace */
  stack?: string;
  /** Error code if applicable */
  code?: string;
  /** Selector that caused error */
  selector?: string;
  /** Expected value */
  expected?: unknown;
  /** Actual value */
  actual?: unknown;
  /** Error type classification */
  classification: ErrorClassification;
}

export type ErrorClassification =
  | 'critical'      // App crash, white screen
  | 'functional'    // Feature doesn't work
  | 'visual'        // UI issue
  | 'performance'   // Slow response
  | 'accessibility' // A11y violation
  | 'network'       // Network/API error
  | 'validation'    // Form validation error
  | 'console'       // Console error
  | 'unknown';

// ============================================================================
// Console & Network Monitor Types
// ============================================================================

export interface ConsoleEntry {
  /** Message type */
  type: 'log' | 'warn' | 'error' | 'info' | 'debug';
  /** Message text */
  text: string;
  /** URL where message occurred */
  url: string;
  /** Timestamp */
  timestamp: Date;
  /** Location in source */
  location?: {
    url: string;
    lineNumber: number;
    columnNumber: number;
  };
  /** Whether this is a critical error */
  isCritical: boolean;
  /** Error stack if available */
  stack?: string;
}

export interface NetworkRequest {
  /** Request URL */
  url: string;
  /** HTTP method */
  method: string;
  /** Request headers */
  headers: Record<string, string>;
  /** Request body */
  body?: string;
  /** Response status */
  status?: number;
  /** Response headers */
  responseHeaders?: Record<string, string>;
  /** Response body (truncated) */
  responseBody?: string;
  /** Request timing */
  timing?: {
    startTime: number;
    endTime: number;
    duration: number;
  };
  /** Resource type */
  resourceType: string;
  /** Whether request failed */
  failed: boolean;
  /** Failure reason */
  failureReason?: string;
  /** Page URL where request was made */
  pageUrl: string;
  /** Timestamp */
  timestamp: Date;
}

// ============================================================================
// Accessibility Types
// ============================================================================

export interface AccessibilityResult {
  /** Page URL */
  url: string;
  /** Violations found */
  violations: AccessibilityViolation[];
  /** Passing rules */
  passes: number;
  /** Incomplete checks */
  incomplete: number;
  /** Total elements checked */
  elementsChecked: number;
  /** Timestamp */
  timestamp: Date;
}

export interface AccessibilityViolation {
  /** Rule ID */
  id: string;
  /** Violation impact */
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  /** Rule description */
  description: string;
  /** Help text */
  help: string;
  /** Help URL */
  helpUrl: string;
  /** Affected elements */
  nodes: {
    html: string;
    target: string[];
    failureSummary?: string;
  }[];
  /** WCAG tags */
  tags: string[];
}

// ============================================================================
// Performance Types
// ============================================================================

export interface PerformanceResult {
  /** Page URL */
  url: string;
  /** Core Web Vitals */
  webVitals: {
    /** Largest Contentful Paint (ms) */
    lcp?: number;
    /** First Input Delay (ms) */
    fid?: number;
    /** Cumulative Layout Shift */
    cls?: number;
    /** First Contentful Paint (ms) */
    fcp?: number;
    /** Time to First Byte (ms) */
    ttfb?: number;
    /** Time to Interactive (ms) */
    tti?: number;
  };
  /** Navigation timing */
  navigation: {
    domContentLoaded: number;
    loadComplete: number;
    domInteractive: number;
  };
  /** Resource metrics */
  resources: {
    totalSize: number;
    totalCount: number;
    byType: Record<string, { count: number; size: number }>;
  };
  /** Memory usage */
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
  };
  /** Timestamp */
  timestamp: Date;
}

// ============================================================================
// Report Types
// ============================================================================

export interface TestReport {
  /** Report metadata */
  meta: ReportMeta;
  /** Summary statistics */
  summary: ReportSummary;
  /** Pages tested */
  pages: PageTestReport[];
  /** Edge function results */
  edgeFunctions?: EdgeFunctionTestResult[];
  /** All console entries */
  consoleEntries: ConsoleEntry[];
  /** Failed network requests */
  failedNetworkRequests: NetworkRequest[];
  /** Accessibility results */
  accessibilityResults?: AccessibilityResult[];
  /** Performance results */
  performanceResults?: PerformanceResult[];
  /** All errors found */
  errors: CategorizedError[];
  /** Recommendations */
  recommendations: Recommendation[];
}

export interface ReportMeta {
  /** Report generation timestamp */
  generatedAt: Date;
  /** Test run duration */
  duration: number;
  /** Configuration used */
  config: Partial<TestConfig>;
  /** Application version if available */
  appVersion?: string;
  /** Environment info */
  environment: {
    browser: string;
    viewport: ViewportConfig;
    platform: string;
    nodeVersion: string;
  };
}

export interface ReportSummary {
  /** Total pages tested */
  totalPages: number;
  /** Total tests run */
  totalTests: number;
  /** Tests passed */
  passed: number;
  /** Tests failed */
  failed: number;
  /** Tests skipped */
  skipped: number;
  /** Tests with warnings */
  warnings: number;
  /** Pass rate percentage */
  passRate: number;
  /** Total errors found */
  totalErrors: number;
  /** Errors by classification */
  errorsByClassification: Record<ErrorClassification, number>;
  /** Errors by type */
  errorsByType: Record<TestType, number>;
  /** Average page load time */
  avgPageLoadTime: number;
  /** Pages with errors */
  pagesWithErrors: number;
  /** Edge functions tested */
  edgeFunctionsTested?: number;
  /** Edge functions passing */
  edgeFunctionsPassing?: number;
}

export interface PageTestReport {
  /** Page URL */
  url: string;
  /** Page title */
  title: string;
  /** Page load time */
  loadTime: number;
  /** Tests run on this page */
  tests: TestResult[];
  /** Screenshot path */
  screenshotPath?: string;
  /** Console entries for this page */
  consoleEntries: ConsoleEntry[];
  /** Network requests for this page */
  networkRequests: NetworkRequest[];
  /** Performance metrics */
  performance?: PerformanceResult;
  /** Accessibility results */
  accessibility?: AccessibilityResult;
}

export interface CategorizedError {
  /** Error classification */
  classification: ErrorClassification;
  /** Error severity (1-5, 1 being most severe) */
  severity: number;
  /** Error message */
  message: string;
  /** Page URL where error occurred */
  url: string;
  /** Stack trace if available */
  stack?: string;
  /** Selector if applicable */
  selector?: string;
  /** Test that found this error */
  testId?: string;
  /** Timestamp */
  timestamp: Date;
  /** Number of occurrences */
  occurrences: number;
  /** Related errors (same root cause) */
  relatedErrors?: string[];
}

export interface Recommendation {
  /** Recommendation type */
  type: 'critical' | 'high' | 'medium' | 'low';
  /** Category */
  category: 'functionality' | 'performance' | 'accessibility' | 'security' | 'seo';
  /** Title */
  title: string;
  /** Description */
  description: string;
  /** Affected pages */
  affectedPages: string[];
  /** Suggested fix */
  suggestedFix?: string;
  /** Related error IDs */
  relatedErrors?: string[];
}

// ============================================================================
// Hook Analysis Types (Static Analysis)
// ============================================================================

export interface HookAnalysis {
  /** Hook name */
  name: string;
  /** File where hook is defined */
  file: string;
  /** Line number */
  lineNumber: number;
  /** Hook type */
  type: 'useState' | 'useEffect' | 'useCallback' | 'useMemo' | 'useRef' | 'useContext' | 'custom';
  /** Dependencies if applicable */
  dependencies?: string[];
  /** Potential issues found */
  issues: HookIssue[];
}

export interface HookIssue {
  /** Issue type */
  type: 'missing-dependency' | 'unnecessary-dependency' | 'infinite-loop-risk' | 'memory-leak' | 'stale-closure';
  /** Issue description */
  description: string;
  /** Severity */
  severity: 'error' | 'warning' | 'info';
  /** Suggested fix */
  suggestedFix?: string;
}

// ============================================================================
// Event Types
// ============================================================================

export interface TestEvent {
  type: 'test-start' | 'test-end' | 'page-start' | 'page-end' | 'error' | 'warning' | 'info';
  timestamp: Date;
  data: Record<string, unknown>;
}

export type TestEventHandler = (event: TestEvent) => void | Promise<void>;

// ============================================================================
// Plugin Types (for extensibility)
// ============================================================================

export interface TestPlugin {
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Hook called before test run starts */
  beforeRun?: (config: TestConfig) => Promise<void>;
  /** Hook called after test run ends */
  afterRun?: (report: TestReport) => Promise<void>;
  /** Hook called before each page test */
  beforePage?: (url: string) => Promise<void>;
  /** Hook called after each page test */
  afterPage?: (pageReport: PageTestReport) => Promise<void>;
  /** Custom testers to run */
  testers?: CustomTester[];
}

export interface CustomTester {
  /** Tester name */
  name: string;
  /** Test type for categorization */
  type: TestType;
  /** Test implementation */
  test: (page: unknown, config: TestConfig) => Promise<TestResult[]>;
}
