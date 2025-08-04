import { useState, useEffect } from 'react';

interface PerformanceMetrics {
  fcp: number | null; // First Contentful Paint
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  ttfb: number | null; // Time to First Byte
}

export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null
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
        }
      }
    });

    // Observe different performance metrics
    try {
      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift', 'navigation'] });
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

    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : null;
  };

  return {
    metrics,
    performanceScore: getPerformanceScore(),
    isLoading: Object.values(metrics).every(val => val === null)
  };
};