/**
 * Automated Testing Tool - Element Tester
 *
 * Tests buttons, links, and other interactive elements.
 */

import type { Page } from 'playwright';
import type {
  TestConfig,
  TestResult,
  DiscoveredButton,
  DiscoveredElement,
  DiscoveredPage,
} from '../types';
import { Logger } from '../utils/logger';
import { generateId, classifyError, isInternalUrl, normalizeUrl } from '../utils/helpers';

// ============================================================================
// Element Tester
// ============================================================================

export class ElementTester {
  private logger: Logger;
  private config: TestConfig;

  constructor(config: TestConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || new Logger({ context: 'ElementTester' });
  }

  /**
   * Test all interactive elements on a page
   */
  async testElements(
    page: Page,
    pageInfo: DiscoveredPage,
    pageUrl: string
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test buttons
    const buttonResults = await this.testButtons(page, pageInfo.buttons, pageUrl);
    results.push(...buttonResults);

    // Test links
    if (this.config.depth !== 'shallow') {
      const linkResults = await this.testLinks(page, pageInfo.links, pageUrl);
      results.push(...linkResults);
    }

    // Test other interactive elements
    if (this.config.depth === 'deep') {
      const interactiveResults = await this.testInteractiveElements(
        page,
        pageInfo.interactiveElements,
        pageUrl
      );
      results.push(...interactiveResults);
    }

    return results;
  }

  /**
   * Test buttons on a page
   */
  async testButtons(
    page: Page,
    buttons: DiscoveredButton[],
    pageUrl: string
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const button of buttons) {
      // Skip form submit buttons (handled by form tester)
      if (button.type === 'submit') continue;

      const startTime = Date.now();
      const testId = generateId();

      try {
        const buttonLocator = page.locator(button.selector).first();

        // Check visibility
        const isVisible = await buttonLocator.isVisible({ timeout: 5000 });
        if (!isVisible) {
          results.push({
            id: testId,
            type: 'element-visibility',
            name: `Button visibility: ${button.text || button.id}`,
            status: 'warning',
            url: pageUrl,
            duration: Date.now() - startTime,
            timestamp: new Date(),
            retryCount: 0,
            data: {
              buttonId: button.id,
              selector: button.selector,
              text: button.text,
            },
          });
          continue;
        }

        // Check if button is enabled
        if (button.disabled) {
          results.push({
            id: testId,
            type: 'element-interaction',
            name: `Button disabled: ${button.text || button.id}`,
            status: 'skipped',
            url: pageUrl,
            duration: Date.now() - startTime,
            timestamp: new Date(),
            retryCount: 0,
            data: {
              buttonId: button.id,
              text: button.text,
              disabled: true,
            },
          });
          continue;
        }

        // Test hover state
        await buttonLocator.hover();

        // Test focus state
        await buttonLocator.focus();

        // Check for keyboard accessibility
        const isFocusable = await page.evaluate(
          (selector) => {
            const el = document.querySelector(selector);
            return el === document.activeElement;
          },
          button.selector
        );

        results.push({
          id: testId,
          type: 'button-click',
          name: `Button interaction: ${button.text || button.id}`,
          status: isFocusable ? 'passed' : 'warning',
          url: pageUrl,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          retryCount: 0,
          data: {
            buttonId: button.id,
            text: button.text,
            type: button.type,
            focusable: isFocusable,
            ariaLabel: button.ariaLabel,
          },
        });

        // Note: We don't click non-form buttons by default as it might trigger unwanted actions
        // In deep mode, we could track and handle specific safe buttons to click
      } catch (error) {
        results.push(
          this.createErrorResult(
            testId,
            'button-click',
            `Button test: ${button.text || button.id}`,
            pageUrl,
            error as Error,
            startTime
          )
        );
      }
    }

