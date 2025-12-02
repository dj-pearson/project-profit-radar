import { useEffect, useRef, useCallback } from 'react';

interface WebVitalsMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  inp?: number;
  ttfb?: number;
}

interface PerformanceConfig {
  enableReporting?: boolean;
  enableConsoleLogging?: boolean;
  thresholds?: {
    lcp: number;
    fid: number;
    cls: number;
    inp: number;
    ttfb: number;
  };
}

const defaultConfig: PerformanceConfig = {
  enableReporting: true,
  enableConsoleLogging: true,
  thresholds: {
    lcp: 2500,  // Good: ≤2.5s
    fid: 100,   // Good: ≤100ms
    cls: 0.1,   // Good: ≤0.1
    inp: 200,   // Good: ≤200ms
    ttfb: 800   // Good: ≤800ms
  }
};

export const usePerformanceMonitor = (config: PerformanceConfig = defaultConfig) => {
  const metricsRef = useRef<WebVitalsMetrics>({});
  const observersRef = useRef<PerformanceObserver[]>([]);

  const reportMetric = useCallback((name: string, value: number, threshold: number) => {
    metricsRef.current[name as keyof WebVitalsMetrics] = value;
    
    if (config.enableConsoleLogging) {
      const status = value <= threshold ? '✅' : '❌';
    }

    // Report to analytics if enabled
    if (config.enableReporting && value > threshold) {
      // Send to Google Analytics or other analytics service
      if (typeof gtag !== 'undefined') {
        gtag('event', 'web_vitals_poor', {
          metric_name: name,
          metric_value: Math.round(value),
          metric_threshold: threshold,
          event_category: 'performance'
        });
      }
    }
  }, [config]);

  useEffect(() => {
    // Monitor Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      reportMetric('lcp', lastEntry.startTime, config.thresholds?.lcp || 2500);
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    observersRef.current.push(lcpObserver);

    // Monitor Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      reportMetric('cls', clsValue, config.thresholds?.cls || 0.1);
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
    observersRef.current.push(clsObserver);

    // Monitor First Input Delay (FID) and Interaction to Next Paint (INP)
    const interactionObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'first-input') {
          reportMetric('fid', (entry as any).processingStart - entry.startTime, config.thresholds?.fid || 100);
        }
        if (entry.entryType === 'event' && (entry as any).interactionId) {
          const duration = (entry as any).duration;
          if (duration > 0) {
            reportMetric('inp', duration, config.thresholds?.inp || 200);
          }
        }
      }
    });
    interactionObserver.observe({ entryTypes: ['first-input', 'event'] });
    observersRef.current.push(interactionObserver);

    // Monitor Time to First Byte (TTFB)
    const navigationEntries = performance.getEntriesByType('navigation');
    if (navigationEntries.length > 0) {
      const navEntry = navigationEntries[0] as PerformanceNavigationTiming;
      const ttfb = navEntry.responseStart - navEntry.requestStart;
      reportMetric('ttfb', ttfb, config.thresholds?.ttfb || 800);
    }

    // Cleanup observers
    return () => {
      observersRef.current.forEach(observer => observer.disconnect());
    };
  }, [reportMetric, config.thresholds]);

  // Return current metrics
  return {
    metrics: metricsRef.current,
    getMetrics: () => ({ ...metricsRef.current })
  };
};

// Enhanced performance monitoring with real user metrics (RUM)
export const useRealUserMetrics = () => {
  const performanceData = useRef({
    pageLoadTime: 0,
    resourceLoadTime: 0,
    domContentLoaded: 0,
    timeToInteractive: 0,
    connectionType: 'unknown',
    deviceMemory: 'unknown'
  });

  useEffect(() => {
    // Collect navigation timing
    window.addEventListener('load', () => {
      const perfData = performance.timing;
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      performanceData.current = {
        pageLoadTime: perfData.loadEventEnd - perfData.navigationStart,
        resourceLoadTime: perfData.loadEventEnd - perfData.domContentLoadedEventEnd,
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
        timeToInteractive: navigation.domInteractive - navigation.fetchStart,
        connectionType: (navigator as any).connection?.effectiveType || 'unknown',
        deviceMemory: (navigator as any).deviceMemory || 'unknown'
      };

      // Log performance data

      // Report slow pages to analytics
      if (performanceData.current.pageLoadTime > 3000) {
        if (typeof gtag !== 'undefined') {
          gtag('event', 'slow_page_load', {
            load_time: performanceData.current.pageLoadTime,
            connection_type: performanceData.current.connectionType,
            device_memory: performanceData.current.deviceMemory,
            event_category: 'performance'
          });
        }
      }
    });
  }, []);

  return performanceData.current;
};

export default usePerformanceMonitor;
