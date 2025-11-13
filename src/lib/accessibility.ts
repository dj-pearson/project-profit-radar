/**
 * Accessibility Utilities for WCAG 2.1 AA Compliance
 * Provides helpers for keyboard navigation, focus management, and ARIA
 */

/**
 * Focus Management
 */

/**
 * Focus trap for modals and dialogs
 */
export class FocusTrap {
  private element: HTMLElement;
  private focusableElements: HTMLElement[] = [];
  private firstFocusableElement: HTMLElement | null = null;
  private lastFocusableElement: HTMLElement | null = null;
  private previousActiveElement: HTMLElement | null = null;

  constructor(element: HTMLElement) {
    this.element = element;
    this.updateFocusableElements();
  }

  /**
   * Get all focusable elements within the container
   */
  private updateFocusableElements() {
    const focusableSelectors = [
      'a[href]',
      'area[href]',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'button:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(',');

    this.focusableElements = Array.from(
      this.element.querySelectorAll<HTMLElement>(focusableSelectors)
    ).filter((el) => {
      // Filter out elements that are hidden or have display: none
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });

    this.firstFocusableElement = this.focusableElements[0] || null;
    this.lastFocusableElement =
      this.focusableElements[this.focusableElements.length - 1] || null;
  }

  /**
   * Activate the focus trap
   */
  activate() {
    this.previousActiveElement = document.activeElement as HTMLElement;
    this.updateFocusableElements();

    // Focus the first focusable element
    if (this.firstFocusableElement) {
      this.firstFocusableElement.focus();
    }

    // Add keyboard event listener
    this.element.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Deactivate the focus trap
   */
  deactivate() {
    this.element.removeEventListener('keydown', this.handleKeyDown);

    // Return focus to the previously focused element
    if (this.previousActiveElement) {
      this.previousActiveElement.focus();
    }
  }

  /**
   * Handle keyboard events for focus trap
   */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    this.updateFocusableElements();

    // Handle Shift+Tab (backwards)
    if (event.shiftKey) {
      if (document.activeElement === this.firstFocusableElement) {
        event.preventDefault();
        this.lastFocusableElement?.focus();
      }
    }
    // Handle Tab (forwards)
    else {
      if (document.activeElement === this.lastFocusableElement) {
        event.preventDefault();
        this.firstFocusableElement?.focus();
      }
    }
  };
}

/**
 * Keyboard Navigation Helpers
 */

export const KeyboardKeys = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  TAB: 'Tab',
} as const;

/**
 * Check if an element is visible
 */
export function isElementVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetParent !== null
  );
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement = document.body): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'area[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(',');

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors)).filter(
    isElementVisible
  );
}

/**
 * Move focus to next/previous focusable element
 */
export function moveFocus(
  currentElement: HTMLElement,
  direction: 'next' | 'previous',
  container: HTMLElement = document.body
) {
  const focusableElements = getFocusableElements(container);
  const currentIndex = focusableElements.indexOf(currentElement);

  if (currentIndex === -1) return;

  let targetIndex: number;
  if (direction === 'next') {
    targetIndex = (currentIndex + 1) % focusableElements.length;
  } else {
    targetIndex = (currentIndex - 1 + focusableElements.length) % focusableElements.length;
  }

  focusableElements[targetIndex]?.focus();
}

/**
 * ARIA Helpers
 */

/**
 * Generate a unique ID for ARIA relationships
 */
let idCounter = 0;
export function generateAriaId(prefix: string = 'aria'): string {
  return `${prefix}-${++idCounter}-${Date.now()}`;
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Color Contrast Validation (WCAG AA: 4.5:1 for normal text, 3:1 for large text)
 */

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 0;

  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color contrast meets WCAG AA standards
 */
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const minimumRatio = isLargeText ? 3 : 4.5;
  return ratio >= minimumRatio;
}

/**
 * Keyboard Navigation for Lists
 */
