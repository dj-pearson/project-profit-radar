/**
 * Automated Testing Tool - Accessibility Tester
 *
 * Tests pages for accessibility issues based on WCAG guidelines.
 * Uses built-in browser APIs and custom checks (no external dependencies).
 */

import type { Page } from 'playwright';
import type { TestConfig, TestResult, AccessibilityResult, AccessibilityViolation } from '../types';
import { Logger } from '../utils/logger';
import { generateId } from '../utils/helpers';

// ============================================================================
// Accessibility Rules
// ============================================================================

interface A11yRule {
  id: string;
  description: string;
  help: string;
  helpUrl: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  tags: string[];
  check: (page: Page) => Promise<{ pass: boolean; nodes: { html: string; target: string[]; failureSummary?: string }[] }>;
}

const A11Y_RULES: A11yRule[] = [
  {
    id: 'document-title',
    description: 'Documents must have a title element',
    help: 'Ensures the page has a title',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.0/document-title',
    impact: 'serious',
    tags: ['wcag2a', 'wcag242'],
    check: async (page) => {
      const title = await page.title();
      const hasTitle = title && title.trim().length > 0;
      return {
        pass: hasTitle,
        nodes: hasTitle ? [] : [{ html: '<title></title>', target: ['title'], failureSummary: 'Page has no title' }],
      };
    },
  },
  {
    id: 'html-lang',
    description: 'HTML element must have a lang attribute',
    help: 'Ensures the html element has a lang attribute',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.0/html-has-lang',
    impact: 'serious',
    tags: ['wcag2a', 'wcag311'],
    check: async (page) => {
      const lang = await page.evaluate(() => document.documentElement.getAttribute('lang'));
      const hasLang = lang && lang.trim().length > 0;
      return {
        pass: hasLang,
        nodes: hasLang
          ? []
          : [{ html: '<html>', target: ['html'], failureSummary: 'HTML element is missing lang attribute' }],
      };
    },
  },
  {
    id: 'image-alt',
    description: 'Images must have alt text',
    help: 'Ensures all img elements have alt attributes',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.0/image-alt',
    impact: 'critical',
    tags: ['wcag2a', 'wcag111'],
    check: async (page) => {
      const results = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        const violations: { html: string; target: string[]; failureSummary: string }[] = [];

        images.forEach((img, index) => {
          const alt = img.getAttribute('alt');
          const hasAlt = alt !== null;
          const isDecorative = img.getAttribute('role') === 'presentation' || alt === '';

          if (!hasAlt && !isDecorative) {
            violations.push({
              html: img.outerHTML.substring(0, 200),
              target: [img.id ? `#${img.id}` : `img:nth-of-type(${index + 1})`],
              failureSummary: 'Image is missing alt attribute',
            });
          }
        });

        return violations;
      });

      return { pass: results.length === 0, nodes: results };
    },
  },
  {
    id: 'button-name',
    description: 'Buttons must have discernible text',
    help: 'Ensures buttons have accessible names',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.0/button-name',
    impact: 'critical',
    tags: ['wcag2a', 'wcag412'],
    check: async (page) => {
      const results = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, [role="button"]');
        const violations: { html: string; target: string[]; failureSummary: string }[] = [];

        buttons.forEach((btn, index) => {
          const hasText = btn.textContent?.trim();
          const hasAriaLabel = btn.getAttribute('aria-label');
          const hasAriaLabelledBy = btn.getAttribute('aria-labelledby');
          const hasTitle = btn.getAttribute('title');

          if (!hasText && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle) {
            violations.push({
              html: btn.outerHTML.substring(0, 200),
              target: [btn.id ? `#${btn.id}` : `button:nth-of-type(${index + 1})`],
              failureSummary: 'Button has no discernible text',
            });
          }
        });

        return violations;
      });

      return { pass: results.length === 0, nodes: results };
    },
  },
  {
    id: 'link-name',
    description: 'Links must have discernible text',
    help: 'Ensures links have accessible names',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.0/link-name',
    impact: 'serious',
    tags: ['wcag2a', 'wcag244', 'wcag412'],
    check: async (page) => {
      const results = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href]');
        const violations: { html: string; target: string[]; failureSummary: string }[] = [];

        links.forEach((link, index) => {
          const hasText = link.textContent?.trim();
          const hasAriaLabel = link.getAttribute('aria-label');
          const hasTitle = link.getAttribute('title');
          const hasImg = link.querySelector('img[alt]');

          if (!hasText && !hasAriaLabel && !hasTitle && !hasImg) {
            violations.push({
              html: link.outerHTML.substring(0, 200),
              target: [link.id ? `#${link.id}` : `a:nth-of-type(${index + 1})`],
              failureSummary: 'Link has no discernible text',
            });
          }
        });

        return violations;
      });

      return { pass: results.length === 0, nodes: results };
    },
  },
  {
    id: 'form-label',
    description: 'Form inputs must have labels',
    help: 'Ensures form elements have associated labels',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.0/label',
    impact: 'critical',
    tags: ['wcag2a', 'wcag412', 'wcag131'],
    check: async (page) => {
      const results = await page.evaluate(() => {
        const inputs = document.querySelectorAll(
          'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), textarea, select'
        );
        const violations: { html: string; target: string[]; failureSummary: string }[] = [];

        inputs.forEach((input, index) => {
          const id = input.id;
          const hasLabel = id ? document.querySelector(`label[for="${id}"]`) : null;
          const hasAriaLabel = input.getAttribute('aria-label');
          const hasAriaLabelledBy = input.getAttribute('aria-labelledby');
          const hasTitle = input.getAttribute('title');
          const hasPlaceholder = input.getAttribute('placeholder');
          const isWrappedInLabel = input.closest('label');

          if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle && !isWrappedInLabel) {
            violations.push({
              html: input.outerHTML.substring(0, 200),
              target: [input.id ? `#${input.id}` : `input:nth-of-type(${index + 1})`],
              failureSummary: hasPlaceholder
                ? 'Input relies only on placeholder for label'
                : 'Form input is missing a label',
            });
          }
        });

        return violations;
      });

      return { pass: results.length === 0, nodes: results };
    },
  },
  {
    id: 'heading-order',
    description: 'Heading levels should increase by one',
    help: 'Ensures headings are in logical order',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.0/heading-order',
    impact: 'moderate',
    tags: ['wcag2a', 'wcag131'],
    check: async (page) => {
      const results = await page.evaluate(() => {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const violations: { html: string; target: string[]; failureSummary: string }[] = [];
        let lastLevel = 0;

        headings.forEach((heading, index) => {
          const level = parseInt(heading.tagName.charAt(1));

          if (lastLevel > 0 && level > lastLevel + 1) {
            violations.push({
              html: heading.outerHTML.substring(0, 200),
              target: [`${heading.tagName.toLowerCase()}:nth-of-type(${index + 1})`],
              failureSummary: `Heading level skipped from h${lastLevel} to h${level}`,
            });
          }

          lastLevel = level;
        });

        return violations;
      });

      return { pass: results.length === 0, nodes: results };
    },
  },
  {
    id: 'color-contrast',
    description: 'Elements must have sufficient color contrast',
    help: 'Ensures text has adequate color contrast',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.0/color-contrast',
    impact: 'serious',
    tags: ['wcag2aa', 'wcag143'],
    check: async (page) => {
      // Basic contrast check - more sophisticated checks would require color analysis
      const results = await page.evaluate(() => {
        const violations: { html: string; target: string[]; failureSummary: string }[] = [];

        // Check for known problematic patterns
        const textElements = document.querySelectorAll('p, span, div, li, td, th, label');

        textElements.forEach((el, index) => {
          const style = window.getComputedStyle(el);
          const color = style.color;
          const bgColor = style.backgroundColor;

          // Check for very light text on white background
          if (color === 'rgb(255, 255, 255)' && bgColor === 'rgb(255, 255, 255)') {
            violations.push({
              html: el.outerHTML.substring(0, 100),
              target: [el.tagName.toLowerCase() + `:nth-of-type(${index + 1})`],
              failureSummary: 'White text on white background',
            });
          }

          // Check for transparent text
          if (color === 'rgba(0, 0, 0, 0)') {
            violations.push({
              html: el.outerHTML.substring(0, 100),
              target: [el.tagName.toLowerCase() + `:nth-of-type(${index + 1})`],
              failureSummary: 'Text color is transparent',
            });
          }
        });

        return violations.slice(0, 10); // Limit results
      });

      return { pass: results.length === 0, nodes: results };
    },
  },
  {
    id: 'focus-visible',
    description: 'Interactive elements must have visible focus',
    help: 'Ensures focus is visible on interactive elements',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.0/focus-visible',
    impact: 'serious',
    tags: ['wcag2aa', 'wcag247'],
    check: async (page) => {
      const results = await page.evaluate(() => {
        const violations: { html: string; target: string[]; failureSummary: string }[] = [];
        const focusable = document.querySelectorAll(
          'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        focusable.forEach((el, index) => {
          const style = window.getComputedStyle(el);
          const outlineStyle = style.outlineStyle;
          const outlineWidth = style.outlineWidth;

          // Check if focus outline is explicitly disabled
          if (outlineStyle === 'none' || outlineWidth === '0px') {
            // Check for alternative focus indicators
            const hasFocusRing = el.classList.contains('focus-ring') || el.classList.contains('focus-visible');

            if (!hasFocusRing) {
              violations.push({
                html: el.outerHTML.substring(0, 100),
                target: [el.id ? `#${el.id}` : el.tagName.toLowerCase() + `:nth-of-type(${index + 1})`],
                failureSummary: 'Element has outline:none without alternative focus indicator',
              });
            }
          }
        });

        return violations.slice(0, 10);
      });

      return { pass: results.length === 0, nodes: results };
    },
  },
  {
    id: 'landmark-regions',
    description: 'Page content should be in landmark regions',
    help: 'Ensures page has landmark regions',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.0/region',
    impact: 'moderate',
    tags: ['wcag2a', 'wcag131'],
    check: async (page) => {
      const results = await page.evaluate(() => {
        const violations: { html: string; target: string[]; failureSummary: string }[] = [];

        const hasMain = document.querySelector('main, [role="main"]');
        const hasNav = document.querySelector('nav, [role="navigation"]');
        const hasHeader = document.querySelector('header, [role="banner"]');

        if (!hasMain) {
          violations.push({
            html: '<body>...</body>',
            target: ['body'],
            failureSummary: 'Page is missing main landmark',
          });
        }

        return violations;
      });

      return { pass: results.length === 0, nodes: results };
    },
  },
];

