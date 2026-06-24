/**
 * Automated Testing Tool - Visual Regression Tester
 *
 * Captures screenshots and compares them against baselines to detect
 * visual regressions in the UI.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Page } from 'playwright';
import type { TestConfig, TestResult } from '../types';
import { Logger } from '../utils/logger';
import { generateId, ensureDir, toSafeFilename } from '../utils/helpers';

// ============================================================================
// Types
// ============================================================================

interface VisualTestResult {
  url: string;
  baselinePath?: string;
  currentPath: string;
  diffPath?: string;
  match: boolean;
  diffPercentage?: number;
  isNewBaseline: boolean;
}

interface VisualConfig {
  /** Directory to store baseline images */
  baselineDir: string;
  /** Directory to store current screenshots */
  currentDir: string;
  /** Directory to store diff images */
  diffDir: string;
  /** Threshold for pixel difference (0-1) */
  threshold: number;
  /** Whether to auto-update baselines */
  updateBaselines: boolean;
  /** Elements to hide before screenshot (privacy, ads, etc.) */
  hideSelectors: string[];
  /** Wait time before screenshot (ms) */
  waitBeforeScreenshot: number;
  /** Full page screenshot */
  fullPage: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_VISUAL_CONFIG: VisualConfig = {
  baselineDir: './test-reports/visual/baselines',
  currentDir: './test-reports/visual/current',
  diffDir: './test-reports/visual/diffs',
  threshold: 0.1, // 10% difference allowed
  updateBaselines: false,
  hideSelectors: [
    '[data-testid="timestamp"]',
    '.loading-spinner',
    '.skeleton',
    '[data-dynamic]',
  ],
  waitBeforeScreenshot: 500,
  fullPage: false,
};

// ============================================================================
// Visual Tester
// ============================================================================

export class VisualTester {
  private logger: Logger;
  private config: TestConfig;
  private visualConfig: VisualConfig;
  private results: VisualTestResult[] = [];

  constructor(config: TestConfig, visualConfig?: Partial<VisualConfig>, logger?: Logger) {
    this.config = config;
    this.visualConfig = { ...DEFAULT_VISUAL_CONFIG, ...visualConfig };
    this.logger = logger || new Logger({ context: 'VisualTester' });

    // Ensure directories exist
    ensureDir(this.visualConfig.baselineDir);
    ensureDir(this.visualConfig.currentDir);
    ensureDir(this.visualConfig.diffDir);
  }

  /**
   * Capture a screenshot and compare against baseline
   */
  async captureAndCompare(page: Page, name: string, url: string): Promise<TestResult> {
    const startTime = Date.now();
    const testId = generateId();
    const safeName = toSafeFilename(name);

    try {
      // Hide dynamic elements
      await this.hideDynamicElements(page);

      // Wait for stability
      await page.waitForTimeout(this.visualConfig.waitBeforeScreenshot);

      // Capture current screenshot
      const currentPath = path.join(this.visualConfig.currentDir, `${safeName}.png`);
      await page.screenshot({
        path: currentPath,
        fullPage: this.visualConfig.fullPage,
      });

      // Check for baseline
      const baselinePath = path.join(this.visualConfig.baselineDir, `${safeName}.png`);
      const hasBaseline = fs.existsSync(baselinePath);

      let visualResult: VisualTestResult;

      if (!hasBaseline) {
        // No baseline - create new one
        if (this.visualConfig.updateBaselines) {
          fs.copyFileSync(currentPath, baselinePath);
          this.logger.info(`Created new baseline: ${safeName}`);
        }

        visualResult = {
          url,
          baselinePath: undefined,
          currentPath,
          match: true,
          isNewBaseline: true,
        };

        return {
          id: testId,
          type: 'custom',
          name: `Visual: ${name}`,
          status: 'warning',
          url,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          retryCount: 0,
          data: {
            ...visualResult,
            message: 'No baseline exists - created new baseline',
          },
        };
      }

      // Compare with baseline
      const comparison = await this.compareImages(baselinePath, currentPath, safeName);
      const isMatch = comparison.diffPercentage <= this.visualConfig.threshold;

      visualResult = {
        url,
        baselinePath,
        currentPath,
        diffPath: comparison.diffPath,
        match: isMatch,
        diffPercentage: comparison.diffPercentage,
        isNewBaseline: false,
      };

      this.results.push(visualResult);

      if (isMatch) {
        return {
          id: testId,
          type: 'custom',
          name: `Visual: ${name}`,
          status: 'passed',
          url,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          retryCount: 0,
          data: {
            ...visualResult,
            message: `Visual match (${(comparison.diffPercentage * 100).toFixed(2)}% diff)`,
          },
        };
      } else {
        // Update baseline if configured
        if (this.visualConfig.updateBaselines) {
          fs.copyFileSync(currentPath, baselinePath);
          this.logger.info(`Updated baseline: ${safeName}`);
        }

        return {
          id: testId,
          type: 'custom',
          name: `Visual: ${name}`,
          status: 'failed',
          url,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          retryCount: 0,
          data: visualResult,
          error: {
            message: `Visual regression detected: ${(comparison.diffPercentage * 100).toFixed(2)}% difference`,
            classification: 'visual',
          },
        };
      }
    } catch (error) {
      return {
        id: testId,
        type: 'custom',
        name: `Visual: ${name}`,
        status: 'error',
        url,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        retryCount: 0,
        error: {
          message: (error as Error).message,
          classification: 'visual',
        },
      };
    }
  }

