/**
 * Touch Optimization Utilities
 *
 * Ensures all interactive elements meet accessibility and usability standards
 * for touch interfaces, particularly important for field workers.
 */

import { cn } from "./utils";

/**
 * Minimum touch target size per Apple and Material Design guidelines
 */
export const MIN_TOUCH_TARGET_SIZE = 44; // pixels

/**
 * Touch target size variants
 */
export const TOUCH_TARGET_SIZES = {
  sm: 36,   // Minimum for dense UIs
  md: 44,   // Standard recommended
  lg: 48,   // Comfortable for work gloves
  xl: 56,   // Extra comfortable for outdoor use
} as const;

/**
 * Touch-friendly spacing values
 */
export const TOUCH_SPACING = {
  tight: 4,    // 1rem = 16px, so 0.25rem
  normal: 8,   // 0.5rem
  comfortable: 12, // 0.75rem
  relaxed: 16, // 1rem
} as const;

/**
 * Get touch-friendly classes for buttons
 * Ensures minimum 44px touch targets with appropriate padding
 */
export function getTouchButtonClasses(size: keyof typeof TOUCH_TARGET_SIZES = 'md') {
  const targetSize = TOUCH_TARGET_SIZES[size];

  return cn(
    // Minimum height
    `min-h-[${targetSize}px]`,
    // Minimum width for icon buttons
    'min-w-[44px]',
    // Appropriate padding
    size === 'sm' && 'px-3 py-2',
    size === 'md' && 'px-4 py-2.5',
    size === 'lg' && 'px-5 py-3',
    size === 'xl' && 'px-6 py-3.5',
    // Active state feedback for touch
    'active:scale-95 transition-transform',
    // Prevent text selection on double tap
    'select-none',
    // Prevent touch callout on iOS
    'touch-manipulation',
  );
}

/**
 * Get touch-friendly classes for icon buttons
 */
export function getTouchIconButtonClasses(size: keyof typeof TOUCH_TARGET_SIZES = 'md') {
  const targetSize = TOUCH_TARGET_SIZES[size];

  return cn(
    // Square touch target
    `h-[${targetSize}px] w-[${targetSize}px]`,
    // Center icon
    'inline-flex items-center justify-center',
    // Touch feedback
    'active:scale-90 transition-transform',
    'select-none touch-manipulation',
  );
}

/**
 * Get touch-friendly spacing between interactive elements
 */
export function getTouchSpacingClasses(variant: keyof typeof TOUCH_SPACING = 'normal') {
  const spacing = TOUCH_SPACING[variant];
  return `gap-${spacing / 4}`; // Tailwind uses 4px scale
}

/**
 * Hook to detect if user is on a touch device
 */
export function useIsTouchDevice() {
  if (typeof window === 'undefined') return false;

  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - legacy check
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Verify an element meets minimum touch target requirements
 */
export function verifyTouchTarget(element: HTMLElement): {
  width: number;
  height: number;
  meetsMinimum: boolean;
  warnings: string[];
} {
  const rect = element.getBoundingClientRect();
  const warnings: string[] = [];

  if (rect.width < MIN_TOUCH_TARGET_SIZE) {
    warnings.push(`Width ${rect.width}px is below minimum ${MIN_TOUCH_TARGET_SIZE}px`);
  }

  if (rect.height < MIN_TOUCH_TARGET_SIZE) {
    warnings.push(`Height ${rect.height}px is below minimum ${MIN_TOUCH_TARGET_SIZE}px`);
  }

  return {
    width: rect.width,
    height: rect.height,
    meetsMinimum: warnings.length === 0,
    warnings,
  };
}

/**
 * CSS classes for touch-optimized forms
 */
export const touchFormClasses = {
  // Form fields
  input: cn(
    'min-h-[44px]',
    'text-base', // Prevent zoom on iOS
    'px-4 py-2.5',
    'touch-manipulation',
  ),

  // Select dropdowns
  select: cn(
    'min-h-[44px]',
    'text-base',
    'px-4 py-2.5',
    'touch-manipulation',
  ),

  // Checkboxes and radios
  checkbox: cn(
    'h-6 w-6', // Larger than default
    'touch-manipulation',
  ),

  // Labels (clickable area)
  label: cn(
    'min-h-[44px]',
    'inline-flex items-center',
    'cursor-pointer',
    'select-none',
  ),

  // Form spacing
  fieldSpacing: 'space-y-4', // More space between fields
};

/**
 * Touch-friendly list item classes
 */
export const touchListClasses = {
  item: cn(
    'min-h-[56px]', // Slightly taller for better touch
    'px-4 py-3',
    'flex items-center',
    'active:bg-muted',
    'touch-manipulation',
  ),

  itemWithIcon: cn(
    'min-h-[56px]',
    'px-4 py-3',
    'flex items-center gap-3',
    'active:bg-muted',
    'touch-manipulation',
  ),
};

/**
 * Haptic feedback helper (when supported)
 */
export function triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light') {
  // Check if Haptic Feedback API is available (mainly iOS)
  if ('vibrate' in navigator) {
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 30,
    };

    navigator.vibrate(patterns[type]);
  }
}

/**
 * Touch gesture helpers
 */
export interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

/**
 * Hook for handling swipe gestures
 */
export function useTouchSwipe(
  handlers: SwipeHandlers,
  threshold: number = 50
) {
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;

    handleSwipe();
  };

  const handleSwipe = () => {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Determine primary direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0 && handlers.onSwipeRight) {
          handlers.onSwipeRight();
        } else if (deltaX < 0 && handlers.onSwipeLeft) {
          handlers.onSwipeLeft();
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > threshold) {
        if (deltaY > 0 && handlers.onSwipeDown) {
          handlers.onSwipeDown();
        } else if (deltaY < 0 && handlers.onSwipeUp) {
          handlers.onSwipeUp();
        }
      }
    }
  };

  return {
    onTouchStart,
    onTouchEnd,
  };
}

/**
 * Optimize element for work gloves usage
 * Extra large targets and increased contrast
 */
export const workGloveOptimization = {
  button: cn(
    'min-h-[56px]',
    'min-w-[56px]',
    'px-6 py-4',
    'text-lg font-semibold',
    'border-2', // Thicker borders for visibility
    'active:scale-95',
  ),

  icon: 'h-8 w-8', // Larger icons

  text: 'text-lg leading-relaxed', // Larger, more spaced text

  spacing: 'gap-6 space-y-6', // Extra spacing
};

/**
 * Outdoor mode optimization (bright sunlight)
 * High contrast, larger elements
 */
export const outdoorModeOptimization = {
  container: cn(
    'bg-white dark:bg-gray-900', // Solid backgrounds
    'border-2 border-gray-900 dark:border-white', // High contrast borders
  ),

  text: cn(
    'text-gray-900 dark:text-white',
    'font-semibold', // Bolder text
    'text-lg', // Larger text
  ),

  button: cn(
    'bg-gray-900 text-white dark:bg-white dark:text-gray-900',
    'border-4 border-gray-900 dark:border-white',
    'min-h-[56px]',
    'text-lg font-bold',
  ),
};
