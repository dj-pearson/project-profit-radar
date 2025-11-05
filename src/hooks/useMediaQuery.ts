import { useState, useEffect } from 'react';

/**
 * Hook to detect media query matches
 * @param query - CSS media query string
 * @returns boolean indicating if the query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Use addEventListener for modern browsers
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Predefined breakpoint hooks following Tailwind's mobile-first approach
 */
export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)');
}

export function useIsTablet() {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)');
}

export function useIsSmallMobile() {
  return useMediaQuery('(max-width: 639px)');
}

/**
 * Combined hook for responsive design decisions
 */
export function useBreakpoint() {
  const isSmallMobile = useIsSmallMobile();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();

  return {
    isSmallMobile,
    isMobile,
    isTablet,
    isDesktop,
    isMobileOrTablet: isMobile || isTablet,
    isTouch: isMobile || isTablet,
  };
}