// ============================================================================
// Accessibility Tester
// ============================================================================

export class AccessibilityTester {
  private logger: Logger;
  private config: TestConfig;

  constructor(config: TestConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || new Logger({ context: 'AccessibilityTester' });
  }

  /**
   * Run accessibility tests on a page
   */
  async testAccessibility(page: Page, pageUrl: string): Promise<AccessibilityResult> {
    this.logger.debug(`Running accessibility tests for: ${pageUrl}`);

    const violations: AccessibilityViolation[] = [];
    let passes = 0;
    let incomplete = 0;

    for (const rule of A11Y_RULES) {
      try {
        const result = await rule.check(page);

        if (result.pass) {
          passes++;
        } else {
          violations.push({
            id: rule.id,
            impact: rule.impact,
            description: rule.description,
            help: rule.help,
            helpUrl: rule.helpUrl,
            nodes: result.nodes,
            tags: rule.tags,
          });
        }
      } catch (error) {
        this.logger.debug(`Error running rule ${rule.id}: ${(error as Error).message}`);
        incomplete++;
      }
    }

    // Count total elements checked
    const elementsChecked = await page.evaluate(() => {
      return document.querySelectorAll('*').length;
    });

    return {
      url: pageUrl,
      violations,
      passes,
      incomplete,
      elementsChecked,
      timestamp: new Date(),
    };
  }

