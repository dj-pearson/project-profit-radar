/**
 * Automated Testing Tool - Watch Mode
 *
 * Monitors file changes and automatically re-runs relevant tests.
 * Supports intelligent test selection based on changed files.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { TestConfig, TestResult, PageTestReport } from '../types';
import { Logger } from '../utils/logger';
import { debounce } from '../utils/helpers';

// ============================================================================
// Types
// ============================================================================

export interface WatchConfig {
  /** Directories to watch */
  watchDirs: string[];
  /** File extensions to watch */
  extensions: string[];
  /** Debounce delay (ms) */
  debounceMs: number;
  /** Patterns to ignore */
  ignorePatterns: string[];
  /** Run all tests on start */
  runOnStart: boolean;
  /** Clear console on re-run */
  clearConsole: boolean;
  /** Show file change notifications */
  showChanges: boolean;
  /** Enable smart test selection */
  smartSelection: boolean;
}

export interface FileChange {
  type: 'add' | 'change' | 'unlink';
  path: string;
  timestamp: Date;
}

export interface WatchSession {
  /** Session ID */
  id: string;
  /** Start time */
  startTime: Date;
  /** Files changed */
  changesDetected: number;
  /** Test runs */
  testRuns: number;
  /** Total tests executed */
  totalTests: number;
  /** Tests passed */
  passed: number;
  /** Tests failed */
  failed: number;
}

type TestRunner = () => Promise<PageTestReport[]>;

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_WATCH_CONFIG: WatchConfig = {
  watchDirs: ['./src'],
  extensions: ['.ts', '.tsx', '.js', '.jsx', '.css', '.html'],
  debounceMs: 300,
  ignorePatterns: ['node_modules', '.git', 'dist', 'build', 'test-results'],
  runOnStart: true,
  clearConsole: true,
  showChanges: true,
  smartSelection: true,
};

// ============================================================================
// Watch Mode
// ============================================================================

export class WatchMode {
  private logger: Logger;
  private config: WatchConfig;
  private testConfig: TestConfig;
  private watchers: fs.FSWatcher[] = [];
  private isRunning: boolean = false;
  private pendingChanges: FileChange[] = [];
  private testRunner?: TestRunner;
  private session: WatchSession;
  private debouncedRunTests: () => void;

  constructor(testConfig: TestConfig, watchConfig: Partial<WatchConfig> = {}, logger?: Logger) {
    this.testConfig = testConfig;
    this.config = { ...DEFAULT_WATCH_CONFIG, ...watchConfig };
    this.logger = logger || new Logger({ context: 'WatchMode' });

    this.session = {
      id: Date.now().toString(36),
      startTime: new Date(),
      changesDetected: 0,
      testRuns: 0,
      totalTests: 0,
      passed: 0,
      failed: 0,
    };

    this.debouncedRunTests = debounce(() => this.runTests(), this.config.debounceMs);
  }

  /**
   * Set the test runner function
   */
  setTestRunner(runner: TestRunner): void {
    this.testRunner = runner;
  }

  /**
   * Start watching for file changes
   */
  async start(): Promise<void> {
    this.isRunning = true;

    this.logger.info('Starting watch mode...');
    this.logger.info(`Watching: ${this.config.watchDirs.join(', ')}`);
    this.logger.info(`Extensions: ${this.config.extensions.join(', ')}`);
    this.logger.info('');

    // Set up file watchers
    for (const dir of this.config.watchDirs) {
      this.setupWatcher(dir);
    }

    // Run tests on start if configured
    if (this.config.runOnStart) {
      await this.runTests();
    }

    this.printHelp();
  }

  /**
   * Stop watching
   */
  stop(): void {
    this.isRunning = false;

    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];

