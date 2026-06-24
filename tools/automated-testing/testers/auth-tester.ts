/**
 * Automated Testing Tool - Authentication Tester
 *
 * Tests authentication flows including login, logout, session persistence,
 * and protected route access.
 */

import type { Page, BrowserContext } from 'playwright';
import type { TestConfig, TestResult, AuthConfig } from '../types';
import { Logger } from '../utils/logger';
import { generateId, sleep } from '../utils/helpers';

// ============================================================================
// Authentication Tester
// ============================================================================

export class AuthTester {
  private logger: Logger;
  private config: TestConfig;
  private isAuthenticated: boolean = false;
  private authToken?: string;

  constructor(config: TestConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || new Logger({ context: 'AuthTester' });
  }

  /**
   * Perform login and return authentication state
   */
  async login(page: Page): Promise<TestResult> {
    const startTime = Date.now();
    const testId = generateId();

    if (!this.config.auth) {
      return {
        id: testId,
        type: 'authentication',
        name: 'Login',
        status: 'skipped',
        url: '',
        duration: 0,
        timestamp: new Date(),
        retryCount: 0,
        data: { reason: 'No auth configuration provided' },
      };
    }

    const auth = this.config.auth;

    try {
      this.logger.info('Attempting login...');

      // Navigate to login page
      await page.goto(`${this.config.baseUrl}${auth.loginUrl}`, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout,
      });

      // Fill credentials
      await page.fill(auth.usernameSelector, auth.credentials.username);
      await page.fill(auth.passwordSelector, auth.credentials.password);

      // Submit form
      await page.click(auth.submitSelector);

      // Wait for navigation or success indicator
      if (auth.successUrl) {
        await page.waitForURL(`**${auth.successUrl}**`, { timeout: 15000 });
      } else {
        await page.waitForLoadState('networkidle');
      }

      // Check if login was successful
      const currentUrl = page.url();
      const isLoggedIn = auth.successUrl
        ? currentUrl.includes(auth.successUrl)
        : !currentUrl.includes(auth.loginUrl);

      if (isLoggedIn) {
        this.isAuthenticated = true;

        // Try to capture auth token from storage
        this.authToken = await this.captureAuthToken(page, auth);

        this.logger.success('Login successful');

        return {
          id: testId,
          type: 'authentication',
          name: 'Login',
          status: 'passed',
          url: auth.loginUrl,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          retryCount: 0,
          data: {
            redirectedTo: currentUrl,
            hasAuthToken: !!this.authToken,
          },
        };
      } else {
        return {
          id: testId,
          type: 'authentication',
          name: 'Login',
          status: 'failed',
          url: auth.loginUrl,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          retryCount: 0,
          error: {
            message: 'Login did not redirect to success URL',
            classification: 'functional',
            expected: auth.successUrl,
            actual: currentUrl,
          },
        };
      }
    } catch (error) {
      this.logger.error(`Login failed: ${(error as Error).message}`);

      return {
        id: testId,
        type: 'authentication',
        name: 'Login',
        status: 'error',
        url: auth.loginUrl,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        retryCount: 0,
        error: {
          message: (error as Error).message,
          stack: (error as Error).stack,
          classification: 'functional',
        },
      };
    }
  }

  /**
   * Test protected route access without authentication
   */
  async testProtectedRouteAccess(
    page: Page,
    protectedUrl: string
  ): Promise<TestResult> {
    const startTime = Date.now();
    const testId = generateId();

    if (!this.config.auth) {
      return {
        id: testId,
        type: 'authentication',
        name: 'Protected Route Access',
        status: 'skipped',
        url: protectedUrl,
        duration: 0,
        timestamp: new Date(),
        retryCount: 0,
      };
    }

    try {
      // Clear auth state
      await page.context().clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // Try to access protected route
      await page.goto(`${this.config.baseUrl}${protectedUrl}`, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout,
      });

      const currentUrl = page.url();
      const wasRedirected = currentUrl.includes(this.config.auth.loginUrl);

      return {
        id: testId,
        type: 'authentication',
        name: `Protected Route: ${protectedUrl}`,
        status: wasRedirected ? 'passed' : 'warning',
        url: protectedUrl,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        retryCount: 0,
        data: {
          expectedRedirect: this.config.auth.loginUrl,
          actualUrl: currentUrl,
          wasRedirected,
        },
        error: !wasRedirected
          ? {
              message: 'Protected route accessible without authentication',
              classification: 'functional',
            }
          : undefined,
      };
    } catch (error) {
      return {
        id: testId,
        type: 'authentication',
        name: `Protected Route: ${protectedUrl}`,
        status: 'error',
        url: protectedUrl,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        retryCount: 0,
        error: {
          message: (error as Error).message,
          classification: 'functional',
        },
      };
    }
  }

  /**
   * Test session persistence (refresh should maintain login)
   */
  async testSessionPersistence(page: Page): Promise<TestResult> {
    const startTime = Date.now();
    const testId = generateId();

    if (!this.config.auth || !this.isAuthenticated) {
      return {
        id: testId,
        type: 'authentication',
        name: 'Session Persistence',
        status: 'skipped',
        url: '',
        duration: 0,
        timestamp: new Date(),
        retryCount: 0,
        data: { reason: 'Not authenticated' },
      };
    }

    try {
      const auth = this.config.auth;

      // Reload the page
      await page.reload({ waitUntil: 'networkidle' });

      // Check if still on protected page (not redirected to login)
      const currentUrl = page.url();
      const stillLoggedIn = !currentUrl.includes(auth.loginUrl);

      return {
        id: testId,
        type: 'authentication',
        name: 'Session Persistence',
        status: stillLoggedIn ? 'passed' : 'failed',
        url: currentUrl,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        retryCount: 0,
        data: {
          stillLoggedIn,
          currentUrl,
        },
        error: !stillLoggedIn
          ? {
              message: 'Session not persisted after page reload',
              classification: 'functional',
            }
          : undefined,
      };
    } catch (error) {
      return {
        id: testId,
        type: 'authentication',
        name: 'Session Persistence',
        status: 'error',
        url: '',
        duration: Date.now() - startTime,
        timestamp: new Date(),
        retryCount: 0,
        error: {
          message: (error as Error).message,
          classification: 'functional',
        },
      };
    }
  }

  /**
   * Test invalid credentials
   */
  async testInvalidCredentials(page: Page): Promise<TestResult> {
    const startTime = Date.now();
    const testId = generateId();

    if (!this.config.auth) {
      return {
        id: testId,
        type: 'authentication',
        name: 'Invalid Credentials',
        status: 'skipped',
        url: '',
        duration: 0,
        timestamp: new Date(),
        retryCount: 0,
      };
    }

    const auth = this.config.auth;

    try {
      // Navigate to login page
      await page.goto(`${this.config.baseUrl}${auth.loginUrl}`, {
        waitUntil: 'networkidle',
      });

      // Fill invalid credentials
      await page.fill(auth.usernameSelector, 'invalid@example.com');
      await page.fill(auth.passwordSelector, 'wrongpassword');

      // Submit form
      await page.click(auth.submitSelector);

      // Wait for response
      await sleep(2000);

      // Check for error message or that we're still on login page
      const currentUrl = page.url();
      const stayedOnLogin = currentUrl.includes(auth.loginUrl);

      // Look for error indicators
      const hasErrorMessage = await page.evaluate(() => {
        const errorSelectors = [
          '[role="alert"]',
          '.error',
          '.error-message',
          '[data-testid="error"]',
          '.text-red-500',
          '.text-destructive',
        ];
        return errorSelectors.some((sel) => document.querySelector(sel));
      });

      const handledCorrectly = stayedOnLogin || hasErrorMessage;

      return {
        id: testId,
        type: 'authentication',
        name: 'Invalid Credentials Handling',
        status: handledCorrectly ? 'passed' : 'warning',
        url: auth.loginUrl,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        retryCount: 0,
        data: {
          stayedOnLogin,
          hasErrorMessage,
          currentUrl,
        },
        error: !handledCorrectly
          ? {
              message: 'Invalid credentials did not show proper error handling',
              classification: 'functional',
            }
          : undefined,
      };
    } catch (error) {
      return {
        id: testId,
        type: 'authentication',
        name: 'Invalid Credentials Handling',
        status: 'error',
        url: auth.loginUrl,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        retryCount: 0,
        error: {
          message: (error as Error).message,
          classification: 'functional',
        },
      };
    }
  }

  /**
   * Run all authentication tests
   */
  async runAllTests(page: Page): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test invalid credentials first (before logging in)
    results.push(await this.testInvalidCredentials(page));

    // Test login
    const loginResult = await this.login(page);
    results.push(loginResult);

    if (loginResult.status === 'passed') {
      // Test session persistence
      results.push(await this.testSessionPersistence(page));

      // Test protected routes (need to test from new context)
      const protectedRoutes = ['/dashboard', '/settings', '/projects'];
      for (const route of protectedRoutes) {
        results.push(await this.testProtectedRouteAccess(page, route));
      }
    }

    return results;
  }

  /**
   * Capture auth token from storage
   */
  private async captureAuthToken(page: Page, auth: AuthConfig): Promise<string | undefined> {
    try {
      const token = await page.evaluate((sessionKey) => {
        // Check localStorage
        const localToken = localStorage.getItem(sessionKey || 'supabase.auth.token');
        if (localToken) return localToken;

        // Check sessionStorage
        const sessionToken = sessionStorage.getItem(sessionKey || 'supabase.auth.token');
        if (sessionToken) return sessionToken;

        // Check for Supabase auth
        const supabaseKey = Object.keys(localStorage).find((k) =>
          k.includes('supabase') && k.includes('auth')
        );
        if (supabaseKey) {
          return localStorage.getItem(supabaseKey);
        }

        return undefined;
      }, auth.sessionKey);

      return token || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Get authentication state
   */
  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Get auth token
   */
  getAuthToken(): string | undefined {
    return this.authToken;
  }

  /**
   * Clear authentication state
   */
  async clearAuth(page: Page): Promise<void> {
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    this.isAuthenticated = false;
    this.authToken = undefined;
  }
}

// ============================================================================
// Export
// ============================================================================

export default AuthTester;
