/**
 * Accessibility Testing Utilities
 *
 * Utilities for automated accessibility testing using axe-core and vitest-axe.
 * These utilities help ensure WCAG 2.1 Level AA compliance throughout the codebase.
 *
 * Usage in tests:
 *
 * import { render } from '@testing-library/react';
 * import { testAccessibility, expectNoA11yViolations } from '@/test/accessibility-utils';
 *
 * describe('MyComponent', () => {
 *   it('should have no accessibility violations', async () => {
 *     const { container } = render(<MyComponent />);
 *     await expectNoA11yViolations(container);
 *   });
 *
 *   it('should pass custom accessibility rules', async () => {
 *     const { container } = render(<MyComponent />);
 *     await testAccessibility(container, {
 *       rules: {
 *         'color-contrast': { enabled: true },
 *       },
 *     });
 *   });
 * });
 */

import type { AxeResults, RunOptions, Spec } from 'axe-core';

// WCAG 2.1 AA rule configuration
export const wcag21AAConfig: RunOptions = {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
  },
  rules: {
    // Ensure color contrast meets WCAG AA minimum
    'color-contrast': { enabled: true },
    // Ensure images have alt text
    'image-alt': { enabled: true },
    // Ensure form inputs have labels
    'label': { enabled: true },
    // Ensure page has proper landmark regions
    'region': { enabled: true },
    // Ensure buttons have accessible names
    'button-name': { enabled: true },
    // Ensure links have accessible names
    'link-name': { enabled: true },
    // Ensure headings are in proper order
    'heading-order': { enabled: true },
    // Ensure page has a main landmark
    'landmark-main-is-top-level': { enabled: true },
    // Ensure ARIA attributes are valid
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'aria-allowed-attr': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-roles': { enabled: true },
    // Ensure tabindex values are valid
    'tabindex': { enabled: true },
    // Ensure focus is visible
    'focus-order-semantics': { enabled: true },
    // Ensure document has a title
    'document-title': { enabled: true },
    // Ensure html has lang attribute
    'html-has-lang': { enabled: true },
    // Ensure page has skip links
    'bypass': { enabled: true },
  },
};

// Custom rule configuration for specific component types
export const formAccessibilityConfig: RunOptions = {
  ...wcag21AAConfig,
  rules: {
    ...wcag21AAConfig.rules,
    // Form-specific rules
    'autocomplete-valid': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'select-name': { enabled: true },
  },
};

export const tableAccessibilityConfig: RunOptions = {
  ...wcag21AAConfig,
  rules: {
    ...wcag21AAConfig.rules,
    // Table-specific rules
    'table-duplicate-name': { enabled: true },
    'th-has-data-cells': { enabled: true },
    'td-headers-attr': { enabled: true },
    'scope-attr-valid': { enabled: true },
  },
};

/**
 * Format axe results for readable test output
 */
export function formatA11yViolations(violations: AxeResults['violations']): string {
  if (violations.length === 0) {
    return 'No accessibility violations found';
  }

  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => {
          return `
    - Element: ${node.html}
      Target: ${node.target.join(', ')}
      Fix: ${node.failureSummary}`;
        })
        .join('\n');

      return `
Rule: ${violation.id}
Impact: ${violation.impact}
Description: ${violation.description}
Help: ${violation.help}
Help URL: ${violation.helpUrl}
Nodes:${nodes}
`;
    })
    .join('\n---\n');
}

/**
 * Get violation counts by impact level
 */
export function getViolationStats(violations: AxeResults['violations']): {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  total: number;
} {
  const stats = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    total: violations.length,
  };

  violations.forEach((violation) => {
    switch (violation.impact) {
      case 'critical':
        stats.critical++;
        break;
      case 'serious':
        stats.serious++;
        break;
      case 'moderate':
        stats.moderate++;
        break;
      case 'minor':
        stats.minor++;
        break;
    }
  });

  return stats;
}

/**
 * Filter violations by impact level
 */
export function filterViolationsByImpact(
  violations: AxeResults['violations'],
  minImpact: 'critical' | 'serious' | 'moderate' | 'minor'
): AxeResults['violations'] {
  const impactLevels = ['minor', 'moderate', 'serious', 'critical'];
  const minIndex = impactLevels.indexOf(minImpact);

  return violations.filter((violation) => {
    const violationIndex = impactLevels.indexOf(violation.impact || 'minor');
    return violationIndex >= minIndex;
  });
}

/**
 * Test accessibility with axe-core
 * This function can be used directly with axe-core for more control
 */
export async function runAxe(
  element: Element | Document,
  options: RunOptions = wcag21AAConfig
): Promise<AxeResults> {
  // Dynamically import axe-core to avoid issues in non-test environments
  const axe = await import('axe-core');
  return axe.default.run(element, options);
}

/**
 * Expect no accessibility violations (for use in tests)
 * Throws an error with detailed information if violations are found
 */
