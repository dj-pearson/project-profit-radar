/**
 * React Hooks for Accessibility Features
 * Easy-to-use hooks for implementing WCAG 2.1 AA compliance
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  FocusTrap,
  generateAriaId,
  announceToScreenReader,
  prefersReducedMotion,
  prefersHighContrast,
} from '@/lib/accessibility';

/**
 * Hook for focus trap in modals/dialogs
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(active: boolean = false) {
  const elementRef = useRef<T>(null);
  const focusTrapRef = useRef<FocusTrap | null>(null);

  useEffect(() => {
    if (!elementRef.current || !active) return;

    if (!focusTrapRef.current) {
      focusTrapRef.current = new FocusTrap(elementRef.current);
    }

    focusTrapRef.current.activate();

    return () => {
      focusTrapRef.current?.deactivate();
    };
  }, [active]);

  return elementRef;
}

/**
 * Hook for generating stable ARIA IDs
 */
export function useAriaId(prefix?: string): string {
  const idRef = useRef<string>();

  if (!idRef.current) {
    idRef.current = generateAriaId(prefix);
  }

  return idRef.current;
}

/**
 * Hook for screen reader announcements
 */
export function useAnnounce() {
  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      announceToScreenReader(message, priority);
    },
    []
  );

  return announce;
}

/**
 * Hook for detecting user's motion preferences
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion());

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Fallback for older browsers
    else {
      // @ts-ignore
      mediaQuery.addListener(handleChange);
      // @ts-ignore
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return reducedMotion;
}

/**
 * Hook for detecting high contrast mode
 */
export function useHighContrast(): boolean {
  const [highContrast, setHighContrast] = useState(prefersHighContrast());

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');

    const handleChange = (event: MediaQueryListEvent) => {
      setHighContrast(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // @ts-ignore
      mediaQuery.addListener(handleChange);
      // @ts-ignore
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return highContrast;
}

/**
 * Hook for keyboard navigation in lists
 */
interface UseKeyboardListNavigationOptions {
  orientation?: 'vertical' | 'horizontal';
  loop?: boolean;
  onSelect?: (index: number) => void;
}

export function useKeyboardListNavigation(
  itemCount: number,
  options: UseKeyboardListNavigationOptions = {}
) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { orientation = 'vertical', loop = true, onSelect } = options;

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const isVertical = orientation === 'vertical';
      const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
      const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

      let newIndex = activeIndex;

      switch (event.key) {
        case nextKey:
          event.preventDefault();
          newIndex = activeIndex + 1;
          if (newIndex >= itemCount) {
            newIndex = loop ? 0 : itemCount - 1;
          }
          break;

        case prevKey:
          event.preventDefault();
          newIndex = activeIndex - 1;
          if (newIndex < 0) {
            newIndex = loop ? itemCount - 1 : 0;
          }
          break;

        case 'Home':
          event.preventDefault();
          newIndex = 0;
          break;

        case 'End':
          event.preventDefault();
          newIndex = itemCount - 1;
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          onSelect?.(activeIndex);
          return;

        default:
          return;
      }

      setActiveIndex(newIndex);
    },
    [activeIndex, itemCount, orientation, loop, onSelect]
  );

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
  };
}

/**
 * Hook for managing focus on mount/unmount
 */
export function useAutoFocus<T extends HTMLElement = HTMLElement>(
  shouldFocus: boolean = true
) {
  const elementRef = useRef<T>(null);

  useEffect(() => {
    if (shouldFocus && elementRef.current) {
      elementRef.current.focus();
    }
  }, [shouldFocus]);

  return elementRef;
}

/**
 * Hook for escape key handling
 */
export function useEscapeKey(callback: () => void, active: boolean = true) {
  useEffect(() => {
    if (!active) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callback();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [callback, active]);
}

/**
 * Hook for click outside detection
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  callback: () => void,
  active: boolean = true
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [callback, active]);

  return ref;
}

/**
 * Hook for roving tabindex (for toolbar/menu navigation)
 */
export function useRovingTabIndex(itemCount: number) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const getTabIndex = (index: number) => (index === focusedIndex ? 0 : -1);

  const handleKeyDown = (event: React.KeyboardEvent, currentIndex: number) => {
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        newIndex = (currentIndex + 1) % itemCount;
        break;

      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        newIndex = (currentIndex - 1 + itemCount) % itemCount;
        break;

      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;

      case 'End':
        event.preventDefault();
        newIndex = itemCount - 1;
        break;

      default:
        return;
    }

    setFocusedIndex(newIndex);
  };

  return {
    focusedIndex,
    setFocusedIndex,
    getTabIndex,
    handleKeyDown,
  };
}

/**
 * Hook for live region announcements (loading, updates, etc)
 */
export function useLiveRegion() {
  const [message, setMessage] = useState('');
  const announceRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((text: string, priority: 'polite' | 'assertive' = 'polite') => {
    setMessage(text);
    if (announceRef.current) {
      announceRef.current.setAttribute('aria-live', priority);
    }

    // Clear message after it's been announced
    setTimeout(() => setMessage(''), 1000);
  }, []);

  const LiveRegion = useCallback(
    () => (
      <div
        ref={announceRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {message}
      </div>
    ),
    [message]
  );

  return { announce, LiveRegion };
}