    return results;
  }

  /**
   * Test links on a page
   */
  async testLinks(page: Page, links: string[], pageUrl: string): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const testedLinks = new Set<string>();

    for (const link of links.slice(0, 50)) {
      // Limit to prevent too many tests
      const normalizedLink = normalizeUrl(link, this.config.baseUrl);

      // Skip already tested
      if (testedLinks.has(normalizedLink)) continue;
      testedLinks.add(normalizedLink);

      // Skip external links
      if (!isInternalUrl(link, this.config.baseUrl)) continue;

      const startTime = Date.now();
      const testId = generateId();

      try {
        // Check if link is accessible via fetch
        const response = await page.request.head(link, {
          timeout: 10000,
        });

        const status = response.status();
        const isValid = status >= 200 && status < 400;

        results.push({
          id: testId,
          type: 'link-click',
          name: `Link check: ${link.substring(0, 50)}...`,
          status: isValid ? 'passed' : status === 404 ? 'failed' : 'warning',
          url: pageUrl,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          retryCount: 0,
          data: {
            link,
            statusCode: status,
            valid: isValid,
          },
          error: !isValid
            ? {
                message: `Link returned status ${status}`,
                classification: 'functional',
              }
            : undefined,
        });
      } catch (error) {
        results.push({
          id: testId,
          type: 'link-click',
          name: `Link check: ${link.substring(0, 50)}...`,
          status: 'failed',
          url: pageUrl,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          retryCount: 0,
          data: {
            link,
          },
          error: {
            message: (error as Error).message,
            classification: 'network',
          },
        });
      }
    }

    return results;
  }

  /**
   * Test other interactive elements
   */
  async testInteractiveElements(
    page: Page,
    elements: DiscoveredElement[],
    pageUrl: string
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Filter out already tested elements (buttons, form inputs)
    const otherElements = elements.filter(
      (el) =>
        !['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(el.tagName) &&
        el.visible &&
        el.enabled
    );

    for (const element of otherElements.slice(0, 20)) {
      const startTime = Date.now();
      const testId = generateId();

      try {
        const locator = page.locator(element.selector).first();

        // Check visibility
        const isVisible = await locator.isVisible({ timeout: 3000 });

        if (!isVisible) continue;

        // Test focusability
        await locator.focus();

        const isFocused = await page.evaluate(
          (selector) => {
            const el = document.querySelector(selector);
            return el === document.activeElement;
          },
          element.selector
        );

        // Check for keyboard accessibility
        const hasTabIndex = await page.evaluate((selector) => {
          const el = document.querySelector(selector);
          return el ? el.getAttribute('tabindex') : null;
        }, element.selector);

        // Check ARIA attributes
        const ariaAttributes = await page.evaluate((selector) => {
          const el = document.querySelector(selector);
          if (!el) return {};
          return {
            role: el.getAttribute('role'),
            ariaLabel: el.getAttribute('aria-label'),
            ariaDescribedBy: el.getAttribute('aria-describedby'),
            ariaPressed: el.getAttribute('aria-pressed'),
            ariaExpanded: el.getAttribute('aria-expanded'),
          };
        }, element.selector);

        const hasAccessibility =
          ariaAttributes.role ||
          ariaAttributes.ariaLabel ||
          hasTabIndex !== null;

        results.push({
          id: testId,
          type: 'element-interaction',
          name: `Interactive element: ${element.tagName} ${element.id}`,
          status: hasAccessibility ? 'passed' : 'warning',
          url: pageUrl,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          retryCount: 0,
          data: {
            tagName: element.tagName,
            id: element.id,
            role: element.role,
            focusable: isFocused,
            tabIndex: hasTabIndex,
            aria: ariaAttributes,
          },
        });
      } catch {
        // Skip elements that can't be tested
      }
    }

    return results;
  }

  /**
   * Test navigation elements (menu, tabs, etc.)
   */
  async testNavigation(page: Page, pageUrl: string): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const startTime = Date.now();
    const testId = generateId();

    try {
      // Find navigation elements
      const navElements = await page.evaluate(() => {
        const navs: Array<{
          type: string;
          selector: string;
          items: number;
        }> = [];

        // Main navigation
        const mainNav = document.querySelector('nav, [role="navigation"]');
        if (mainNav) {
          const links = mainNav.querySelectorAll('a');
          navs.push({
            type: 'main-nav',
            selector: mainNav.tagName.toLowerCase() + (mainNav.id ? `#${mainNav.id}` : ''),
            items: links.length,
          });
        }

        // Tab lists
        const tabLists = document.querySelectorAll('[role="tablist"]');
        tabLists.forEach((tabList, i) => {
          const tabs = tabList.querySelectorAll('[role="tab"]');
          navs.push({
            type: 'tabs',
            selector: `[role="tablist"]:nth-of-type(${i + 1})`,
            items: tabs.length,
          });
        });

        // Menus
        const menus = document.querySelectorAll('[role="menu"], [role="menubar"]');
        menus.forEach((menu, i) => {
          const items = menu.querySelectorAll('[role="menuitem"]');
          navs.push({
            type: 'menu',
            selector: `[role="menu"]:nth-of-type(${i + 1})`,
            items: items.length,
          });
        });

        return navs;
      });

      // Test each navigation element
      for (const nav of navElements) {
        results.push({
          id: generateId(),
          type: 'navigation',
          name: `Navigation: ${nav.type}`,
          status: nav.items > 0 ? 'passed' : 'warning',
          url: pageUrl,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          retryCount: 0,
          data: {
            type: nav.type,
            selector: nav.selector,
            itemCount: nav.items,
          },
        });
      }

      // Test keyboard navigation
      const hasSkipLink = await page.evaluate(() => {
        const firstFocusable = document.querySelector(
          'a[href^="#main"], a[href^="#content"], .skip-link, .skip-to-content'
        );
        return !!firstFocusable;
      });

      results.push({
        id: generateId(),
        type: 'accessibility',
        name: 'Skip link present',
        status: hasSkipLink ? 'passed' : 'warning',
        url: pageUrl,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        retryCount: 0,
        data: {
          hasSkipLink,
        },
      });
    } catch (error) {
      results.push(
        this.createErrorResult(
          testId,
          'navigation',
          'Navigation test',
          pageUrl,
          error as Error,
          startTime
        )
      );
    }

    return results;
  }

  /**
   * Create an error result
   */
  private createErrorResult(
    testId: string,
    type: TestResult['type'],
    name: string,
    url: string,
    error: Error,
    startTime: number
  ): TestResult {
    const classification = classifyError(error.message);

    return {
      id: testId,
      type,
      name,
      status: 'error',
      url,
      duration: Date.now() - startTime,
      timestamp: new Date(),
      retryCount: 0,
      error: {
        message: error.message,
        stack: error.stack,
        classification,
      },
    };
  }
}

// ============================================================================
// Export
// ============================================================================

export default ElementTester;
