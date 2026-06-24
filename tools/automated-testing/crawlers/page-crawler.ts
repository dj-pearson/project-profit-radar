/**
 * Automated Testing Tool - Page Crawler
 *
 * Dynamically crawls web pages to discover all accessible pages and elements.
 * Uses Playwright for browser automation.
 */

import type { Page, Browser, BrowserContext } from 'playwright';
import type {
  TestConfig,
  DiscoveredPage,
  DiscoveredForm,
  DiscoveredButton,
  DiscoveredElement,
  FormField,
} from '../types';
import { Logger } from '../utils/logger';
import {
  normalizeUrl,
  isInternalUrl,
  shouldTestUrl,
  sleep,
  generateId,
} from '../utils/helpers';
import { shouldTestUrl as configShouldTestUrl } from '../config';

// ============================================================================
// Page Crawler
// ============================================================================

export class PageCrawler {
  private logger: Logger;
  private config: TestConfig;
  private visitedUrls: Set<string> = new Set();
  private discoveredPages: Map<string, DiscoveredPage> = new Map();
  private urlQueue: { url: string; depth: number }[] = [];

  constructor(config: TestConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || new Logger({ context: 'PageCrawler' });
  }

  /**
   * Start crawling from the base URL
   */
  async crawl(page: Page, startUrls?: string[]): Promise<DiscoveredPage[]> {
    this.logger.info('Starting page crawl');
    this.visitedUrls.clear();
    this.discoveredPages.clear();
    this.urlQueue = [];

    // Initialize queue with start URLs
    const urls = startUrls || [this.config.baseUrl];
    for (const url of urls) {
      this.urlQueue.push({ url, depth: 0 });
    }

    // Process queue
    while (this.urlQueue.length > 0) {
      // Check max pages limit
      if (this.config.maxPages > 0 && this.visitedUrls.size >= this.config.maxPages) {
        this.logger.info(`Reached max pages limit (${this.config.maxPages})`);
        break;
      }

      const { url, depth } = this.urlQueue.shift()!;

      // Skip if already visited
      const normalizedUrl = normalizeUrl(url, this.config.baseUrl);
      if (this.visitedUrls.has(normalizedUrl)) {
        continue;
      }

      // Skip if URL should not be tested
      if (!configShouldTestUrl(url, this.config)) {
        this.logger.debug(`Skipping excluded URL: ${url}`);
        continue;
      }

      // Crawl the page
      const pageInfo = await this.crawlPage(page, url, depth);

      if (pageInfo) {
        this.visitedUrls.add(normalizedUrl);
        this.discoveredPages.set(normalizedUrl, pageInfo);

        // Add discovered links to queue
        for (const link of pageInfo.links) {
          if (!this.visitedUrls.has(normalizeUrl(link, this.config.baseUrl))) {
            this.urlQueue.push({ url: link, depth: depth + 1 });
          }
        }
      }

      // Delay between pages
      if (this.config.navigationDelay > 0) {
        await sleep(this.config.navigationDelay);
      }

      // Progress update
      this.logger.progress(
        this.visitedUrls.size,
        this.config.maxPages || this.urlQueue.length + this.visitedUrls.size,
        `Crawling: ${url.substring(0, 50)}...`
      );
    }

    const pages = Array.from(this.discoveredPages.values());
    this.logger.success(`Crawl complete. Discovered ${pages.length} pages`);

    return pages;
  }

  /**
   * Crawl a single page
   */
  private async crawlPage(page: Page, url: string, depth: number): Promise<DiscoveredPage | null> {
    try {
      const startTime = Date.now();

      // Navigate to page
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout,
      });

      const loadTime = Date.now() - startTime;
      const statusCode = response?.status() || 0;

      // Get page title
      const title = await page.title();

      // Discover elements
      const links = await this.discoverLinks(page);
      const forms = await this.discoverForms(page);
      const buttons = await this.discoverButtons(page);
      const interactiveElements = await this.discoverInteractiveElements(page);

