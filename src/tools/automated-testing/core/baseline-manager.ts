/**
 * Automated Testing Tool - Baseline Manager
 *
 * Manages visual regression baselines with CLI commands for
 * accepting, rejecting, and reviewing baseline changes.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { generateId, formatDuration } from '../utils/helpers';

// ============================================================================
// Types
// ============================================================================

export interface BaselineEntry {
  /** Unique identifier */
  id: string;
  /** Page URL */
  url: string;
  /** Viewport used */
  viewport: { width: number; height: number };
  /** Baseline screenshot path */
  baselinePath: string;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated */
  updatedAt: Date;
  /** Hash of the baseline image */
  hash: string;
  /** Whether baseline is approved */
  approved: boolean;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

export interface BaselineDiff {
  /** Entry ID */
  entryId: string;
  /** URL */
  url: string;
  /** Baseline path */
  baselinePath: string;
  /** Current screenshot path */
  currentPath: string;
  /** Diff image path */
  diffPath: string;
  /** Difference percentage */
  diffPercentage: number;
  /** Pixel count difference */
  pixelDiff: number;
  /** Timestamp */
  timestamp: Date;
  /** Status */
  status: 'pending' | 'accepted' | 'rejected';
}

export interface BaselineConfig {
  /** Directory for baseline images */
  baselineDir: string;
  /** Directory for current screenshots */
  currentDir: string;
  /** Directory for diff images */
  diffDir: string;
  /** Difference threshold (0-1) */
  threshold: number;
  /** Auto-accept new baselines */
  autoAcceptNew: boolean;
}

// ============================================================================
// Baseline Manager
// ============================================================================

export class BaselineManager {
  private logger: Logger;
  private config: BaselineConfig;
  private entries: Map<string, BaselineEntry> = new Map();
  private pendingDiffs: BaselineDiff[] = [];
  private manifestPath: string;

