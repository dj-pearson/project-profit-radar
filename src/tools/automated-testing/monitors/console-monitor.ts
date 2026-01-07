/**
 * Automated Testing Tool - Console Monitor
 *
 * Monitors browser console for errors, warnings, and other messages.
 */

import type { Page, ConsoleMessage } from 'playwright';
import type { ConsoleEntry, TestResult } from '../types';
import { Logger } from '../utils/logger';
import { generateId, classifyError } from '../utils/helpers';
import { shouldIgnoreConsoleError, IGNORED_CONSOLE_ERRORS } from '../config';

// ============================================================================
// Console Monitor
// ============================================================================

export class ConsoleMonitor {
  private logger: Logger;
  private entries: ConsoleEntry[] = [];
  private currentUrl: string = '';
  private isAttached: boolean = false;
  private pageListeners: Map<Page, (msg: ConsoleMessage) => void> = new Map();

  constructor(logger?: Logger) {
    this.logger = logger || new Logger({ context: 'ConsoleMonitor' });
  }

  /**
   * Attach to a page to monitor console messages
   */
  attach(page: Page): void {
    if (this.pageListeners.has(page)) {
      return; // Already attached
    }

    const handler = (msg: ConsoleMessage) => {
      this.handleConsoleMessage(msg);
    };

    page.on('console', handler);
    this.pageListeners.set(page, handler);
    this.isAttached = true;

    this.logger.debug('Console monitor attached');
  }

  /**
   * Detach from a page
   */
  detach(page: Page): void {
    const handler = this.pageListeners.get(page);
    if (handler) {
      page.off('console', handler);
      this.pageListeners.delete(page);
    }

    if (this.pageListeners.size === 0) {
      this.isAttached = false;
    }
  }

  /**
   * Set the current URL being monitored
   */
  setCurrentUrl(url: string): void {
    this.currentUrl = url;
  }

  /**
   * Handle a console message
   */
  private handleConsoleMessage(msg: ConsoleMessage): void {
    const type = msg.type() as ConsoleEntry['type'];
    const text = msg.text();

    // Check if this should be ignored
    if (type === 'error' && shouldIgnoreConsoleError(text)) {
      return;
    }

    const location = msg.location();
    const isCritical = type === 'error' && !this.isKnownNonCriticalError(text);

    const entry: ConsoleEntry = {
      type,
      text,
      url: this.currentUrl,
      timestamp: new Date(),
      location: {
        url: location.url,
        lineNumber: location.lineNumber,
        columnNumber: location.columnNumber,
      },
      isCritical,
    };

    // Try to get stack trace for errors
    if (type === 'error') {
      const args = msg.args();
      if (args.length > 0) {
        args[0].jsonValue().then((value) => {
          if (typeof value === 'object' && value?.stack) {
            entry.stack = value.stack;
          }
        }).catch(() => {
          // Ignore errors getting stack trace
        });
      }
    }

    this.entries.push(entry);

    // Log critical errors
    if (isCritical) {
      this.logger.debug(`Console error: ${text.substring(0, 100)}`);
    }
  }

  /**
   * Check if error is known to be non-critical
   */
  private isKnownNonCriticalError(text: string): boolean {
    return IGNORED_CONSOLE_ERRORS.some((pattern) =>
      text.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Get all console entries
   */
  getEntries(): ConsoleEntry[] {
    return [...this.entries];
  }

  /**
   * Get entries for a specific URL
   */
  getEntriesForUrl(url: string): ConsoleEntry[] {
    return this.entries.filter((e) => e.url === url);
  }

  /**
   * Get error entries only
   */
  getErrors(): ConsoleEntry[] {
    return this.entries.filter((e) => e.type === 'error');
  }

  /**
   * Get critical errors only
   */
  getCriticalErrors(): ConsoleEntry[] {
    return this.entries.filter((e) => e.isCritical);
  }

  /**
   * Generate test results from console entries
   */
  generateTestResults(): TestResult[] {
    const results: TestResult[] = [];
    const criticalErrors = this.getCriticalErrors();

    // Group errors by URL
    const errorsByUrl = new Map<string, ConsoleEntry[]>();
    for (const error of criticalErrors) {
      const existing = errorsByUrl.get(error.url) || [];
      existing.push(error);
      errorsByUrl.set(error.url, existing);
    }

    // Create test results for each URL with errors
    for (const [url, errors] of errorsByUrl) {
      results.push({
        id: generateId(),
        type: 'console-error',
        name: `Console errors on page`,
        status: 'failed',
        url,
        duration: 0,
        timestamp: new Date(),
        retryCount: 0,
        data: {
          errorCount: errors.length,
          errors: errors.slice(0, 5).map((e) => ({
            text: e.text.substring(0, 200),
            location: e.location,
          })),
        },
        error: {
          message: `${errors.length} console error(s) detected`,
          classification: 'console',
        },
      });
    }

    return results;
  }

  /**
   * Get summary of console entries
   */
  getSummary(): {
    total: number;
    errors: number;
    warnings: number;
    logs: number;
    criticalErrors: number;
    uniqueErrors: number;
  } {
    const errors = this.entries.filter((e) => e.type === 'error');
    const warnings = this.entries.filter((e) => e.type === 'warn');
    const logs = this.entries.filter((e) => e.type === 'log' || e.type === 'info');
    const criticalErrors = this.getCriticalErrors();

    // Count unique error messages
    const uniqueErrorMessages = new Set(errors.map((e) => e.text));

    return {
      total: this.entries.length,
      errors: errors.length,
      warnings: warnings.length,
      logs: logs.length,
      criticalErrors: criticalErrors.length,
      uniqueErrors: uniqueErrorMessages.size,
    };
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Clear entries for a specific URL
   */
  clearForUrl(url: string): void {
    this.entries = this.entries.filter((e) => e.url !== url);
  }
}

// ============================================================================
// Export
// ============================================================================

export default ConsoleMonitor;