      // Take screenshot if enabled
      let screenshotPath: string | undefined;
      if (this.config.screenshots) {
        screenshotPath = await this.takeScreenshot(page, url);
      }

      return {
        url,
        title,
        statusCode,
        loadTime,
        source: 'crawl',
        links,
        forms,
        buttons,
        interactiveElements,
        screenshotPath,
        depth,
      };
    } catch (error) {
      this.logger.warn(`Failed to crawl ${url}: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Discover all links on a page
   */
  private async discoverLinks(page: Page): Promise<string[]> {
    const links: string[] = [];

    try {
      const hrefs = await page.evaluate(() => {
        const anchors = document.querySelectorAll('a[href]');
        return Array.from(anchors)
          .map((a) => (a as HTMLAnchorElement).href)
          .filter((href) => href && !href.startsWith('javascript:') && !href.startsWith('#'));
      });

      for (const href of hrefs) {
        if (isInternalUrl(href, this.config.baseUrl)) {
          const normalized = normalizeUrl(href, this.config.baseUrl);
          if (!links.includes(normalized)) {
            links.push(normalized);
          }
        }
      }
    } catch (error) {
      this.logger.debug(`Error discovering links: ${(error as Error).message}`);
    }

    return links;
  }

  /**
   * Discover all forms on a page
   */
  private async discoverForms(page: Page): Promise<DiscoveredForm[]> {
    const forms: DiscoveredForm[] = [];

    try {
      const formData = await page.evaluate((selectors) => {
        const formElements = document.querySelectorAll(selectors.join(', '));

        return Array.from(formElements).map((form, index) => {
          const formEl = form as HTMLFormElement;

          // Get form fields
          const fields = Array.from(formEl.querySelectorAll('input, textarea, select')).map((field) => {
            const input = field as HTMLInputElement;
            const label = formEl.querySelector(`label[for="${input.id}"]`)?.textContent ||
                         input.closest('label')?.textContent?.trim();

            return {
              name: input.name || input.id || '',
              type: input.type || 'text',
              label: label || undefined,
              required: input.required || input.hasAttribute('required'),
              placeholder: input.placeholder || undefined,
              selector: input.id ? `#${input.id}` :
                       input.name ? `[name="${input.name}"]` :
                       `${input.tagName.toLowerCase()}:nth-of-type(${index + 1})`,
              constraints: {
                min: input.min || undefined,
                max: input.max || undefined,
                minLength: input.minLength > 0 ? input.minLength : undefined,
                maxLength: input.maxLength > 0 ? input.maxLength : undefined,
              },
              pattern: input.pattern || undefined,
            };
          });

          // Check for submit button
          const hasSubmit = !!formEl.querySelector('button[type="submit"], input[type="submit"]');

          return {
            id: formEl.id || `form-${index}`,
            action: formEl.action || undefined,
            method: formEl.method.toUpperCase() || 'GET',
            fields: fields.filter((f) => f.type !== 'hidden'),
            selector: formEl.id ? `#${formEl.id}` : `form:nth-of-type(${index + 1})`,
            hasSubmitButton: hasSubmit,
          };
        });
      }, this.config.selectors.forms);

      for (const data of formData) {
        forms.push({
          id: data.id,
          action: data.action,
          method: data.method as DiscoveredForm['method'],
          fields: data.fields as FormField[],
          selector: data.selector,
          hasSubmitButton: data.hasSubmitButton,
        });
      }
    } catch (error) {
      this.logger.debug(`Error discovering forms: ${(error as Error).message}`);
    }

    return forms;
  }

  /**
   * Discover all buttons on a page
   */
  private async discoverButtons(page: Page): Promise<DiscoveredButton[]> {
    const buttons: DiscoveredButton[] = [];

    try {
      const buttonData = await page.evaluate((selectors) => {
        const buttonElements = document.querySelectorAll(selectors.join(', '));

        return Array.from(buttonElements).map((btn, index) => {
          const button = btn as HTMLButtonElement;

          return {
            id: button.id || `button-${index}`,
            text: button.textContent?.trim() || '',
            type: button.type || 'button',
            selector: button.id ? `#${button.id}` :
                     button.textContent?.trim() ? `button:has-text("${button.textContent.trim().substring(0, 30)}")` :
                     `button:nth-of-type(${index + 1})`,
            disabled: button.disabled,
            ariaLabel: button.getAttribute('aria-label') || undefined,
          };
        });
      }, this.config.selectors.buttons);

      for (const data of buttonData) {
        buttons.push({
          id: data.id,
          text: data.text,
          type: data.type as DiscoveredButton['type'],
          selector: data.selector,
          disabled: data.disabled,
          ariaLabel: data.ariaLabel,
        });
      }
    } catch (error) {
      this.logger.debug(`Error discovering buttons: ${(error as Error).message}`);
    }

    return buttons;
  }

  /**
   * Discover all interactive elements on a page
   */
  private async discoverInteractiveElements(page: Page): Promise<DiscoveredElement[]> {
    const elements: DiscoveredElement[] = [];

    try {
      const elementData = await page.evaluate((selectors) => {
        const ignoreSelectors = selectors.ignore.join(', ');
        const interactiveSelectors = selectors.interactive.join(', ');

        const interactiveElements = document.querySelectorAll(interactiveSelectors);
        const ignoredElements = new Set(document.querySelectorAll(ignoreSelectors));

        return Array.from(interactiveElements)
          .filter((el) => !ignoredElements.has(el))
          .slice(0, 100) // Limit to prevent performance issues
          .map((el, index) => {
            const element = el as HTMLElement;
            const rect = element.getBoundingClientRect();

            return {
              tagName: element.tagName,
              id: element.id || `element-${index}`,
              classes: Array.from(element.classList),
              selector: element.id ? `#${element.id}` :
                       element.tagName.toLowerCase() + (element.classList.length ? `.${element.classList[0]}` : ''),
              role: element.getAttribute('role') || undefined,
              ariaLabel: element.getAttribute('aria-label') || undefined,
              visible: rect.width > 0 && rect.height > 0,
              enabled: !(element as HTMLButtonElement).disabled,
            };
          });
      }, this.config.selectors);

      for (const data of elementData) {
        elements.push({
          tagName: data.tagName,
          id: data.id,
          classes: data.classes,
          selector: data.selector,
          role: data.role,
          ariaLabel: data.ariaLabel,
          visible: data.visible,
          enabled: data.enabled,
        });
      }
    } catch (error) {
      this.logger.debug(`Error discovering interactive elements: ${(error as Error).message}`);
    }

    return elements;
  }

  /**
   * Take a screenshot of the current page
   */
  private async takeScreenshot(page: Page, url: string): Promise<string> {
    const filename = url
      .replace(this.config.baseUrl, '')
      .replace(/[^a-z0-9]/gi, '-')
      .substring(0, 100) || 'index';

    const screenshotPath = `${this.config.outputDir}/screenshots/${filename}-${Date.now()}.png`;

    try {
      await page.screenshot({
        path: screenshotPath,
        fullPage: false,
      });
      return screenshotPath;
    } catch (error) {
      this.logger.debug(`Failed to take screenshot: ${(error as Error).message}`);
      return '';
    }
  }

  /**
   * Get visited URLs
   */
  getVisitedUrls(): string[] {
    return Array.from(this.visitedUrls);
  }

  /**
   * Get discovered pages
   */
  getDiscoveredPages(): DiscoveredPage[] {
    return Array.from(this.discoveredPages.values());
  }

  /**
   * Add URLs to crawl queue
   */
  addToQueue(urls: string[], depth: number = 0): void {
    for (const url of urls) {
      const normalized = normalizeUrl(url, this.config.baseUrl);
      if (!this.visitedUrls.has(normalized)) {
        this.urlQueue.push({ url, depth });
      }
    }
  }

  /**
   * Reset crawler state
   */
  reset(): void {
    this.visitedUrls.clear();
    this.discoveredPages.clear();
    this.urlQueue = [];
  }
}

// ============================================================================
// Export
// ============================================================================

export default PageCrawler;