  /**
   * Generate test results from accessibility results
   */
  generateTestResults(result: AccessibilityResult): TestResult[] {
    const tests: TestResult[] = [];

    // Create a test result for each rule
    for (const rule of A11Y_RULES) {
      const violation = result.violations.find((v) => v.id === rule.id);

      tests.push({
        id: generateId(),
        type: 'accessibility',
        name: `A11y: ${rule.description}`,
        status: violation
          ? violation.impact === 'critical' || violation.impact === 'serious'
            ? 'failed'
            : 'warning'
          : 'passed',
        url: result.url,
        duration: 0,
        timestamp: new Date(),
        retryCount: 0,
        data: {
          ruleId: rule.id,
          impact: rule.impact,
          tags: rule.tags,
          violations: violation?.nodes.length || 0,
        },
        error: violation
          ? {
              message: `${violation.nodes.length} element(s) have ${rule.description.toLowerCase()}`,
              classification: 'accessibility',
            }
          : undefined,
      });
    }

    return tests;
  }

  /**
   * Get accessibility summary
   */
  getAccessibilitySummary(results: AccessibilityResult[]): {
    totalViolations: number;
    criticalViolations: number;
    seriousViolations: number;
    moderateViolations: number;
    minorViolations: number;
    pagesWithViolations: number;
    avgViolationsPerPage: number;
    mostCommonViolations: { id: string; count: number }[];
  } {
    const allViolations = results.flatMap((r) => r.violations);
    const violationCounts: Record<string, number> = {};

    let criticalViolations = 0;
    let seriousViolations = 0;
    let moderateViolations = 0;
    let minorViolations = 0;

    for (const violation of allViolations) {
      violationCounts[violation.id] = (violationCounts[violation.id] || 0) + 1;

      switch (violation.impact) {
        case 'critical':
          criticalViolations++;
          break;
        case 'serious':
          seriousViolations++;
          break;
        case 'moderate':
          moderateViolations++;
          break;
        case 'minor':
          minorViolations++;
          break;
      }
    }

    const mostCommonViolations = Object.entries(violationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ id, count }));

    const pagesWithViolations = results.filter((r) => r.violations.length > 0).length;

    return {
      totalViolations: allViolations.length,
      criticalViolations,
      seriousViolations,
      moderateViolations,
      minorViolations,
      pagesWithViolations,
      avgViolationsPerPage: results.length > 0 ? allViolations.length / results.length : 0,
      mostCommonViolations,
    };
  }
}

// ============================================================================
// Export
// ============================================================================

export default AccessibilityTester;
