/**
 * useSEOPerformance Hook
 *
 * Performance optimization hook for SEO-critical metrics.
 * Monitors and optimizes Core Web Vitals for better search rankings.
 *
 * Features:
 * - Lazy loading detection and optimization
 * - Image loading performance tracking
 * - Content visibility optimization
 * - Cumulative Layout Shift prevention
 * - First Contentful Paint optimization
 */

import { useEffect, useCallback, useRef, useState } from 'react';

interface PerformanceMetrics {
  lcpScore: number | null;
  clsScore: number | null;
  fcpScore: number | null;
  isAboveFold: boolean;
  imagesLoaded: number;
  totalImages: number;
}

interface UseSEOPerformanceOptions {
  /**
   * Enable lazy loading for below-fold content
   */
  enableLazyLoading?: boolean;

  /**
   * Preload critical resources
   */
  preloadCritical?: boolean;

  /**
   * Track image loading performance
   */
  trackImages?: boolean;

  /**
   * Callback when metrics are collected
   */
  onMetricsCollected?: (metrics: PerformanceMetrics) => void;
}

interface UseSEOPerformanceReturn {
  metrics: PerformanceMetrics;
  isContentVisible: boolean;
  optimizedImageProps: (src: string, alt: string, priority?: boolean) => ImageOptimizedProps;
  preloadImage: (src: string) => void;
  markContentReady: () => void;
}

interface ImageOptimizedProps {
  src: string;
  alt: string;
  loading: 'lazy' | 'eager';
  decoding: 'async' | 'sync';
  fetchPriority?: 'high' | 'low' | 'auto';
  onLoad?: () => void;
}

export const useSEOPerformance = (
  options: UseSEOPerformanceOptions = {}
): UseSEOPerformanceReturn => {
  const {
    enableLazyLoading = true,
    preloadCritical = true,
    trackImages = true,
    onMetricsCollected,
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    lcpScore: null,
    clsScore: null,
    fcpScore: null,
    isAboveFold: true,
    imagesLoaded: 0,
    totalImages: 0,
  });

  const [isContentVisible, setIsContentVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const contentReadyRef = useRef(false);

  // Track Core Web Vitals
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only track metrics in production
    if (process.env.NODE_ENV !== 'production') return;

    const trackLCP = () => {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          setMetrics(prev => ({
            ...prev,
            lcpScore: (lastEntry as PerformanceEntry).startTime,
          }));
        }
      });

      try {
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch {
        // LCP not supported
      }

      return lcpObserver;
    };

    const trackCLS = () => {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) {
            clsValue += (entry as PerformanceEntry & { value?: number }).value || 0;
          }
        }
        setMetrics(prev => ({
          ...prev,
          clsScore: clsValue,
        }));
      });

      try {
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch {
        // CLS not supported
      }

      return clsObserver;
    };

    const trackFCP = () => {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          setMetrics(prev => ({
            ...prev,
            fcpScore: fcpEntry.startTime,
          }));
        }
      });

      try {
        fcpObserver.observe({ type: 'paint', buffered: true });
      } catch {
        // FCP not supported
      }

      return fcpObserver;
    };

    const lcpObserver = trackLCP();
    const clsObserver = trackCLS();
    const fcpObserver = trackFCP();

    return () => {
      lcpObserver?.disconnect();
      clsObserver?.disconnect();
      fcpObserver?.disconnect();
    };
  }, []);

  // Track image loading
  useEffect(() => {
    if (!trackImages || typeof window === 'undefined') return;

    const images = document.querySelectorAll('img');
    const totalImages = images.length;

    setMetrics(prev => ({ ...prev, totalImages }));

    let loadedCount = 0;
    const handleImageLoad = () => {
      loadedCount++;
      setMetrics(prev => ({ ...prev, imagesLoaded: loadedCount }));
    };

    images.forEach(img => {
      if (img.complete) {
        loadedCount++;
      } else {
        img.addEventListener('load', handleImageLoad, { once: true });
      }
    });

    setMetrics(prev => ({ ...prev, imagesLoaded: loadedCount }));

    return () => {
      images.forEach(img => {
        img.removeEventListener('load', handleImageLoad);
      });
    };
  }, [trackImages]);

  // Content visibility observer
  useEffect(() => {
    if (typeof window === 'undefined' || !enableLazyLoading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsContentVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, [enableLazyLoading]);

  // Report metrics when collected
  useEffect(() => {
    if (
      metrics.lcpScore !== null &&
      metrics.clsScore !== null &&
      metrics.fcpScore !== null &&
      onMetricsCollected
    ) {
      onMetricsCollected(metrics);
    }
  }, [metrics, onMetricsCollected]);

  // Preload critical image
  const preloadImage = useCallback((src: string) => {
    if (!preloadCritical || typeof window === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  }, [preloadCritical]);

  // Get optimized image props
  const optimizedImageProps = useCallback(
    (src: string, alt: string, priority = false): ImageOptimizedProps => {
      const props: ImageOptimizedProps = {
        src,
        alt,
        loading: priority ? 'eager' : 'lazy',
        decoding: 'async',
      };

      if (priority) {
        props.fetchPriority = 'high';
        // Preload priority images
        if (preloadCritical) {
          preloadImage(src);
        }
      } else {
        props.fetchPriority = 'low';
      }

      return props;
    },
    [preloadCritical, preloadImage]
  );

  // Mark content as ready (for manual CLS prevention)
  const markContentReady = useCallback(() => {
    contentReadyRef.current = true;
    setIsContentVisible(true);
  }, []);

  return {
    metrics,
    isContentVisible,
    optimizedImageProps,
    preloadImage,
    markContentReady,
  };
};

/**
 * Hook for preloading critical resources
 */
export const useResourcePreload = (resources: string[], type: 'image' | 'script' | 'style' = 'image') => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const links: HTMLLinkElement[] = [];

    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;

      switch (type) {
        case 'script':
          link.as = 'script';
          break;
        case 'style':
          link.as = 'style';
          break;
        default:
          link.as = 'image';
      }

      document.head.appendChild(link);
      links.push(link);
    });

    return () => {
      links.forEach(link => link.remove());
    };
  }, [resources, type]);
};

/**
 * Hook for detecting if user has reduced motion preference
 */
export const useReducedMotion = (): boolean => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return reducedMotion;
};

/**
 * Hook for detecting connection speed
 */
export const useConnectionSpeed = (): 'slow' | 'fast' | 'unknown' => {
  const [speed, setSpeed] = useState<'slow' | 'fast' | 'unknown'>('unknown');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;

    if (connection) {
      const effectiveType = connection.effectiveType || '';
      if (['slow-2g', '2g'].includes(effectiveType)) {
        setSpeed('slow');
      } else if (['3g', '4g'].includes(effectiveType)) {
        setSpeed('fast');
      }
    }
  }, []);

  return speed;
};

export default useSEOPerformance;