export async function expectNoA11yViolations(
  element: Element | Document,
  options: RunOptions = wcag21AAConfig
): Promise<void> {
  const results = await runAxe(element, options);

  if (results.violations.length > 0) {
    const stats = getViolationStats(results.violations);
    const formattedViolations = formatA11yViolations(results.violations);

    throw new Error(
      `Found ${stats.total} accessibility violation(s):
${stats.critical > 0 ? `  - Critical: ${stats.critical}` : ''}
${stats.serious > 0 ? `  - Serious: ${stats.serious}` : ''}
${stats.moderate > 0 ? `  - Moderate: ${stats.moderate}` : ''}
${stats.minor > 0 ? `  - Minor: ${stats.minor}` : ''}

${formattedViolations}`
    );
  }
}

/**
 * Test accessibility and return results without throwing
 */
export async function testAccessibility(
  element: Element | Document,
  options: RunOptions = wcag21AAConfig
): Promise<{
  passes: boolean;
  violations: AxeResults['violations'];
  passes_count: number;
  violations_count: number;
  stats: ReturnType<typeof getViolationStats>;
}> {
  const results = await runAxe(element, options);
  const stats = getViolationStats(results.violations);

  return {
    passes: results.violations.length === 0,
    violations: results.violations,
    passes_count: results.passes.length,
    violations_count: results.violations.length,
    stats,
  };
}

/**
 * Create a custom matcher for vitest
 * Add this to your test setup file:
 *
 * import { expect } from 'vitest';
 * import { toHaveNoA11yViolations } from '@/test/accessibility-utils';
 * expect.extend({ toHaveNoA11yViolations });
 */
export async function toHaveNoA11yViolations(
  received: Element | Document,
  options: RunOptions = wcag21AAConfig
) {
  const results = await runAxe(received, options);

  if (results.violations.length === 0) {
    return {
      pass: true,
      message: () => 'Expected accessibility violations but found none',
    };
  }

  const formattedViolations = formatA11yViolations(results.violations);
  const stats = getViolationStats(results.violations);

  return {
    pass: false,
    message: () =>
      `Found ${stats.total} accessibility violation(s):\n${formattedViolations}`,
  };
}

/**
 * Accessibility test helpers for specific component types
 */
export const a11yTestHelpers = {
  /**
   * Test form accessibility
   */
  async testForm(formElement: Element): Promise<ReturnType<typeof testAccessibility>> {
    return testAccessibility(formElement, formAccessibilityConfig);
  },

  /**
   * Test table accessibility
   */
  async testTable(tableElement: Element): Promise<ReturnType<typeof testAccessibility>> {
    return testAccessibility(tableElement, tableAccessibilityConfig);
  },

  /**
   * Test navigation accessibility
   */
  async testNavigation(navElement: Element): Promise<ReturnType<typeof testAccessibility>> {
    return testAccessibility(navElement, {
      ...wcag21AAConfig,
      rules: {
        ...wcag21AAConfig.rules,
        'aria-allowed-role': { enabled: true },
      },
    });
  },

  /**
   * Test modal/dialog accessibility
   */
  async testModal(modalElement: Element): Promise<ReturnType<typeof testAccessibility>> {
    return testAccessibility(modalElement, {
      ...wcag21AAConfig,
      rules: {
        ...wcag21AAConfig.rules,
        'aria-dialog-name': { enabled: true },
      },
    });
  },
};

/**
 * Color contrast utilities
 */
export const contrastUtils = {
  /**
   * Calculate luminance of a color
   */
  getLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  },

  /**
   * Calculate contrast ratio between two colors
   */
  getContrastRatio(color1: [number, number, number], color2: [number, number, number]): number {
    const lum1 = this.getLuminance(...color1);
    const lum2 = this.getLuminance(...color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  },

  /**
   * Check if contrast ratio meets WCAG AA for normal text (4.5:1)
   */
  meetsWCAGAA(contrastRatio: number): boolean {
    return contrastRatio >= 4.5;
  },

  /**
   * Check if contrast ratio meets WCAG AA for large text (3:1)
   */
  meetsWCAGAALargeText(contrastRatio: number): boolean {
    return contrastRatio >= 3;
  },

  /**
   * Check if contrast ratio meets WCAG AAA for normal text (7:1)
   */
  meetsWCAGAAA(contrastRatio: number): boolean {
    return contrastRatio >= 7;
  },

  /**
   * Parse hex color to RGB
   */
  hexToRgb(hex: string): [number, number, number] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : null;
  },
};

export default {
  wcag21AAConfig,
  formAccessibilityConfig,
  tableAccessibilityConfig,
  formatA11yViolations,
  getViolationStats,
  filterViolationsByImpact,
  runAxe,
  expectNoA11yViolations,
  testAccessibility,
  toHaveNoA11yViolations,
  a11yTestHelpers,
  contrastUtils,
};
