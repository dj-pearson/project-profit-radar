/**
 * Automated Testing Tool - Parallel Runner
 *
 * Enables parallel execution of tests across multiple browser contexts
 * for faster test completion.
 */

import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';
import type { TestConfig, TestResult, DiscoveredPage, PageTestReport } from '../types';
import { Logger } from '../utils/logger';
import { parallelLimit, sleep, generateId } from '../utils/helpers';

// ============================================================================
// Types
// ============================================================================

interface WorkerContext {
  id: number;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  busy: boolean;
}

interface ParallelTask {
  id: string;
  url: string;
  pageInfo?: DiscoveredPage;
  priority: number;
}

interface ParallelResult {
  taskId: string;
  workerId: number;
  report: PageTestReport;
  duration: number;
}

// ============================================================================
// Parallel Runner
// ============================================================================

export class ParallelRunner {
  private logger: Logger;
  private config: TestConfig;
  private workers: WorkerContext[] = [];
  private taskQueue: ParallelTask[] = [];
  private results: ParallelResult[] = [];
  private isRunning: boolean = false;

  constructor(config: TestConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || new Logger({ context: 'ParallelRunner' });
  }

  /**
   * Initialize worker pool
   */
  async initialize(): Promise<void> {
    const workerCount = this.config.parallel.workers;
    this.logger.info(`Initializing ${workerCount} parallel workers...`);

    const browserTypes = { chromium, firefox, webkit };
    const browserType = browserTypes[this.config.browser];

    for (let i = 0; i < workerCount; i++) {
      const browser = await browserType.launch({
        headless: this.config.headless,
      });

      const context = await browser.newContext({
        viewport: this.config.viewport,
        ignoreHTTPSErrors: true,
      });

      const page = await context.newPage();
      page.setDefaultTimeout(this.config.timeout);

      this.workers.push({
        id: i,
        browser,
        context,
        page,
        busy: false,
      });

      this.logger.debug(`Worker ${i} initialized`);
    }

    this.logger.success(`${workerCount} workers ready`);
  }

  /**
   * Add tasks to the queue
   */
  addTasks(tasks: ParallelTask[]): void {
    this.taskQueue.push(...tasks);
    // Sort by priority (higher priority first)
    this.taskQueue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Run all queued tasks in parallel
   */
  async runAll(
    testPage: (page: Page, pageInfo: DiscoveredPage) => Promise<PageTestReport>
  ): Promise<PageTestReport[]> {
    this.isRunning = true;
    this.results = [];

    const startTime = Date.now();
    let completedCount = 0;
    const totalTasks = this.taskQueue.length;

    this.logger.info(`Running ${totalTasks} tasks across ${this.workers.length} workers`);

    // Process tasks using worker pool
    await parallelLimit(
      [...this.taskQueue],
      async (task, index) => {
        // Find available worker
        const worker = await this.getAvailableWorker();
        worker.busy = true;

        try {
          const taskStart = Date.now();

          // Navigate and test
          const pageInfo = task.pageInfo || await this.discoverPage(worker.page, task.url);
          const report = await testPage(worker.page, pageInfo);

          const result: ParallelResult = {
            taskId: task.id,
            workerId: worker.id,
            report,
            duration: Date.now() - taskStart,
          };

          this.results.push(result);
          completedCount++;

          this.logger.progress(completedCount, totalTasks, `Worker ${worker.id}: ${task.url.substring(0, 40)}...`);
        } catch (error) {
          this.logger.warn(`Worker ${worker.id} failed on ${task.url}: ${(error as Error).message}`);

          // Create error report
          this.results.push({
            taskId: task.id,
            workerId: worker.id,
            report: {
              url: task.url,
              title: '',
              loadTime: 0,
              tests: [{
                id: generateId(),
                type: 'page-load',
                name: 'Page Load',
                status: 'error',
                url: task.url,
                duration: 0,
                timestamp: new Date(),
                retryCount: 0,
                error: {
                  message: (error as Error).message,
                  classification: 'critical',
                },
              }],
              consoleEntries: [],
              networkRequests: [],
            },
            duration: 0,
          });
          completedCount++;
        } finally {
          worker.busy = false;
        }
      },
      this.workers.length
    );

    this.isRunning = false;
    this.taskQueue = [];

    const totalDuration = Date.now() - startTime;
    this.logger.success(`Completed ${totalTasks} tasks in ${Math.round(totalDuration / 1000)}s`);

    return this.results.map((r) => r.report);
  }

  /**
   * Get an available worker (wait if all busy)
   */
  private async getAvailableWorker(): Promise<WorkerContext> {
    while (true) {
      const available = this.workers.find((w) => !w.busy);
      if (available) {
        return available;
      }
      await sleep(100);
    }
  }

  /**
   * Discover page info for a URL
   */
  private async discoverPage(page: Page, url: string): Promise<DiscoveredPage> {
    const startTime = Date.now();

    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: this.config.timeout,
    });

    return {
      url,
      title: await page.title(),
      statusCode: response?.status() || 0,
      loadTime: Date.now() - startTime,
      source: 'manual',
      links: [],
      forms: [],
      buttons: [],
      interactiveElements: [],
      depth: 0,
    };
  }

  /**
   * Get results grouped by worker
   */
  getResultsByWorker(): Map<number, ParallelResult[]> {
    const grouped = new Map<number, ParallelResult[]>();

    for (const result of this.results) {
      const existing = grouped.get(result.workerId) || [];
      existing.push(result);
      grouped.set(result.workerId, existing);
    }

    return grouped;
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    totalTasks: number;
    totalDuration: number;
    avgTaskDuration: number;
    tasksPerWorker: Record<number, number>;
    speedup: number;
  } {
    const totalTasks = this.results.length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const avgTaskDuration = totalTasks > 0 ? totalDuration / totalTasks : 0;

    const tasksPerWorker: Record<number, number> = {};
    for (const result of this.results) {
      tasksPerWorker[result.workerId] = (tasksPerWorker[result.workerId] || 0) + 1;
    }

    // Estimate speedup (sequential time / parallel time)
    const sequentialTime = totalDuration;
    const parallelTime = Math.max(...Object.values(tasksPerWorker).map((count) =>
      count * avgTaskDuration
    )) || 1;

    return {
      totalTasks,
      totalDuration,
      avgTaskDuration: Math.round(avgTaskDuration),
      tasksPerWorker,
      speedup: Math.round((sequentialTime / parallelTime) * 10) / 10,
    };
  }

  /**
   * Cleanup all workers
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up workers...');

    for (const worker of this.workers) {
      try {
        await worker.context.close();
        await worker.browser.close();
      } catch {
        // Ignore cleanup errors
      }
    }

    this.workers = [];
    this.logger.success('All workers cleaned up');
  }

  /**
   * Check if running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get worker count
   */
  getWorkerCount(): number {
    return this.workers.length;
  }
}

// ============================================================================
// Export
// ============================================================================

export default ParallelRunner;