    this.logger.info('Watch mode stopped');
    this.printSummary();
  }

  /**
   * Set up a file watcher for a directory
   */
  private setupWatcher(dir: string): void {
    const absoluteDir = path.resolve(dir);

    if (!fs.existsSync(absoluteDir)) {
      this.logger.warn(`Directory not found: ${absoluteDir}`);
      return;
    }

    try {
      const watcher = fs.watch(
        absoluteDir,
        { recursive: true },
        (eventType, filename) => {
          if (!filename || !this.isRunning) return;

          const filePath = path.join(absoluteDir, filename);

          // Check if file should be ignored
          if (this.shouldIgnore(filePath)) {
            return;
          }

          // Check extension
          const ext = path.extname(filename);
          if (!this.config.extensions.includes(ext)) {
            return;
          }

          // Record change
          const change: FileChange = {
            type: eventType === 'rename' ? 'add' : 'change',
            path: filePath,
            timestamp: new Date(),
          };

          this.pendingChanges.push(change);
          this.session.changesDetected++;

          if (this.config.showChanges) {
            this.logger.debug(`Changed: ${filename}`);
          }

          // Debounced test run
          this.debouncedRunTests();
        }
      );

      this.watchers.push(watcher);
      this.logger.debug(`Watching: ${absoluteDir}`);
    } catch (error) {
      this.logger.error(`Failed to watch ${absoluteDir}: ${(error as Error).message}`);
    }
  }

  /**
   * Check if a file should be ignored
   */
  private shouldIgnore(filePath: string): boolean {
    return this.config.ignorePatterns.some((pattern) => filePath.includes(pattern));
  }

  /**
   * Run tests
   */
  private async runTests(): Promise<void> {
    if (!this.testRunner) {
      this.logger.warn('No test runner configured');
      return;
    }

    const changes = [...this.pendingChanges];
    this.pendingChanges = [];

    if (this.config.clearConsole) {
      console.clear();
    }

    this.logger.info('Running tests...');
    this.session.testRuns++;

    // Log changed files
    if (changes.length > 0 && this.config.showChanges) {
      this.logger.info('Changed files:');
      for (const change of changes.slice(0, 5)) {
        console.log(`  ${change.type === 'add' ? '+' : '○'} ${path.basename(change.path)}`);
      }
      if (changes.length > 5) {
        console.log(`  ... and ${changes.length - 5} more`);
      }
      console.log('');
    }

    try {
      const startTime = Date.now();
      const reports = await this.testRunner();

      // Calculate results
      let passed = 0;
      let failed = 0;
      let total = 0;

      for (const report of reports) {
        for (const test of report.tests) {
          total++;
          if (test.status === 'passed') {
            passed++;
          } else if (test.status === 'failed' || test.status === 'error') {
            failed++;
          }
        }
      }

      this.session.totalTests += total;
      this.session.passed += passed;
      this.session.failed += failed;

      const duration = Date.now() - startTime;

      console.log('');
      if (failed === 0) {
        this.logger.success(`All ${passed} tests passed (${Math.round(duration / 1000)}s)`);
      } else {
        this.logger.error(`${failed} of ${total} tests failed (${Math.round(duration / 1000)}s)`);
      }

      // Show failed tests
      if (failed > 0) {
        console.log('');
        this.logger.warn('Failed tests:');
        for (const report of reports) {
          for (const test of report.tests) {
            if (test.status === 'failed' || test.status === 'error') {
              console.log(`  ✗ ${test.name}`);
              if (test.error?.message) {
                console.log(`    ${test.error.message}`);
              }
            }
          }
        }
      }

      console.log('');
      this.printWaiting();
    } catch (error) {
      this.logger.error(`Test run failed: ${(error as Error).message}`);
      this.printWaiting();
    }
  }

  /**
   * Run tests for specific files
   */
  getAffectedTests(changes: FileChange[]): string[] {
    if (!this.config.smartSelection) {
      return []; // Run all tests
    }

    const affectedPatterns: string[] = [];

    for (const change of changes) {
      const filename = path.basename(change.path, path.extname(change.path));

      // Match test files by component/module name
      affectedPatterns.push(filename);

      // Check for related files
      // e.g., UserForm.tsx -> test UserForm-related pages
      if (filename.includes('Form')) {
        affectedPatterns.push('form');
      }
      if (filename.includes('Button') || filename.includes('Btn')) {
        affectedPatterns.push('button');
      }
      if (filename.includes('Auth') || filename.includes('Login')) {
        affectedPatterns.push('auth');
      }
    }

    return [...new Set(affectedPatterns)];
  }

  /**
   * Print waiting message
   */
  private printWaiting(): void {
    console.log('Watching for file changes...');
    console.log('Press Ctrl+C to stop');
  }

  /**
   * Print help
   */
  private printHelp(): void {
    console.log('');
    console.log('Watch Mode Commands:');
    console.log('  Ctrl+C  - Stop watching and exit');
    console.log('  r       - Re-run all tests');
    console.log('  q       - Quit');
    console.log('');
    this.printWaiting();

    // Set up keyboard input
    this.setupKeyboardInput();
  }

  /**
   * Set up keyboard input handling
   */
  private setupKeyboardInput(): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      process.stdin.on('data', (key: string) => {
        if (key === '\u0003') {
          // Ctrl+C
          this.stop();
          process.exit(0);
        } else if (key === 'r') {
          this.runTests();
        } else if (key === 'q') {
          this.stop();
          process.exit(0);
        }
      });
    }
  }

  /**
   * Print session summary
   */
  private printSummary(): void {
    const duration = Date.now() - this.session.startTime.getTime();
    const minutes = Math.floor(duration / 60000);

    console.log('');
    console.log('Watch Mode Summary');
    console.log('==================');
    console.log(`Duration: ${minutes} minutes`);
    console.log(`Changes detected: ${this.session.changesDetected}`);
    console.log(`Test runs: ${this.session.testRuns}`);
    console.log(`Total tests: ${this.session.totalTests}`);
    console.log(`Passed: ${this.session.passed}`);
    console.log(`Failed: ${this.session.failed}`);
    console.log('');
  }

  /**
   * Get session info
   */
  getSession(): WatchSession {
    return this.session;
  }

  /**
   * Check if running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create watch mode instance
 */
export function createWatchMode(
  testConfig: TestConfig,
  watchConfig?: Partial<WatchConfig>,
  logger?: Logger
): WatchMode {
  return new WatchMode(testConfig, watchConfig, logger);
}

// ============================================================================
// Export
// ============================================================================

export default WatchMode;
