/**
 * Mobile Touch Target Optimization
 * Ensures all interactive elements meet minimum touch target size (44x44px)
 * Following WCAG 2.1 Level AAA guidelines and Apple/Google design standards
 */

/**
 * Minimum touch target size in pixels
 * Apple HIG: 44x44pt, Material Design: 48x48dp
 * WCAG 2.1 Level AAA: 44x44px minimum
 */
export const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * Recommended touch target spacing in pixels
 */
export const TOUCH_TARGET_SPACING = 8;

/**
 * Touch target size classes for Tailwind
 */
export const touchTargetClasses = {
  /** Minimum touch target (44x44px) */
  min: 'min-h-[44px] min-w-[44px]',

  /** Standard touch target (48x48px) */
  standard: 'min-h-[48px] min-w-[48px]',

  /** Large touch target (56x56px) */
  large: 'min-h-[56px] min-w-[56px]',

  /** Extra large touch target (64x64px) */
  xl: 'min-h-[64px] min-w-[64px]',

  /** Touch target spacing */
  spacing: 'gap-2 md:gap-3',

  /** Minimum padding for touch targets */
  padding: 'p-3',
} as const;

/**
 * Check if an element meets minimum touch target size
 */
export function isTouchTargetValid(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width >= MIN_TOUCH_TARGET_SIZE && rect.height >= MIN_TOUCH_TARGET_SIZE;
}

/**
 * Get touch-friendly button classes
 */
export function getTouchButtonClasses(size: 'sm' | 'md' | 'lg' = 'md'): string {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

  const sizeClasses = {
    sm: 'h-11 px-4 text-sm', // 44px height
    md: 'h-12 px-6 text-base', // 48px height
    lg: 'h-14 px-8 text-lg', // 56px height
  };

  return `${baseClasses} ${sizeClasses[size]}`;
}

/**
 * Get touch-friendly input classes
 */
export function getTouchInputClasses(): string {
  return 'h-12 px-4 text-base rounded-md border border-input bg-background'; // 48px height
}

/**
 * Get touch-friendly icon button classes
 */
export function getTouchIconButtonClasses(size: 'sm' | 'md' | 'lg' = 'md'): string {
  const sizeClasses = {
    sm: 'h-11 w-11', // 44px
    md: 'h-12 w-12', // 48px
    lg: 'h-14 w-14', // 56px
  };

  return `inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${sizeClasses[size]}`;
}

/**
 * Detect if device is touch-enabled
 */
export function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - msMaxTouchPoints is IE specific
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Detect if device is mobile based on screen size
 */
export function isMobileDevice(): boolean {
  return window.innerWidth < 768; // Below md breakpoint
}

/**
 * Get recommended spacing between touch targets
 */
export function getTouchSpacing(inline: boolean = false): string {
  return inline ? 'gap-2 md:gap-3' : 'space-y-2 md:space-y-3';
}

/**
 * Utility to add haptic feedback on touch (iOS/Android)
 */
export function triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'medium') {
  // Check if Haptics API is available (Capacitor)
  if ('Capacitor' in window) {
    import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
      const style = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      }[type];

      Haptics.impact({ style });
    }).catch(() => {
      // Haptics not available, silently fail
    });
  }
}

/**
 * Add touch ripple effect to an element
 */
export function addTouchRipple(element: HTMLElement, event: TouchEvent | MouseEvent) {
  const ripple = document.createElement('span');
  const rect = element.getBoundingClientRect();

  const size = Math.max(rect.width, rect.height);
  const x = (event as TouchEvent).touches
    ? (event as TouchEvent).touches[0].clientX - rect.left - size / 2
    : (event as MouseEvent).clientX - rect.left - size / 2;
  const y = (event as TouchEvent).touches
    ? (event as TouchEvent).touches[0].clientY - rect.top - size / 2
    : (event as MouseEvent).clientY - rect.top - size / 2;

  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.className = 'touch-ripple';

  element.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 600);
}

/**
 * CSS classes for touch ripple effect
 * Add these to your global CSS:
 *
 * .touch-ripple {
 *   position: absolute;
 *   border-radius: 50%;
 *   background-color: currentColor;
 *   opacity: 0.3;
 *   pointer-events: none;
 *   animation: ripple 600ms ease-out;
 * }
 *
 * @keyframes ripple {
 *   to {
 *     transform: scale(2);
 *     opacity: 0;
 *   }
 * }
 */
