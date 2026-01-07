# Automated Testing Tool

A comprehensive, dynamic testing framework that crawls web applications and tests all functionality including pages, forms, buttons, links, edge functions, accessibility, and performance.

## Features

- **Dynamic Page Discovery**: Automatically crawls and discovers all pages in your application
- **Route Analysis**: Statically analyzes route files to find all defined routes
- **Form Testing**: Tests form visibility, field interactions, validation, and submission
- **Button & Link Testing**: Tests all interactive elements for functionality
- **Edge Function Testing**: Tests Supabase Edge Functions for availability and CORS
- **Accessibility Testing**: WCAG-based accessibility audits
- **Performance Testing**: Core Web Vitals and performance metrics
- **Console Monitoring**: Captures and categorizes JavaScript errors
- **Network Monitoring**: Tracks failed requests and slow responses
- **Multi-Format Reports**: Generates HTML, JSON, and Markdown reports

## Quick Start

### CLI Usage

```bash
# Install dependencies if not already installed
npm install playwright

# Run a smoke test
npx ts-node src/tools/automated-testing/cli.ts --url http://localhost:8080

# Run a full test
npx ts-node src/tools/automated-testing/cli.ts --url http://localhost:8080 --preset full

# Custom configuration
npx ts-node src/tools/automated-testing/cli.ts --url http://localhost:8080 --depth deep --max-pages 100
```

### Programmatic Usage

```typescript
import { TestOrchestrator, createTester, runSmokeTest, runFullTest } from './tools/automated-testing';

// Quick smoke test
const report = await runSmokeTest('http://localhost:8080');

// Full test with preset
const tester = createTester('full', {
  baseUrl: 'http://localhost:8080',
});
const report = await tester.run();

// Custom configuration
const orchestrator = new TestOrchestrator({
  baseUrl: 'http://localhost:8080',
  depth: 'deep',
  maxPages: 100,
  accessibilityTesting: true,
  performanceTesting: true,
  edgeFunctionTesting: true,
});
const report = await orchestrator.run();
```

## Configuration

### Test Presets

| Preset | Description | Pages | Features |
|--------|-------------|-------|----------|
| `smoke` | Quick smoke test | 20 | Basic functionality only |
| `standard` | Balanced coverage | 50 | All features |
| `full` | Comprehensive | Unlimited | All features + video |
| `mobile` | Mobile testing | 50 | Mobile viewport |
| `accessibility` | A11y audit | Unlimited | Accessibility focus |
| `performance` | Perf audit | 50 | Performance focus |
| `api` | API testing | 5 | Edge functions only |
| `ci` | CI/CD optimized | 30 | Parallel, retries |

### Configuration Options

```typescript
interface TestConfig {
  // Base URL of the application
  baseUrl: string;

  // Routes directory for static analysis
  routesDir?: string;

  // Edge functions directory
  edgeFunctionsDir?: string;

  // Test timeout (ms)
  timeout: number; // default: 30000

  // Number of retries
  retries: number; // default: 2

  // Run headless
  headless: boolean; // default: true

  // Browser: chromium, firefox, webkit
  browser: 'chromium' | 'firefox' | 'webkit';

  // Viewport configuration
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor?: number;
    isMobile?: boolean;
  };

  // Authentication configuration
  auth?: {
    loginUrl: string;
    usernameSelector: string;
    passwordSelector: string;
    submitSelector: string;
    credentials: {
      username: string;
      password: string;
    };
  };

  // URL patterns to exclude
  excludePatterns: string[];

  // URL patterns to include (if specified)
  includePatterns: string[];

  // Enable screenshots
  screenshots: boolean;

  // Enable video recording
  video: boolean;

  // Output directory
  outputDir: string;

  // Test depth: shallow, medium, deep
  depth: 'shallow' | 'medium' | 'deep';

  // Max pages to crawl (0 = unlimited)
  maxPages: number;

  // Delay between navigations (ms)
  navigationDelay: number;

  // Enable accessibility testing
  accessibilityTesting: boolean;

  // Enable performance testing
  performanceTesting: boolean;

  // Enable edge function testing
  edgeFunctionTesting: boolean;

  // Enable console monitoring
  consoleMonitoring: boolean;

  // Enable network monitoring
  networkMonitoring: boolean;
}
```

## Test Depth Levels

### Shallow
- Page load verification
- Link checking
- Basic navigation

### Medium (Default)
- All shallow tests
- Form field interactions
- Button functionality
- Performance metrics
- Accessibility checks

### Deep
- All medium tests
- Form validation testing
- Full element interactions
- Comprehensive accessibility audit
- Detailed performance analysis

## Report Output

