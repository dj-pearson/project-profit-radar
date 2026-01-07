/**
 * Automated Testing Tool - Helper Utilities
 *
 * Common helper functions used throughout the testing framework.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { TestResult, ErrorClassification, ConsoleEntry, TestStatus } from '../types';

// ============================================================================
// String Utilities
// ============================================================================

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, maxLength: number = 100): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Escape HTML entities
 */
export function escapeHtml(str: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => htmlEntities[char]);
}

/**
 * Convert a string to a safe filename
 */
export function toSafeFilename(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

// ============================================================================
// URL Utilities
// ============================================================================

/**
 * Normalize a URL for comparison
 */
export function normalizeUrl(url: string, baseUrl: string): string {
  try {
    const parsed = new URL(url, baseUrl);
    // Remove trailing slashes, hashes, and normalize
    let normalized = parsed.origin + parsed.pathname;
    normalized = normalized.replace(/\/+$/, '');
    return normalized || '/';
  } catch {
    return url;
  }
}

/**
 * Check if URL is internal (same origin)
 */
export function isInternalUrl(url: string, baseUrl: string): boolean {
  try {
    const base = new URL(baseUrl);
    const target = new URL(url, baseUrl);
    return base.origin === target.origin;
  } catch {
    return false;
  }
}

/**
 * Extract path from URL
 */
export function getPathFromUrl(url: string, baseUrl: string): string {
  try {
    const parsed = new URL(url, baseUrl);
    return parsed.pathname + parsed.search;
  } catch {
    return url;
  }
}

/**
 * Check if URL matches any pattern in the list
 */
export function matchesPattern(url: string, patterns: string[]): boolean {
  const urlPath = getPathFromUrl(url, 'http://localhost');
  return patterns.some((pattern) => {
    try {
      return new RegExp(pattern).test(urlPath) || urlPath.includes(pattern);
    } catch {
      return urlPath.includes(pattern);
    }
  });
}

// ============================================================================
// File System Utilities
// ============================================================================

/**
 * Ensure directory exists
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Read JSON file safely
 */
export function readJsonFile<T>(filePath: string): T | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Write JSON file
 */
export function writeJsonFile(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Get all files in directory matching pattern
 */
export function getFiles(dirPath: string, pattern: RegExp): string[] {
  if (!fs.existsSync(dirPath)) return [];

  const results: string[] = [];
  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    if (item.isDirectory()) {
      results.push(...getFiles(fullPath, pattern));
    } else if (pattern.test(item.name)) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Get directories in a path
 */
export function getDirectories(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];

  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => item.name);
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Classify an error message
 */
export function classifyError(message: string, context?: string): ErrorClassification {
  const lowerMessage = message.toLowerCase();

  // Critical errors
  if (
    lowerMessage.includes('crash') ||
    lowerMessage.includes('fatal') ||
    lowerMessage.includes('unhandled') ||
    lowerMessage.includes('undefined is not')
  ) {
    return 'critical';
  }

  // Network errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('failed to fetch') ||
    lowerMessage.includes('net::err') ||
    lowerMessage.includes('cors') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('500') ||
    lowerMessage.includes('502') ||
    lowerMessage.includes('503')
  ) {
    return 'network';
  }

  // Validation errors
  if (
    lowerMessage.includes('validation') ||
    lowerMessage.includes('invalid') ||
    lowerMessage.includes('required field') ||
    lowerMessage.includes('must be')
  ) {
    return 'validation';
  }

  // Performance errors
  if (
    lowerMessage.includes('slow') ||
    lowerMessage.includes('performance') ||
    lowerMessage.includes('memory')
  ) {
    return 'performance';
  }

  // Accessibility errors
  if (
    lowerMessage.includes('accessibility') ||
    lowerMessage.includes('a11y') ||
    lowerMessage.includes('aria') ||
    lowerMessage.includes('contrast')
  ) {
    return 'accessibility';
  }

  // Console errors
  if (context === 'console') {
    return 'console';
  }

  // Visual errors
  if (
    lowerMessage.includes('display') ||
    lowerMessage.includes('render') ||
    lowerMessage.includes('css') ||
    lowerMessage.includes('style')
  ) {
    return 'visual';
  }

  // Functional errors
  if (
    lowerMessage.includes('click') ||
    lowerMessage.includes('submit') ||
    lowerMessage.includes('navigate') ||
    lowerMessage.includes('action')
  ) {
    return 'functional';
  }

  return 'unknown';
}

/**
 * Get severity from error classification
 */
export function getSeverityFromClassification(classification: ErrorClassification): number {
  const severityMap: Record<ErrorClassification, number> = {
    critical: 1,
    functional: 2,
    network: 2,
    accessibility: 3,
    performance: 3,
    validation: 3,
    visual: 4,
    console: 4,
    unknown: 5,
  };
  return severityMap[classification];
}

/**
 * Determine test status from results
 */
export function aggregateTestStatus(results: TestResult[]): TestStatus {
  if (results.some((r) => r.status === 'error')) return 'error';
  if (results.some((r) => r.status === 'failed')) return 'failed';
  if (results.some((r) => r.status === 'warning')) return 'warning';
  if (results.every((r) => r.status === 'skipped')) return 'skipped';
  return 'passed';
}

/**
 * Filter critical console errors
 */
export function filterCriticalConsoleErrors(entries: ConsoleEntry[]): ConsoleEntry[] {
  const ignoredPatterns = [
    /ResizeObserver loop/i,
    /chrome-extension/i,
    /moz-extension/i,
    /Extension context/i,
    /net::ERR_BLOCKED_BY_CLIENT/i,
    /favicon\.ico/i,
    /Download the React DevTools/i,
    /Warning: ReactDOM\.render/i,
    /Warning: componentWill/i,
    /Warning: Each child/i,
    /Warning: validateDOMNesting/i,
  ];

  return entries.filter((entry) => {
    if (entry.type !== 'error') return false;
    return !ignoredPatterns.some((pattern) => pattern.test(entry.text));
  });
}

// ============================================================================
// Selector Utilities
// ============================================================================

/**
 * Generate a unique selector for an element
 */
export function generateSelector(element: {
  tagName: string;
  id?: string;
  className?: string;
  name?: string;
  type?: string;
  role?: string;
  ariaLabel?: string;
  text?: string;
}): string {
  // ID is most specific
  if (element.id) {
    return `#${element.id}`;
  }

  const parts: string[] = [element.tagName.toLowerCase()];

  // Add role
  if (element.role) {
    parts.push(`[role="${element.role}"]`);
  }

  // Add name attribute
  if (element.name) {
    parts.push(`[name="${element.name}"]`);
  }

  // Add type for inputs
  if (element.type && element.tagName.toLowerCase() === 'input') {
    parts.push(`[type="${element.type}"]`);
  }

  // Add aria-label
  if (element.ariaLabel) {
    parts.push(`[aria-label="${element.ariaLabel}"]`);
  }

  // Add class if needed
  if (parts.length === 1 && element.className) {
    const firstClass = element.className.split(' ')[0];
    if (firstClass && !firstClass.includes(':')) {
      parts.push(`.${firstClass}`);
    }
  }

  return parts.join('');
}

// ============================================================================
// Async Utilities
// ============================================================================

/**
 * Wait for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    onRetry,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        onRetry?.(lastError, attempt + 1);
        await sleep(delay);
        delay = Math.min(delay * factor, maxDelay);
      }
    }
  }

  throw lastError!;
}

/**
 * Run promises with concurrency limit
 */
export async function parallelLimit<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  limit: number
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  const worker = async (): Promise<void> => {
    while (index < items.length) {
      const currentIndex = index++;
      const item = items[currentIndex];
      results[currentIndex] = await fn(item, currentIndex);
    }
  };

  const workers = Array(Math.min(limit, items.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

/**
 * Timeout a promise
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(message || `Timeout after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]);
}

// ============================================================================
// Data Utilities
// ============================================================================

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Group array items by key
 */
export function groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
  return items.reduce(
    (groups, item) => {
      const value = String(item[key]);
      if (!groups[value]) {
        groups[value] = [];
      }
      groups[value].push(item);
      return groups;
    },
    {} as Record<string, T[]>
  );
}

/**
 * Count occurrences in array
 */
export function countBy<T>(items: T[], key: keyof T): Record<string, number> {
  return items.reduce(
    (counts, item) => {
      const value = String(item[key]);
      counts[value] = (counts[value] || 0) + 1;
      return counts;
    },
    {} as Record<string, number>
  );
}

/**
 * Calculate statistics for an array of numbers
 */
export function calculateStats(numbers: number[]): {
  min: number;
  max: number;
  avg: number;
  median: number;
  p95: number;
} {
  if (numbers.length === 0) {
    return { min: 0, max: 0, avg: 0, median: 0, p95: 0 };
  }

  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
  };
}

// ============================================================================
// Export
// ============================================================================

export default {
  generateId,
  truncate,
  escapeHtml,
  toSafeFilename,
  formatBytes,
  formatDuration,
  normalizeUrl,
  isInternalUrl,
  getPathFromUrl,
  matchesPattern,
  ensureDir,
  readJsonFile,
  writeJsonFile,
  getFiles,
  getDirectories,
  classifyError,
  getSeverityFromClassification,
  aggregateTestStatus,
  filterCriticalConsoleErrors,
  generateSelector,
  sleep,
  retry,
  parallelLimit,
  withTimeout,
  deepClone,
  groupBy,
  countBy,
  calculateStats,
};
