/**
 * Automated Testing Tool - Network Monitor
 *
 * Monitors network requests for errors, slow responses, and API issues.
 */

import type { Page, Request, Response, Route } from 'playwright';
import type { NetworkRequest, TestResult } from '../types';
import { Logger } from '../utils/logger';
import { generateId } from '../utils/helpers';
import { shouldIgnoreNetworkRequest } from '../config';

// ============================================================================
// Network Monitor
// ============================================================================

export class NetworkMonitor {
  private logger: Logger;
  private requests: NetworkRequest[] = [];
  private pendingRequests: Map<string, { request: Request; startTime: number }> = new Map();
  private currentUrl: string = '';
  private isAttached: boolean = false;

  // Thresholds
  private readonly SLOW_REQUEST_MS = 3000;
  private readonly VERY_SLOW_REQUEST_MS = 10000;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger({ context: 'NetworkMonitor' });
  }

  /**
   * Attach to a page to monitor network requests
   */
  attach(page: Page): void {
    if (this.isAttached) return;

    page.on('request', (request) => this.handleRequest(request));
    page.on('response', (response) => this.handleResponse(response));
    page.on('requestfailed', (request) => this.handleRequestFailed(request));

    this.isAttached = true;
    this.logger.debug('Network monitor attached');
  }

  /**
   * Set the current URL being monitored
   */
  setCurrentUrl(url: string): void {
    this.currentUrl = url;
  }

  /**
   * Handle an outgoing request
   */
  private handleRequest(request: Request): void {
    const url = request.url();

    // Skip ignored requests
    if (shouldIgnoreNetworkRequest(url)) {
      return;
    }

    // Store pending request
    this.pendingRequests.set(url, {
      request,
      startTime: Date.now(),
    });
  }

  /**
   * Handle a response
   */
  private handleResponse(response: Response): void {
    const request = response.request();
    const url = request.url();

    const pending = this.pendingRequests.get(url);
    if (!pending) return;

    this.pendingRequests.delete(url);

    const endTime = Date.now();
    const duration = endTime - pending.startTime;

    const networkRequest: NetworkRequest = {
      url,
      method: request.method(),
      headers: request.headers(),
      status: response.status(),
      responseHeaders: response.headers(),
      timing: {
        startTime: pending.startTime,
        endTime,
        duration,
      },
      resourceType: request.resourceType(),
      failed: false,
      pageUrl: this.currentUrl,
      timestamp: new Date(),
    };

    // Try to get response body for API requests
    if (this.isApiRequest(url) && response.status() >= 400) {
      response.text().then((body) => {
        networkRequest.responseBody = body.substring(0, 500);
      }).catch(() => {
        // Ignore body read errors
      });
    }

    this.requests.push(networkRequest);

    // Log slow or failed requests
    if (duration > this.SLOW_REQUEST_MS) {
      this.logger.debug(`Slow request (${duration}ms): ${url.substring(0, 80)}`);
    }

    if (response.status() >= 400) {
      this.logger.debug(`Failed request (${response.status()}): ${url.substring(0, 80)}`);
    }
  }

  /**
   * Handle a failed request
   */
  private handleRequestFailed(request: Request): void {
    const url = request.url();

    const pending = this.pendingRequests.get(url);
    if (!pending) return;

    this.pendingRequests.delete(url);

    const endTime = Date.now();
    const duration = endTime - pending.startTime;

    const networkRequest: NetworkRequest = {
      url,
      method: request.method(),
      headers: request.headers(),
      timing: {
        startTime: pending.startTime,
        endTime,
        duration,
      },
      resourceType: request.resourceType(),
      failed: true,
      failureReason: request.failure()?.errorText || 'Unknown error',
      pageUrl: this.currentUrl,
      timestamp: new Date(),
    };

    this.requests.push(networkRequest);

    this.logger.debug(`Request failed: ${url.substring(0, 80)} - ${networkRequest.failureReason}`);
  }

  /**
   * Check if request is an API request
   */
  private isApiRequest(url: string): boolean {
    return (
      url.includes('/api/') ||
      url.includes('/functions/') ||
      url.includes('/rest/') ||
      url.includes('/graphql')
    );
  }

  /**
   * Get all network requests
   */
  getRequests(): NetworkRequest[] {
    return [...this.requests];
  }

  /**
   * Get requests for a specific URL
   */
  getRequestsForUrl(url: string): NetworkRequest[] {
    return this.requests.filter((r) => r.pageUrl === url);
  }

  /**
   * Get failed requests
   */
  getFailedRequests(): NetworkRequest[] {
    return this.requests.filter((r) => r.failed || (r.status && r.status >= 400));
  }

  /**
   * Get slow requests
   */
  getSlowRequests(): NetworkRequest[] {
    return this.requests.filter((r) => r.timing && r.timing.duration > this.SLOW_REQUEST_MS);
  }

  /**
   * Get API requests
   */
  getApiRequests(): NetworkRequest[] {
    return this.requests.filter((r) => this.isApiRequest(r.url));
  }

  /**
   * Generate test results from network requests
   */
  generateTestResults(): TestResult[] {
    const results: TestResult[] = [];

    // Group failed requests by page URL
    const failedByPage = new Map<string, NetworkRequest[]>();
    for (const request of this.getFailedRequests()) {
      const existing = failedByPage.get(request.pageUrl) || [];
      existing.push(request);
      failedByPage.set(request.pageUrl, existing);
    }

    // Create test results for each page with failed requests
    for (const [pageUrl, failed] of failedByPage) {
      // Separate by error type
      const networkErrors = failed.filter((r) => r.failed);
      const httpErrors = failed.filter((r) => !r.failed && r.status && r.status >= 400);

      if (networkErrors.length > 0) {
        results.push({
          id: generateId(),
          type: 'network-error',
          name: `Network errors on page`,
          status: 'failed',
          url: pageUrl,
          duration: 0,
          timestamp: new Date(),
          retryCount: 0,
          data: {
            errorCount: networkErrors.length,
            errors: networkErrors.slice(0, 5).map((r) => ({
              url: r.url.substring(0, 100),
              reason: r.failureReason,
            })),
          },
          error: {
            message: `${networkErrors.length} network error(s) detected`,
            classification: 'network',
          },
        });
      }

      if (httpErrors.length > 0) {
        const severity = httpErrors.some((r) => r.status && r.status >= 500) ? 'failed' : 'warning';

        results.push({
          id: generateId(),
          type: 'network-error',
          name: `HTTP errors on page`,
          status: severity,
          url: pageUrl,
          duration: 0,
          timestamp: new Date(),
          retryCount: 0,
          data: {
            errorCount: httpErrors.length,
            errors: httpErrors.slice(0, 5).map((r) => ({
              url: r.url.substring(0, 100),
              status: r.status,
            })),
          },
          error: {
            message: `${httpErrors.length} HTTP error(s) detected`,
            classification: 'network',
          },
        });
      }
    }

    // Test for slow requests
    const slowRequests = this.getSlowRequests();
    if (slowRequests.length > 0) {
      const verySlowCount = slowRequests.filter(
        (r) => r.timing && r.timing.duration > this.VERY_SLOW_REQUEST_MS
      ).length;

      results.push({
        id: generateId(),
        type: 'performance',
        name: `Slow network requests`,
        status: verySlowCount > 0 ? 'failed' : 'warning',
        url: slowRequests[0].pageUrl,
        duration: 0,
        timestamp: new Date(),
        retryCount: 0,
        data: {
          slowCount: slowRequests.length,
          verySlowCount,
          slowestRequests: slowRequests
            .sort((a, b) => (b.timing?.duration || 0) - (a.timing?.duration || 0))
            .slice(0, 5)
            .map((r) => ({
              url: r.url.substring(0, 100),
              duration: r.timing?.duration,
            })),
        },
        error:
          verySlowCount > 0
            ? {
                message: `${verySlowCount} very slow request(s) (>10s)`,
                classification: 'performance',
              }
            : undefined,
      });
    }

    return results;
  }

  /**
   * Get summary of network activity
   */
  getSummary(): {
    total: number;
    successful: number;
    failed: number;
    slow: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    avgResponseTime: number;
    totalTransferSize: number;
  } {
    const successful = this.requests.filter(
      (r) => !r.failed && r.status && r.status >= 200 && r.status < 400
    );
    const failed = this.getFailedRequests();
    const slow = this.getSlowRequests();

    // Count by resource type
    const byType: Record<string, number> = {};
    for (const request of this.requests) {
      byType[request.resourceType] = (byType[request.resourceType] || 0) + 1;
    }

    // Count by status code
    const byStatus: Record<string, number> = {};
    for (const request of this.requests) {
      const status = request.status ? String(request.status) : 'failed';
      byStatus[status] = (byStatus[status] || 0) + 1;
    }

    // Calculate average response time
    const responseTimes = this.requests
      .filter((r) => r.timing)
      .map((r) => r.timing!.duration);

    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    return {
      total: this.requests.length,
      successful: successful.length,
      failed: failed.length,
      slow: slow.length,
      byType,
      byStatus,
      avgResponseTime: Math.round(avgResponseTime),
      totalTransferSize: 0, // Would need to track transfer sizes
    };
  }

  /**
   * Clear all requests
   */
  clear(): void {
    this.requests = [];
    this.pendingRequests.clear();
  }

  /**
   * Clear requests for a specific URL
   */
  clearForUrl(url: string): void {
    this.requests = this.requests.filter((r) => r.pageUrl !== url);
  }
}

// ============================================================================
// Export
// ============================================================================

export default NetworkMonitor;
