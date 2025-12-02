/**
 * Real User Monitoring (RUM) Utilities
 * Track performance metrics by device, network, and user context
 */

import type { Metric } from 'web-vitals';

export interface RUMContext {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  connectionType: string;
  effectiveType: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  screenResolution: string;
  viewport: string;
  userAgent: string;
}

export interface RUMMetric extends Metric {
  context: RUMContext;
  timestamp: number;
  pageUrl: string;
  sessionId: string;
}

/**
 * Get device context for RUM
 */
export const getDeviceContext = (): RUMContext => {
  const ua = navigator.userAgent;
  const screenWidth = window.screen.width;
  
  // Detect device type
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (screenWidth < 768) {
    deviceType = 'mobile';
  } else if (screenWidth < 1024) {
    deviceType = 'tablet';
  }

  // Get network information
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  return {
    deviceType,
    connectionType: connection?.type || 'unknown',
    effectiveType: connection?.effectiveType || 'unknown',
    deviceMemory: (navigator as any).deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: ua,
  };
};

/**
 * Get or create session ID
 */
export const getSessionId = (): string => {
  const SESSION_KEY = 'rum_session_id';
  const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    const storedData = stored ? JSON.parse(stored) : null;

    if (storedData && Date.now() - storedData.timestamp < SESSION_DURATION) {
      return storedData.id;
    }

    // Create new session
    const newSessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      id: newSessionId,
      timestamp: Date.now(),
    }));

    return newSessionId;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
};

/**
 * Create RUM metric from Web Vitals metric
 */
export const createRUMMetric = (metric: Metric): RUMMetric => {
  return {
    ...metric,
    context: getDeviceContext(),
    timestamp: Date.now(),
    pageUrl: window.location.href,
    sessionId: getSessionId(),
  };
};

/**
 * Send RUM data to analytics endpoint
 */
export const sendRUMData = async (metric: RUMMetric): Promise<void> => {
  // In development, just log
  if (import.meta.env.DEV) {
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      device: metric.context.deviceType,
      connection: metric.context.effectiveType,
    });
    return;
  }

  // Send to analytics in production
  try {
    // Google Analytics 4
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', metric.name, {
        value: Math.round(metric.value),
        metric_rating: metric.rating,
        metric_delta: Math.round(metric.delta),
        event_category: 'Web Vitals',
        device_type: metric.context.deviceType,
        connection_type: metric.context.effectiveType,
        session_id: metric.sessionId,
      });
    }

    // Could also send to custom endpoint
    // await fetch('/api/rum', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(metric),
    // });
  } catch (error) {
    console.error('[RUM] Failed to send data:', error);
  }
};

/**
 * Track custom performance metric
 */
export const trackCustomMetric = (name: string, value: number, additionalData?: Record<string, any>): void => {
  if (import.meta.env.DEV) {
  }

  // Send to analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', name, {
      value: Math.round(value),
      event_category: 'Performance',
      ...additionalData,
    });
  }
};

/**
 * Track page load time
 */
export const trackPageLoad = (): void => {
  if (typeof window === 'undefined' || !window.performance) return;

  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      const domReadyTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;
      const dnsTime = perfData.domainLookupEnd - perfData.domainLookupStart;
      const tcpTime = perfData.connectEnd - perfData.connectStart;
      const requestTime = perfData.responseStart - perfData.requestStart;
      const responseTime = perfData.responseEnd - perfData.responseStart;

      trackCustomMetric('page_load', pageLoadTime, {
        domReady: domReadyTime,
        dns: dnsTime,
        tcp: tcpTime,
        request: requestTime,
        response: responseTime,
      });
    }, 0);
  });
};

/**
 * Track navigation timing
 */
export const trackNavigation = (): void => {
  if (typeof window === 'undefined' || !PerformanceObserver) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          
          trackCustomMetric('navigation', navEntry.duration, {
            redirectCount: navEntry.redirectCount,
            type: navEntry.type,
            domComplete: navEntry.domComplete,
            domInteractive: navEntry.domInteractive,
          });
        }
      }
    });

    observer.observe({ entryTypes: ['navigation'] });
  } catch (error) {
    console.error('[RUM] Navigation tracking failed:', error);
  }
};

/**
 * Track resource loading
 */
export const trackResourceLoading = (): void => {
  if (typeof window === 'undefined' || !PerformanceObserver) return;

  const slowResourceThreshold = 1000; // 1 second

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resourceEntry = entry as PerformanceResourceTiming;
        
        if (resourceEntry.duration > slowResourceThreshold) {
          trackCustomMetric('slow_resource', resourceEntry.duration, {
            name: resourceEntry.name,
            type: resourceEntry.initiatorType,
            size: resourceEntry.transferSize,
          });
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });
  } catch (error) {
    console.error('[RUM] Resource tracking failed:', error);
  }
};

/**
 * Initialize all RUM tracking
 */
export const initializeRUM = (): void => {
  if (typeof window === 'undefined') return;

  trackPageLoad();
  trackNavigation();
  trackResourceLoading();

};
