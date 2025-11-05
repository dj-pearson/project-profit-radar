/**
 * Mobile-first utility functions
 */

/**
 * Check if viewport is in mobile range
 */
export function isMobileViewport(): boolean {
  return window.innerWidth < 768;
}

/**
 * Check if viewport is in tablet range
 */
export function isTabletViewport(): boolean {
  return window.innerWidth >= 768 && window.innerWidth < 1024;
}

/**
 * Check if device is likely a mobile device
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Get optimal touch target size (minimum 44x44px per Apple HIG and Material Design)
 */
export function getTouchTargetSize(size: 'small' | 'medium' | 'large' = 'medium'): string {
  const sizes = {
    small: '44px',   // Minimum recommended
    medium: '48px',  // Comfortable
    large: '56px',   // Extra comfortable
  };
  return sizes[size];
}

/**
 * Format numbers for mobile display (shorter format)
 */
export function formatNumberMobile(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Truncate text for mobile display
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Prevent body scroll (useful for modals on mobile)
 */
export function preventBodyScroll(prevent: boolean) {
  if (prevent) {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  } else {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  }
}

/**
 * Check if device has notch or safe area insets
 */
export function hasNotch(): boolean {
  // Check for safe area environment variables
  const safeAreaTop = getComputedStyle(document.documentElement)
    .getPropertyValue('--sat');
  return parseInt(safeAreaTop || '0') > 0;
}

/**
 * Vibrate device (if supported)
 */
export function vibrate(pattern: number | number[] = 10) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

/**
 * Get mobile-optimized spacing classes
 */
export function getMobileSpacing(size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md'): string {
  const spacing = {
    xs: 'p-2 md:p-3',
    sm: 'p-3 md:p-4',
    md: 'p-4 md:p-6',
    lg: 'p-6 md:p-8',
    xl: 'p-8 md:p-12',
  };
  return spacing[size];
}

/**
 * Get mobile-optimized text size classes
 */
export function getMobileTextSize(size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md'): string {
  const textSizes = {
    xs: 'text-xs md:text-sm',
    sm: 'text-sm md:text-base',
    md: 'text-base md:text-lg',
    lg: 'text-lg md:text-xl',
    xl: 'text-xl md:text-2xl',
  };
  return textSizes[size];
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Request fullscreen on mobile
 */
export async function requestFullscreen(element: HTMLElement = document.documentElement) {
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
    }
  } catch (err) {
    console.error('Fullscreen request failed:', err);
  }
}

/**
 * Exit fullscreen
 */
export async function exitFullscreen() {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    }
  } catch (err) {
    console.error('Exit fullscreen failed:', err);
  }
}

/**
 * Scroll to element with mobile-friendly offset
 */
export function scrollToElement(elementId: string, offset: number = 80) {
  const element = document.getElementById(elementId);
  if (element) {
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
}