export function handleListKeyboardNavigation(
  event: KeyboardEvent,
  currentIndex: number,
  items: HTMLElement[],
  options: {
    orientation?: 'vertical' | 'horizontal';
    loop?: boolean;
    onSelect?: (index: number) => void;
  } = {}
) {
  const { orientation = 'vertical', loop = true, onSelect } = options;

  const isVertical = orientation === 'vertical';
  const nextKey = isVertical ? KeyboardKeys.ARROW_DOWN : KeyboardKeys.ARROW_RIGHT;
  const prevKey = isVertical ? KeyboardKeys.ARROW_UP : KeyboardKeys.ARROW_LEFT;

  let newIndex = currentIndex;

  switch (event.key) {
    case nextKey:
      event.preventDefault();
      newIndex = currentIndex + 1;
      if (newIndex >= items.length) {
        newIndex = loop ? 0 : items.length - 1;
      }
      break;

    case prevKey:
      event.preventDefault();
      newIndex = currentIndex - 1;
      if (newIndex < 0) {
        newIndex = loop ? items.length - 1 : 0;
      }
      break;

    case KeyboardKeys.HOME:
      event.preventDefault();
      newIndex = 0;
      break;

    case KeyboardKeys.END:
      event.preventDefault();
      newIndex = items.length - 1;
      break;

    case KeyboardKeys.ENTER:
    case KeyboardKeys.SPACE:
      event.preventDefault();
      onSelect?.(currentIndex);
      return currentIndex;

    default:
      return currentIndex;
  }

  items[newIndex]?.focus();
  return newIndex;
}

/**
 * Skip Link Helpers
 */
export function createSkipLink(target: string, text: string): HTMLAnchorElement {
  const skipLink = document.createElement('a');
  skipLink.href = `#${target}`;
  skipLink.textContent = text;
  skipLink.className = 'skip-link';

  skipLink.addEventListener('click', (e) => {
    e.preventDefault();
    const targetElement = document.getElementById(target);
    if (targetElement) {
      targetElement.setAttribute('tabindex', '-1');
      targetElement.focus();
      targetElement.addEventListener('blur', () => {
        targetElement.removeAttribute('tabindex');
      });
    }
  });

  return skipLink;
}

/**
 * Reduced Motion Detection
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * High Contrast Detection
 */
export function prefersHighContrast(): boolean {
  return (
    window.matchMedia('(prefers-contrast: high)').matches ||
    window.matchMedia('(-ms-high-contrast: active)').matches
  );
}

/**
 * Focus Visible Polyfill Helper
 */
export function setupFocusVisible() {
  let hadKeyboardEvent = false;
  let hadFocusVisibleRecently = false;
  let hadFocusVisibleRecentlyTimeout: number | null = null;

  const inputTypesWhitelist = {
    text: true,
    search: true,
    url: true,
    tel: true,
    email: true,
    password: true,
    number: true,
    date: true,
    month: true,
    week: true,
    time: true,
    datetime: true,
    'datetime-local': true,
  };

  function onKeyDown(e: KeyboardEvent) {
    if (e.metaKey || e.altKey || e.ctrlKey) {
      return;
    }
    hadKeyboardEvent = true;
  }

  function onPointerDown() {
    hadKeyboardEvent = false;
  }

  function onFocus(e: FocusEvent) {
    const target = e.target as HTMLElement;

    if (target.classList.contains('focus-visible')) {
      return;
    }

    if (
      hadKeyboardEvent ||
      (target.tagName === 'INPUT' &&
        inputTypesWhitelist[(target as HTMLInputElement).type]) ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      target.classList.add('focus-visible');
      hadFocusVisibleRecently = true;

      if (hadFocusVisibleRecentlyTimeout !== null) {
        clearTimeout(hadFocusVisibleRecentlyTimeout);
      }

      hadFocusVisibleRecentlyTimeout = window.setTimeout(() => {
        hadFocusVisibleRecently = false;
        hadFocusVisibleRecentlyTimeout = null;
      }, 100);
    }
  }

  function onBlur(e: FocusEvent) {
    const target = e.target as HTMLElement;
    target.classList.remove('focus-visible');
  }

  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('mousedown', onPointerDown, true);
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('touchstart', onPointerDown, true);
  document.addEventListener('focus', onFocus, true);
  document.addEventListener('blur', onBlur, true);
}
