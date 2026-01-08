#!/usr/bin/env node
/**
 * Automated Testing Tool - CLI
 *
 * Command-line interface for running automated tests.
 *
 * Usage:
 *   npx tsx src/tools/automated-testing/cli.ts [options]
 *
 * Options:
 *   --url, -u          Base URL to test (required)
 *   --preset, -p       Test preset: smoke, standard, full, mobile, accessibility, performance, api, ci
 *   --depth, -d        Test depth: shallow, medium, deep
 *   --max-pages, -m    Maximum pages to test (0 = unlimited)
 *   --output, -o       Output directory for reports
 *   --browser, -b      Browser: chromium, firefox, webkit
 *   --headed           Run in headed mode (visible browser)
 *   --no-screenshots   Disable screenshots
 *   --no-a11y          Disable accessibility testing
 *   --no-perf          Disable performance testing
 *   --no-edge          Disable edge function testing
 *   --help, -h         Show help
 *
 * Examples:
 *   npx tsx cli.ts --url http://localhost:8080
 *   npx tsx cli.ts --url http://localhost:8080 --preset full
 *   npx tsx cli.ts --url http://localhost:8080 --depth deep --max-pages 100
 */

import { TestOrchestrator, createTester, getPreset, DEFAULT_CONFIG } from './index';
import type { TestConfig } from './types';

// ============================================================================
// Argument Parsing
// ============================================================================

interface CliArgs {
  url?: string;
  preset?: string;
  depth?: string;
  maxPages?: number;
  output?: string;
  browser?: string;
  headed?: boolean;
  screenshots?: boolean;
  accessibility?: boolean;
  performance?: boolean;
  edgeFunctions?: boolean;
  help?: boolean;
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {
    screenshots: true,
    accessibility: true,
    performance: true,
    edgeFunctions: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--url':
      case '-u':
        result.url = nextArg;
        i++;
        break;
      case '--preset':
      case '-p':
        result.preset = nextArg;
        i++;
        break;
      case '--depth':
      case '-d':
        result.depth = nextArg;
        i++;
        break;
      case '--max-pages':
      case '-m':
        result.maxPages = parseInt(nextArg, 10);
        i++;
        break;
      case '--output':
      case '-o':
        result.output = nextArg;
        i++;
        break;
      case '--browser':
      case '-b':
        result.browser = nextArg;
        i++;
        break;
      case '--headed':
        result.headed = true;
        break;
      case '--no-screenshots':
        result.screenshots = false;
        break;
      case '--no-a11y':
        result.accessibility = false;
        break;
      case '--no-perf':
        result.performance = false;
        break;
      case '--no-edge':
        result.edgeFunctions = false;
        break;
      case '--help':
      case '-h':
        result.help = true;
        break;
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║          AUTOMATED TESTING TOOL - Command Line Interface          ║
╚═══════════════════════════════════════════════════════════════════╝

USAGE:
  npx tsx src/tools/automated-testing/cli.ts [options]

REQUIRED OPTIONS:
  --url, -u <url>        Base URL to test

OPTIONAL OPTIONS:
  --preset, -p <preset>  Test preset:
                         • smoke       - Quick smoke test (20 pages, no a11y/perf)
                         • standard    - Balanced coverage (50 pages)
                         • full        - Comprehensive (unlimited, all features)
                         • mobile      - Mobile-focused testing
                         • accessibility - A11y-focused testing
                         • performance - Performance-focused testing
                         • api         - Edge function testing only
                         • ci          - Optimized for CI/CD pipelines

  --depth, -d <depth>    Test depth: shallow, medium, deep
  --max-pages, -m <num>  Maximum pages to test (0 = unlimited)
  --output, -o <dir>     Output directory for reports
  --browser, -b <name>   Browser: chromium, firefox, webkit
  --headed               Run in headed mode (visible browser)
  --no-screenshots       Disable screenshots
  --no-a11y              Disable accessibility testing
  --no-perf              Disable performance testing
  --no-edge              Disable edge function testing
  --help, -h             Show this help message

EXAMPLES:
  # Quick smoke test
  npx tsx cli.ts --url http://localhost:8080

  # Full test with all features
  npx tsx cli.ts --url http://localhost:8080 --preset full

  # Custom configuration
  npx tsx cli.ts --url http://localhost:8080 --depth deep --max-pages 100

  # Mobile testing
  npx tsx cli.ts --url http://localhost:8080 --preset mobile

  # CI/CD pipeline
  npx tsx cli.ts --url http://localhost:8080 --preset ci

  # Performance audit only
  npx tsx cli.ts --url http://localhost:8080 --preset performance --no-a11y

OUTPUT:
  Reports are generated in multiple formats:
  • HTML  - Interactive visual report
  • JSON  - Machine-readable data
  • MD    - Markdown summary

  Default output directory: ./test-reports/automated

For more information, see the README.md in the automated-testing directory.
`);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (!args.url) {
    console.error('Error: --url is required');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  // Build configuration
  let config: Partial<TestConfig> = {};

  // Apply preset if specified (first, so it can be overridden)
  if (args.preset) {
    const preset = args.preset as keyof typeof import('./config').PRESETS;
    config = getPreset(preset);
  }

  // Override with user-specified URL (takes precedence)
  if (args.url) {
    config.baseUrl = args.url;
  }

  // Apply overrides
  if (args.depth) {
    config.depth = args.depth as TestConfig['depth'];
  }
  if (args.maxPages !== undefined) {
    config.maxPages = args.maxPages;
  }
  if (args.output) {
    config.outputDir = args.output;
  }
  if (args.browser) {
    config.browser = args.browser as TestConfig['browser'];
  }
  if (args.headed) {
    config.headless = false;
  }
  if (!args.screenshots) {
    config.screenshots = false;
  }
  if (!args.accessibility) {
    config.accessibilityTesting = false;
  }
  if (!args.performance) {
    config.performanceTesting = false;
  }
  if (!args.edgeFunctions) {
    config.edgeFunctionTesting = false;
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                    AUTOMATED TESTING TOOL                         ║
╚═══════════════════════════════════════════════════════════════════╝
`);

  try {
    const orchestrator = new TestOrchestrator(config);
    const report = await orchestrator.run();

    // Exit with appropriate code
    const failureRate = (report.summary.failed / report.summary.totalTests) * 100;
    if (failureRate > 20) {
      console.error(`\n❌ Test run failed with ${failureRate.toFixed(1)}% failure rate`);
      process.exit(1);
    } else if (failureRate > 0) {
      console.warn(`\n⚠️ Test run completed with ${failureRate.toFixed(1)}% failure rate`);
      process.exit(0);
    } else {
      console.log(`\n✅ Test run completed successfully!`);
      process.exit(0);
    }
  } catch (error) {
    console.error(`\n❌ Test run failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

// Run if executed directly
main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

export { parseArgs, showHelp };