Reports are generated in the output directory (default: `./test-reports/automated`):

```
test-reports/automated/
├── test-report-2024-01-15T10-30-00.html    # Interactive HTML report
├── test-report-2024-01-15T10-30-00.json    # Machine-readable JSON
├── test-report-2024-01-15T10-30-00.md      # Markdown summary
└── screenshots/                             # Page screenshots
```

### HTML Report Features
- Overall test summary with pass rate
- Recommendations sorted by priority
- Categorized errors with stack traces
- Page-by-page test results
- Edge function status
- Interactive collapsible sections

## Architecture

```
src/tools/automated-testing/
├── index.ts              # Main entry point
├── cli.ts                # Command-line interface
├── types.ts              # TypeScript type definitions
├── config.ts             # Configuration & presets
├── core/
│   └── orchestrator.ts   # Test orchestrator
├── crawlers/
│   ├── page-crawler.ts   # Dynamic page discovery
│   └── route-analyzer.ts # Static route analysis
├── testers/
│   ├── form-tester.ts    # Form testing
│   ├── element-tester.ts # Button/link testing
│   ├── edge-function-tester.ts
│   ├── performance-tester.ts
│   └── accessibility-tester.ts
├── monitors/
│   ├── console-monitor.ts # Console error tracking
│   └── network-monitor.ts # Network request monitoring
├── reporters/
│   └── report-generator.ts # Report generation
└── utils/
    ├── logger.ts         # Logging utility
    └── helpers.ts        # Helper functions
```

## Extending the Tool

### Custom Testers

```typescript
import type { Page } from 'playwright';
import type { TestConfig, TestResult } from './types';

class CustomTester {
  constructor(private config: TestConfig) {}

  async test(page: Page, url: string): Promise<TestResult[]> {
    // Your custom test logic
    return [{
      id: 'custom-test-1',
      type: 'custom',
      name: 'Custom Test',
      status: 'passed',
      url,
      duration: 0,
      timestamp: new Date(),
      retryCount: 0,
    }];
  }
}
```

### Platform-Specific Configuration

```typescript
import { createPlatformConfig, TestOrchestrator } from './tools/automated-testing';

// Pre-configured for BuildDesk
const config = createPlatformConfig('builddesk', {
  maxPages: 100,
});

const tester = new TestOrchestrator(config);
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Automated Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Start dev server
        run: npm run dev &

      - name: Wait for server
        run: npx wait-on http://localhost:8080

      - name: Run automated tests
        run: npx ts-node src/tools/automated-testing/cli.ts --url http://localhost:8080 --preset ci

      - name: Upload test reports
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-reports
          path: test-reports/automated/
```

## Error Classification

The tool categorizes errors by severity:

| Classification | Severity | Description |
|---------------|----------|-------------|
| `critical` | 1 | App crashes, white screens |
| `functional` | 2 | Feature doesn't work |
| `network` | 2 | API/network errors |
| `accessibility` | 3 | A11y violations |
| `performance` | 3 | Slow responses |
| `validation` | 3 | Form validation issues |
| `visual` | 4 | UI display issues |
| `console` | 4 | JavaScript console errors |
| `unknown` | 5 | Uncategorized errors |

## Performance Thresholds

Based on Google's Core Web Vitals:

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | < 2.5s | 2.5s - 4s | > 4s |
| FID | < 100ms | 100ms - 300ms | > 300ms |
| CLS | < 0.1 | 0.1 - 0.25 | > 0.25 |
| FCP | < 1.8s | 1.8s - 3s | > 3s |
| TTFB | < 800ms | 800ms - 1.8s | > 1.8s |

## Accessibility Rules

The tool checks for common WCAG violations:

- Document title present
- HTML lang attribute
- Image alt text
- Button accessible names
- Link accessible names
- Form input labels
- Heading order
- Color contrast (basic)
- Focus visible indicators
- Landmark regions

## Troubleshooting

### Common Issues

**Tests timing out:**
- Increase `timeout` configuration
- Add `navigationDelay` between pages
- Reduce `maxPages` for initial testing

**Browser not launching:**
- Ensure Playwright is installed: `npx playwright install`
- Try different browser: `--browser firefox`

**No pages discovered:**
- Check `baseUrl` is accessible
- Verify `routesDir` path is correct
- Check `excludePatterns` aren't too broad

**Edge functions failing:**
- Verify `SUPABASE_URL` environment variable
- Check function endpoints are accessible
- Ensure CORS headers are configured

## License

Part of the BuildDesk platform. For internal use.

## Contributing

1. Add new testers in the `testers/` directory
2. Follow the existing patterns for consistency
3. Add tests for new functionality
4. Update this README with new features