  /**
   * Hide dynamic elements before screenshot
   */
  private async hideDynamicElements(page: Page): Promise<void> {
    for (const selector of this.visualConfig.hideSelectors) {
      try {
        await page.evaluate((sel) => {
          const elements = document.querySelectorAll(sel);
          elements.forEach((el) => {
            (el as HTMLElement).style.visibility = 'hidden';
          });
        }, selector);
      } catch {
        // Element not found, skip
      }
    }
  }

  /**
   * Compare two images using pixel comparison
   * This is a simplified comparison - for production, use pixelmatch or similar
   */
  private async compareImages(
    baselinePath: string,
    currentPath: string,
    name: string
  ): Promise<{ diffPercentage: number; diffPath?: string }> {
    // Read file sizes as a simple proxy for difference
    // In production, use proper image comparison library
    const baselineStats = fs.statSync(baselinePath);
    const currentStats = fs.statSync(currentPath);

    // Simple size-based comparison (rough estimate)
    const sizeDiff = Math.abs(baselineStats.size - currentStats.size);
    const avgSize = (baselineStats.size + currentStats.size) / 2;
    const diffPercentage = sizeDiff / avgSize;

    // For a more accurate comparison, you would use pixelmatch:
    // const PNG = require('pngjs').PNG;
    // const pixelmatch = require('pixelmatch');
    // const img1 = PNG.sync.read(fs.readFileSync(baselinePath));
    // const img2 = PNG.sync.read(fs.readFileSync(currentPath));
    // const diff = new PNG({ width: img1.width, height: img1.height });
    // const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height);

    // Create diff image path (placeholder - would contain actual diff in production)
    let diffPath: string | undefined;
    if (diffPercentage > this.visualConfig.threshold) {
      diffPath = path.join(this.visualConfig.diffDir, `${name}-diff.png`);
      // In production, save the actual diff image
      fs.copyFileSync(currentPath, diffPath);
    }

    return { diffPercentage, diffPath };
  }

  /**
   * Capture screenshots for all pages
   */
  async captureAllPages(
    page: Page,
    pages: { url: string; name: string }[]
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const pageInfo of pages) {
      try {
        await page.goto(pageInfo.url, {
          waitUntil: 'networkidle',
          timeout: this.config.timeout,
        });

        const result = await this.captureAndCompare(page, pageInfo.name, pageInfo.url);
        results.push(result);
      } catch (error) {
        results.push({
          id: generateId(),
          type: 'custom',
          name: `Visual: ${pageInfo.name}`,
          status: 'error',
          url: pageInfo.url,
          duration: 0,
          timestamp: new Date(),
          retryCount: 0,
          error: {
            message: (error as Error).message,
            classification: 'visual',
          },
        });
      }
    }

    return results;
  }

  /**
   * Get visual test results
   */
  getResults(): VisualTestResult[] {
    return [...this.results];
  }

  /**
   * Get summary
   */
  getSummary(): {
    total: number;
    passed: number;
    failed: number;
    newBaselines: number;
  } {
    const passed = this.results.filter((r) => r.match && !r.isNewBaseline).length;
    const failed = this.results.filter((r) => !r.match).length;
    const newBaselines = this.results.filter((r) => r.isNewBaseline).length;

    return {
      total: this.results.length,
      passed,
      failed,
      newBaselines,
    };
  }

  /**
   * Update baseline for a specific page
   */
  updateBaseline(name: string): boolean {
    const safeName = toSafeFilename(name);
    const currentPath = path.join(this.visualConfig.currentDir, `${safeName}.png`);
    const baselinePath = path.join(this.visualConfig.baselineDir, `${safeName}.png`);

    if (fs.existsSync(currentPath)) {
      fs.copyFileSync(currentPath, baselinePath);
      this.logger.info(`Updated baseline: ${name}`);
      return true;
    }

    return false;
  }

  /**
   * Clear all current screenshots
   */
  clearCurrent(): void {
    const files = fs.readdirSync(this.visualConfig.currentDir);
    for (const file of files) {
      fs.unlinkSync(path.join(this.visualConfig.currentDir, file));
    }
  }

  /**
   * Clear all diff images
   */
  clearDiffs(): void {
    const files = fs.readdirSync(this.visualConfig.diffDir);
    for (const file of files) {
      fs.unlinkSync(path.join(this.visualConfig.diffDir, file));
    }
  }
}

// ============================================================================
// Export
// ============================================================================

export default VisualTester;
