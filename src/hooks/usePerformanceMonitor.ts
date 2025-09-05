import { useState, useEffect } from 'react';

interface PerformanceMetrics {
  fcp: number | null; // First Contentful Paint
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  ttfb: number | null; // Time to First Byte
  inp: number | null; // Interaction to Next Paint
}

export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    inp: null
  });

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        switch (entry.entryType) {
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              setMetrics(prev => ({ ...prev, fcp: entry.startTime }));
            }
            break;
          
          case 'largest-contentful-paint':
            setMetrics(prev => ({ ...prev, lcp: entry.startTime }));
            break;
            
          case 'first-input':
            const fidEntry = entry as PerformanceEventTiming;
            setMetrics(prev => ({ ...prev, fid: fidEntry.processingStart - fidEntry.startTime }));
            break;
            
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              setMetrics(prev => ({ 
                ...prev, 
                cls: (prev.cls || 0) + (entry as any).value 
              }));
            }
            break;
            
          case 'navigation':
            const navEntry = entry as PerformanceNavigationTiming;
            setMetrics(prev => ({ 
              ...prev, 
              ttfb: navEntry.responseStart - navEntry.requestStart 
            }));
            break;
            
          case 'event':
            // INP (Interaction to Next Paint) - experimental
            if (entry.name === 'interaction') {
              const eventEntry = entry as PerformanceEventTiming;
              const duration = eventEntry.processingEnd - eventEntry.startTime;
              setMetrics(prev => ({ 
                ...prev, 
                inp: Math.max(prev.inp || 0, duration)
              }));
            }
            break;
        }
      }
    });

    // Observe different performance metrics
    try {
      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift', 'navigation', 'event'] });
    } catch (e) {
      // Fallback for browsers that don't support all entry types
      console.warn('Some performance metrics not available');
    }

    return () => observer.disconnect();
  }, []);

  const getPerformanceScore = () => {
    const scores = [];
    
    // FCP scoring (good < 1.8s, needs improvement < 3s, poor >= 3s)
    if (metrics.fcp !== null) {
      if (metrics.fcp < 1800) scores.push(100);
      else if (metrics.fcp < 3000) scores.push(75);
      else scores.push(25);
    }
    
    // LCP scoring (good < 2.5s, needs improvement < 4s, poor >= 4s)
    if (metrics.lcp !== null) {
      if (metrics.lcp < 2500) scores.push(100);
      else if (metrics.lcp < 4000) scores.push(75);
      else scores.push(25);
    }
    
    // FID scoring (good < 100ms, needs improvement < 300ms, poor >= 300ms)
    if (metrics.fid !== null) {
      if (metrics.fid < 100) scores.push(100);
      else if (metrics.fid < 300) scores.push(75);
      else scores.push(25);
    }
    
    // CLS scoring (good < 0.1, needs improvement < 0.25, poor >= 0.25)
    if (metrics.cls !== null) {
      if (metrics.cls < 0.1) scores.push(100);
      else if (metrics.cls < 0.25) scores.push(75);
      else scores.push(25);
    }
    
    // INP scoring (good < 200ms, needs improvement < 500ms, poor >= 500ms)
    if (metrics.inp !== null) {
      if (metrics.inp < 200) scores.push(100);
      else if (metrics.inp < 500) scores.push(75);
      else scores.push(25);
    }

    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : null;
  };

  const getMetrics = () => metrics;

  return {
    metrics,
    getMetrics,
    performanceScore: getPerformanceScore(),
    isLoading: Object.values(metrics).every(val => val === null)
  };
};

interface RealUserMetrics {
  pageLoadTime: number;
  domContentLoaded: number;
  connectionType: string;
  deviceMemory: number;
}

export const useRealUserMetrics = (): RealUserMetrics => {
  const [rumData, setRumData] = useState<RealUserMetrics>({
    pageLoadTime: 0,
    domContentLoaded: 0,
    connectionType: 'unknown',
    deviceMemory: 0
  });

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    const collectRealUserMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
        
        setRumData(prev => ({
          ...prev,
          pageLoadTime,
          domContentLoaded
        }));
      }

      // Get connection info if available
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setRumData(prev => ({
          ...prev,
          connectionType: connection?.effectiveType || 'unknown'
        }));
      }

      // Get device memory if available
      if ('deviceMemory' in navigator) {
        setRumData(prev => ({
          ...prev,
          deviceMemory: (navigator as any).deviceMemory || 0
        }));
      }
    };

    // Collect metrics when page is loaded
    if (document.readyState === 'complete') {
      collectRealUserMetrics();
    } else {
      window.addEventListener('load', collectRealUserMetrics);
    }

    return () => {
      window.removeEventListener('load', collectRealUserMetrics);
    };
  }, []);

  return rumData;
};