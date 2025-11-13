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
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(active: boolean = false) {
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
 * Hook for unique ARIA IDs
 */
export function useAriaId(prefix: string = 'aria'): string {
  const [id] = useState(() => generateAriaId(prefix));
  return id;
}

/**
 * Hook for screen reader announcements
 */
export function useScreenReaderAnnouncement() {
  const [message, setMessage] = useState('');
  const announceRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((text: string, priority: 'polite' | 'assertive' = 'polite') => {
    setMessage(text);

    // For immediate feedback
    announceToScreenReader(text);

    // Update ARIA live region priority
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

/**
 * Hook for detecting user's motion preferences
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() => prefersReducedMotion());

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = () => {
      setReducedMotion(mediaQuery.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return reducedMotion;
}

/**
 * Hook for detecting user's contrast preferences
 */
export function useHighContrast(): boolean {
  const [highContrast, setHighContrast] = useState(() => prefersHighContrast());

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');

    const handleChange = () => {
      setHighContrast(mediaQuery.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return highContrast;
}

/**
 * Hook for managing keyboard navigation
 */
export function useKeyboardNavigation(
  onNext?: () => void,
  onPrevious?: () => void,
  onEscape?: () => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          onNext?.();
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          onPrevious?.();
          break;
        case 'Escape':
          e.preventDefault();
          onEscape?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrevious, onEscape]);
}

/**
 * Hook for accessible skip links
 */
export function useSkipLink(targetId: string) {
  const skipToContent = useCallback(() => {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [targetId]);

  return skipToContent;
}

/**
 * Hook for managing focus indicators
 */
export function useFocusVisible() {
  const [isFocusVisible, setIsFocusVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let hadKeyboardEvent = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        hadKeyboardEvent = true;
      }
    };

    const handleMouseDown = () => {
      hadKeyboardEvent = false;
    };

    const handleFocus = () => {
      if (hadKeyboardEvent) {
        setIsFocusVisible(true);
      }
    };

    const handleBlur = () => {
      setIsFocusVisible(false);
    };

    element.addEventListener('keydown', handleKeyDown as any);
    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);

    return () => {
      element.removeEventListener('keydown', handleKeyDown as any);
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    };
  }, []);

  return { elementRef, isFocusVisible };
}

/**
 * Hook for managing accessible tooltips
 */
export function useAccessibleTooltip() {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const tooltipId = useAriaId('tooltip');
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const show = useCallback((e: React.MouseEvent | React.FocusEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
    setIsVisible(true);
  }, []);

  const hide = useCallback(() => {
    setIsVisible(false);
  }, []);

  const tooltipProps = {
    id: tooltipId,
    role: 'tooltip',
    ref: tooltipRef,
    style: {
      position: 'absolute' as const,
      left: `${position.x}px`,
      top: `${position.y}px`,
      transform: 'translate(-50%, -100%)',
      visibility: isVisible ? ('visible' as const) : ('hidden' as const),
    },
  };

  const triggerProps = {
    ref: triggerRef,
    'aria-describedby': tooltipId,
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
  };

  return { triggerProps, tooltipProps, isVisible };
}

/**
 * Hook for managing accessible disclosure widgets
 */
export function useDisclosure(defaultExpanded: boolean = false) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const buttonId = useAriaId('disclosure-button');
  const panelId = useAriaId('disclosure-panel');

  const toggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const buttonProps = {
    id: buttonId,
    'aria-expanded': isExpanded,
    'aria-controls': panelId,
    onClick: toggle,
  };

  const panelProps = {
    id: panelId,
    'aria-labelledby': buttonId,
    hidden: !isExpanded,
  };

  return { isExpanded, toggle, buttonProps, panelProps };
}

/**
 * Hook for managing accessible tabs
 */
export function useAccessibleTabs(defaultTab: number = 0) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const tablistId = useAriaId('tablist');
  const tabRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const getTabProps = (index: number) => ({
    id: `tab-${tablistId}-${index}`,
    role: 'tab',
    'aria-selected': activeTab === index,
    'aria-controls': `tabpanel-${tablistId}-${index}`,
    tabIndex: activeTab === index ? 0 : -1,
    onClick: () => setActiveTab(index),
    ref: (el: HTMLButtonElement | null) => {
      if (el) tabRefs.current.set(index, el);
      else tabRefs.current.delete(index);
    },
  });

  const getPanelProps = (index: number) => ({
    id: `tabpanel-${tablistId}-${index}`,
    role: 'tabpanel',
    'aria-labelledby': `tab-${tablistId}-${index}`,
    hidden: activeTab !== index,
    tabIndex: 0,
  });

  const tablistProps = {
    id: tablistId,
    role: 'tablist',
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTab = tabRefs.current.get(activeTab);
      if (!currentTab || document.activeElement !== currentTab) return;

      const tabCount = tabRefs.current.size;
      let newTab = activeTab;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          newTab = (activeTab + 1) % tabCount;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          newTab = (activeTab - 1 + tabCount) % tabCount;
          break;
        case 'Home':
          e.preventDefault();
          newTab = 0;
          break;
        case 'End':
          e.preventDefault();
          newTab = tabCount - 1;
          break;
        default:
          return;
      }

      setActiveTab(newTab);
      tabRefs.current.get(newTab)?.focus();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  return { activeTab, setActiveTab, tablistProps, getTabProps, getPanelProps };
}

/**
 * Hook for handling Escape key
 */
export function useEscapeKey(callback: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        callback();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [callback, enabled]);
}

/**
 * Hook for handling clicks outside an element
 */
export function useClickOutside<T extends HTMLElement = HTMLDivElement>(
  callback: () => void,
  enabled: boolean = true
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [callback, enabled]);

  return ref;
}