  constructor(config: Partial<BaselineConfig> = {}, logger?: Logger) {
    this.logger = logger || new Logger({ context: 'BaselineManager' });
    this.config = {
      baselineDir: config.baselineDir || './test-results/baselines',
      currentDir: config.currentDir || './test-results/current',
      diffDir: config.diffDir || './test-results/diffs',
      threshold: config.threshold ?? 0.01,
      autoAcceptNew: config.autoAcceptNew ?? false,
    };

    this.manifestPath = path.join(this.config.baselineDir, 'manifest.json');
    this.ensureDirectories();
    this.loadManifest();
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    [this.config.baselineDir, this.config.currentDir, this.config.diffDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Load baseline manifest
   */
  private loadManifest(): void {
    if (fs.existsSync(this.manifestPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.manifestPath, 'utf-8'));
        for (const entry of data.entries || []) {
          this.entries.set(entry.id, {
            ...entry,
            createdAt: new Date(entry.createdAt),
            updatedAt: new Date(entry.updatedAt),
          });
        }
        this.logger.debug(`Loaded ${this.entries.size} baseline entries`);
      } catch (error) {
        this.logger.warn(`Failed to load manifest: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Save baseline manifest
   */
  private saveManifest(): void {
    const data = {
      version: '1.0',
      updatedAt: new Date().toISOString(),
      entries: Array.from(this.entries.values()),
    };
    fs.writeFileSync(this.manifestPath, JSON.stringify(data, null, 2));
  }

  /**
   * Generate entry ID from URL and viewport
   */
  private generateEntryId(url: string, viewport: { width: number; height: number }): string {
    const urlPart = url.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    return `${urlPart}_${viewport.width}x${viewport.height}`;
  }

  /**
   * Calculate simple hash for image comparison
   */
  private calculateHash(imagePath: string): string {
    if (!fs.existsSync(imagePath)) {
      return '';
    }
    const buffer = fs.readFileSync(imagePath);
    // Simple hash based on buffer
    let hash = 0;
    for (let i = 0; i < buffer.length; i++) {
      hash = ((hash << 5) - hash) + buffer[i];
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get or create baseline entry
   */
  getEntry(url: string, viewport: { width: number; height: number }): BaselineEntry | undefined {
    const id = this.generateEntryId(url, viewport);
    return this.entries.get(id);
  }

  /**
   * Create new baseline
   */
  createBaseline(
    url: string,
    viewport: { width: number; height: number },
    screenshotPath: string,
    metadata?: Record<string, unknown>
  ): BaselineEntry {
    const id = this.generateEntryId(url, viewport);
    const ext = path.extname(screenshotPath);
    const baselinePath = path.join(this.config.baselineDir, `${id}${ext}`);

    // Copy screenshot to baseline directory
    fs.copyFileSync(screenshotPath, baselinePath);

    const entry: BaselineEntry = {
      id,
      url,
      viewport,
      baselinePath,
      createdAt: new Date(),
      updatedAt: new Date(),
      hash: this.calculateHash(baselinePath),
      approved: this.config.autoAcceptNew,
      metadata,
    };

    this.entries.set(id, entry);
    this.saveManifest();

    this.logger.info(`Created baseline for ${url} (${viewport.width}x${viewport.height})`);
    return entry;
  }

  /**
   * Update existing baseline
   */
  updateBaseline(id: string, screenshotPath: string): BaselineEntry | undefined {
    const entry = this.entries.get(id);
    if (!entry) {
      this.logger.warn(`Baseline not found: ${id}`);
      return undefined;
    }

    // Copy new screenshot to baseline
    fs.copyFileSync(screenshotPath, entry.baselinePath);

    entry.updatedAt = new Date();
    entry.hash = this.calculateHash(entry.baselinePath);
    entry.approved = true;

    this.entries.set(id, entry);
    this.saveManifest();

    this.logger.success(`Updated baseline: ${id}`);
    return entry;
  }

  /**
   * Record a diff for review
   */
  recordDiff(
    entry: BaselineEntry,
    currentPath: string,
    diffPath: string,
    diffPercentage: number,
    pixelDiff: number
  ): BaselineDiff {
    const diff: BaselineDiff = {
      entryId: entry.id,
      url: entry.url,
      baselinePath: entry.baselinePath,
      currentPath,
      diffPath,
      diffPercentage,
      pixelDiff,
      timestamp: new Date(),
      status: 'pending',
    };

    this.pendingDiffs.push(diff);
    this.savePendingDiffs();

    return diff;
  }

  /**
   * Save pending diffs to file
   */
  private savePendingDiffs(): void {
    const filePath = path.join(this.config.diffDir, 'pending-diffs.json');
    fs.writeFileSync(filePath, JSON.stringify(this.pendingDiffs, null, 2));
  }

  /**
   * Load pending diffs from file
   */
  loadPendingDiffs(): BaselineDiff[] {
    const filePath = path.join(this.config.diffDir, 'pending-diffs.json');
    if (fs.existsSync(filePath)) {
      try {
        this.pendingDiffs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return this.pendingDiffs;
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * Get all pending diffs
   */
  getPendingDiffs(): BaselineDiff[] {
    return this.pendingDiffs.filter((d) => d.status === 'pending');
  }

  /**
   * Accept a diff (update baseline)
   */
  acceptDiff(entryId: string): boolean {
    const diff = this.pendingDiffs.find((d) => d.entryId === entryId && d.status === 'pending');
    if (!diff) {
      this.logger.warn(`No pending diff found for: ${entryId}`);
      return false;
    }

    // Update baseline with current screenshot
    this.updateBaseline(entryId, diff.currentPath);

    // Mark diff as accepted
    diff.status = 'accepted';
    this.savePendingDiffs();

    this.logger.success(`Accepted diff for: ${entryId}`);
    return true;
  }

  /**
   * Reject a diff (keep existing baseline)
   */
  rejectDiff(entryId: string): boolean {
    const diff = this.pendingDiffs.find((d) => d.entryId === entryId && d.status === 'pending');
    if (!diff) {
      this.logger.warn(`No pending diff found for: ${entryId}`);
      return false;
    }

    diff.status = 'rejected';
    this.savePendingDiffs();

    this.logger.info(`Rejected diff for: ${entryId}`);
    return true;
  }

  /**
   * Accept all pending diffs
   */
  acceptAll(): number {
    const pending = this.getPendingDiffs();
    let accepted = 0;

    for (const diff of pending) {
      if (this.acceptDiff(diff.entryId)) {
        accepted++;
      }
    }

    this.logger.success(`Accepted ${accepted} diffs`);
    return accepted;
  }

  /**
   * Reject all pending diffs
   */
  rejectAll(): number {
    const pending = this.getPendingDiffs();
    let rejected = 0;

    for (const diff of pending) {
      if (this.rejectDiff(diff.entryId)) {
        rejected++;
      }
    }

    this.logger.info(`Rejected ${rejected} diffs`);
    return rejected;
  }

  /**
   * Clear all pending diffs
   */
  clearPending(): void {
    this.pendingDiffs = this.pendingDiffs.filter((d) => d.status !== 'pending');
    this.savePendingDiffs();
    this.logger.info('Cleared pending diffs');
  }

  /**
   * List all baselines
   */
  listBaselines(): BaselineEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Delete a baseline
   */
  deleteBaseline(id: string): boolean {
    const entry = this.entries.get(id);
    if (!entry) {
      return false;
    }

    // Delete file
    if (fs.existsSync(entry.baselinePath)) {
      fs.unlinkSync(entry.baselinePath);
    }

    this.entries.delete(id);
    this.saveManifest();

    this.logger.info(`Deleted baseline: ${id}`);
    return true;
  }

  /**
   * Delete all baselines
   */
  deleteAll(): number {
    const count = this.entries.size;

    for (const entry of this.entries.values()) {
      if (fs.existsSync(entry.baselinePath)) {
        fs.unlinkSync(entry.baselinePath);
      }
    }

    this.entries.clear();
    this.saveManifest();

    this.logger.warn(`Deleted ${count} baselines`);
    return count;
  }

  /**
   * Get summary of baselines
   */
  getSummary(): {
    totalBaselines: number;
    approvedBaselines: number;
    pendingDiffs: number;
    oldestBaseline?: Date;
    newestBaseline?: Date;
  } {
    const entries = Array.from(this.entries.values());
    const pending = this.getPendingDiffs();

    let oldestBaseline: Date | undefined;
    let newestBaseline: Date | undefined;

    for (const entry of entries) {
      if (!oldestBaseline || entry.createdAt < oldestBaseline) {
        oldestBaseline = entry.createdAt;
      }
      if (!newestBaseline || entry.updatedAt > newestBaseline) {
        newestBaseline = entry.updatedAt;
      }
    }

    return {
      totalBaselines: entries.length,
      approvedBaselines: entries.filter((e) => e.approved).length,
      pendingDiffs: pending.length,
      oldestBaseline,
      newestBaseline,
    };
  }

  /**
   * Generate HTML review page for pending diffs
   */
  generateReviewPage(): string {
    const pending = this.getPendingDiffs();
    const summary = this.getSummary();

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Regression Review</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #eee; padding: 2rem; }
    h1 { margin-bottom: 1rem; color: #fff; }
    .summary { display: flex; gap: 2rem; margin-bottom: 2rem; }
    .stat { background: #16213e; padding: 1rem; border-radius: 8px; }
    .stat-value { font-size: 2rem; font-weight: bold; color: #e94560; }
    .stat-label { color: #888; font-size: 0.9rem; }
    .diff-list { display: flex; flex-direction: column; gap: 2rem; }
    .diff-item { background: #16213e; border-radius: 12px; padding: 1.5rem; }
    .diff-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .diff-url { font-family: monospace; color: #0f3460; background: #e94560; padding: 0.25rem 0.5rem; border-radius: 4px; }
    .diff-percentage { font-size: 1.5rem; font-weight: bold; }
    .diff-percentage.low { color: #2ecc71; }
    .diff-percentage.medium { color: #f39c12; }
    .diff-percentage.high { color: #e74c3c; }
    .images { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem; }
    .image-container { text-align: center; }
    .image-container img { max-width: 100%; border-radius: 8px; border: 2px solid #333; }
    .image-label { margin-top: 0.5rem; color: #888; font-size: 0.9rem; }
    .actions { display: flex; gap: 1rem; }
    .btn { padding: 0.75rem 1.5rem; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: bold; }
    .btn-accept { background: #2ecc71; color: #fff; }
    .btn-reject { background: #e74c3c; color: #fff; }
    .btn:hover { opacity: 0.9; }
    .no-diffs { text-align: center; padding: 4rem; color: #888; }
    .no-diffs h2 { color: #2ecc71; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <h1>Visual Regression Review</h1>

  <div class="summary">
    <div class="stat">
      <div class="stat-value">${summary.totalBaselines}</div>
      <div class="stat-label">Total Baselines</div>
    </div>
    <div class="stat">
      <div class="stat-value">${summary.pendingDiffs}</div>
      <div class="stat-label">Pending Diffs</div>
    </div>
    <div class="stat">
      <div class="stat-value">${summary.approvedBaselines}</div>
      <div class="stat-label">Approved</div>
    </div>
  </div>

  ${pending.length === 0 ? `
  <div class="no-diffs">
    <h2>All Clear!</h2>
    <p>No pending visual differences to review.</p>
  </div>
  ` : `
  <div class="diff-list">
    ${pending.map((diff) => {
      const percentClass = diff.diffPercentage < 1 ? 'low' : diff.diffPercentage < 5 ? 'medium' : 'high';
      return `
    <div class="diff-item" data-entry-id="${diff.entryId}">
      <div class="diff-header">
        <span class="diff-url">${diff.url}</span>
        <span class="diff-percentage ${percentClass}">${diff.diffPercentage.toFixed(2)}% different</span>
      </div>
      <div class="images">
        <div class="image-container">
          <img src="${diff.baselinePath}" alt="Baseline">
          <div class="image-label">Baseline</div>
        </div>
        <div class="image-container">
          <img src="${diff.currentPath}" alt="Current">
          <div class="image-label">Current</div>
        </div>
        <div class="image-container">
          <img src="${diff.diffPath}" alt="Diff">
          <div class="image-label">Difference</div>
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-accept" onclick="acceptDiff('${diff.entryId}')">Accept (Update Baseline)</button>
        <button class="btn btn-reject" onclick="rejectDiff('${diff.entryId}')">Reject (Keep Baseline)</button>
      </div>
    </div>
    `;
    }).join('')}
  </div>
  `}

  <script>
    function acceptDiff(entryId) {
      console.log('Accept:', entryId);
      alert('Run: npx ts-node src/tools/automated-testing/cli.ts baseline accept ' + entryId);
    }
    function rejectDiff(entryId) {
      console.log('Reject:', entryId);
      alert('Run: npx ts-node src/tools/automated-testing/cli.ts baseline reject ' + entryId);
    }
  </script>
</body>
</html>
    `.trim();

    const reviewPath = path.join(this.config.diffDir, 'review.html');
    fs.writeFileSync(reviewPath, html);
    this.logger.info(`Generated review page: ${reviewPath}`);

    return reviewPath;
  }
}

// ============================================================================
// CLI Commands
// ============================================================================

export const baselineCommands = {
  /**
   * List all baselines
   */
  list: (manager: BaselineManager): void => {
    const baselines = manager.listBaselines();
    const logger = new Logger({ context: 'Baseline CLI' });

    if (baselines.length === 0) {
      logger.info('No baselines found.');
      return;
    }

    logger.info(`Found ${baselines.length} baselines:\n`);

    for (const entry of baselines) {
      const status = entry.approved ? '✓' : '○';
      const age = Math.round((Date.now() - entry.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`  ${status} ${entry.url}`);
      console.log(`    Viewport: ${entry.viewport.width}x${entry.viewport.height}`);
      console.log(`    Age: ${age} days`);
      console.log('');
    }
  },

  /**
   * Show pending diffs
   */
  pending: (manager: BaselineManager): void => {
    manager.loadPendingDiffs();
    const pending = manager.getPendingDiffs();
    const logger = new Logger({ context: 'Baseline CLI' });

    if (pending.length === 0) {
      logger.success('No pending diffs to review!');
      return;
    }

    logger.warn(`${pending.length} pending diffs:\n`);

    for (const diff of pending) {
      console.log(`  ◌ ${diff.url}`);
      console.log(`    Difference: ${diff.diffPercentage.toFixed(2)}%`);
      console.log(`    ID: ${diff.entryId}`);
      console.log('');
    }

    console.log('Commands:');
    console.log('  Accept: baseline accept <id>');
    console.log('  Reject: baseline reject <id>');
    console.log('  Accept All: baseline accept-all');
  },

  /**
   * Accept a specific diff
   */
  accept: (manager: BaselineManager, id: string): void => {
    manager.loadPendingDiffs();
    manager.acceptDiff(id);
  },

  /**
   * Reject a specific diff
   */
  reject: (manager: BaselineManager, id: string): void => {
    manager.loadPendingDiffs();
    manager.rejectDiff(id);
  },

  /**
   * Accept all pending diffs
   */
  acceptAll: (manager: BaselineManager): void => {
    manager.loadPendingDiffs();
    manager.acceptAll();
  },

  /**
   * Reject all pending diffs
   */
  rejectAll: (manager: BaselineManager): void => {
    manager.loadPendingDiffs();
    manager.rejectAll();
  },

  /**
   * Generate review page
   */
  review: (manager: BaselineManager): void => {
    manager.loadPendingDiffs();
    const reviewPath = manager.generateReviewPage();
    console.log(`\nOpen in browser: file://${path.resolve(reviewPath)}`);
  },

  /**
   * Delete a baseline
   */
  delete: (manager: BaselineManager, id: string): void => {
    manager.deleteBaseline(id);
  },

  /**
   * Clear all baselines
   */
  clear: (manager: BaselineManager): void => {
    manager.deleteAll();
  },
};

// ============================================================================
// Export
// ============================================================================

export default BaselineManager;
