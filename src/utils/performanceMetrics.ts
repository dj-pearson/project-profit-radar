/**
 * Performance Metrics Collection and Reporting
 * Comprehensive Core Web Vitals and performance monitoring
 */

export interface WebVitalsData {
  lcp: number | null;
  cls: number;
  fid: number | null;
  inp: number | null;
  ttfb: number | null;
  fcpTime: number | null;
  url: string;
  timestamp: number;
  userAgent: string;
  connectionType: string;
  deviceMemory: number | null;
}

export interface PerformanceReport {
  metrics: WebVitalsData;
  resourceTiming: {
    totalResources: number;
    totalSize: number;
    largestResource: { name: string; size: number };
    slowestResource: { name: string; duration: number };
  };
  bundleAnalysis: {
    totalBundleSize: number;
    chunkCount: number;
    unusedCode: number;
  };
  recommendations: string[];
}

class PerformanceCollector {
  private metrics: Partial<WebVitalsData> = {};
  private observers: PerformanceObserver[] = [];
  private isCollecting = false;

  constructor() {
    this.initializeCollection();
  }

  private initializeCollection() {
    if (this.isCollecting) return;
    this.isCollecting = true;

    // Collect basic page info
    this.metrics = {
      url: window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      connectionType: this.getConnectionType(),
      deviceMemory: this.getDeviceMemory(),
      cls: 0
    };

    // Start collecting metrics
    this.collectLCP();
    this.collectCLS();
    this.collectFID();
    this.collectINP();
    this.collectTTFB();
    this.collectFCP();
  }

  private getConnectionType(): string {
    if ('connection' in navigator) {
      return (navigator as any).connection?.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  private getDeviceMemory(): number | null {
    if ('deviceMemory' in navigator) {
      return (navigator as any).deviceMemory || null;
    }
    return null;
  }

  private collectLCP() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.lcp = lastEntry.startTime;
      
      // Log LCP with rating
      const rating = lastEntry.startTime <= 2500 ? 'good' : 
                    lastEntry.startTime <= 4000 ? 'needs-improvement' : 'poor';
      console.log(`🎯 LCP: ${Math.round(lastEntry.startTime)}ms (${rating})`);
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });
    this.observers.push(observer);
  }

  private collectCLS() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          this.metrics.cls! += (entry as any).value;
        }
      }
      
      const rating = this.metrics.cls! <= 0.1 ? 'good' : 
                    this.metrics.cls! <= 0.25 ? 'needs-improvement' : 'poor';
      console.log(`📐 CLS: ${this.metrics.cls!.toFixed(3)} (${rating})`);
    });

    observer.observe({ entryTypes: ['layout-shift'] });
    this.observers.push(observer);
  }

  private collectFID() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'first-input') {
          const fid = (entry as any).processingStart - entry.startTime;
          this.metrics.fid = fid;
          
          const rating = fid <= 100 ? 'good' : fid <= 300 ? 'needs-improvement' : 'poor';
          console.log(`⚡ FID: ${Math.round(fid)}ms (${rating})`);
        }
      }
    });

    observer.observe({ entryTypes: ['first-input'] });
    this.observers.push(observer);
  }

  private collectINP() {
    let maxINP = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'event' && (entry as any).interactionId) {
          const duration = (entry as any).duration;
          maxINP = Math.max(maxINP, duration);
          this.metrics.inp = maxINP;
          
          if (duration > 200) {
            const rating = duration <= 200 ? 'good' : duration <= 500 ? 'needs-improvement' : 'poor';
            console.log(`🖱️ INP: ${Math.round(duration)}ms (${rating})`);
          }
        }
      }
    });

    observer.observe({ entryTypes: ['event'] });
    this.observers.push(observer);
  }

  private collectTTFB() {
    const navigationEntries = performance.getEntriesByType('navigation');
    if (navigationEntries.length > 0) {
      const navEntry = navigationEntries[0] as PerformanceNavigationTiming;
      const ttfb = navEntry.responseStart - navEntry.requestStart;
      this.metrics.ttfb = ttfb;
      
      const rating = ttfb <= 800 ? 'good' : ttfb <= 1800 ? 'needs-improvement' : 'poor';
      console.log(`🌐 TTFB: ${Math.round(ttfb)}ms (${rating})`);
    }
  }

  private collectFCP() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.metrics.fcpTime = fcpEntry.startTime;
        
        const rating = fcpEntry.startTime <= 1800 ? 'good' : 
                      fcpEntry.startTime <= 3000 ? 'needs-improvement' : 'poor';
        console.log(`🎨 FCP: ${Math.round(fcpEntry.startTime)}ms (${rating})`);
      }
    });

    observer.observe({ entryTypes: ['paint'] });
    this.observers.push(observer);
  }

  public getMetrics(): WebVitalsData {
    return {
      lcp: this.metrics.lcp || null,
      cls: this.metrics.cls || 0,
      fid: this.metrics.fid || null,
      inp: this.metrics.inp || null,
      ttfb: this.metrics.ttfb || null,
      fcpTime: this.metrics.fcpTime || null,
      url: this.metrics.url || '',
      timestamp: this.metrics.timestamp || Date.now(),
      userAgent: this.metrics.userAgent || '',
      connectionType: this.metrics.connectionType || 'unknown',
      deviceMemory: this.metrics.deviceMemory || null
    };
  }

  public generateReport(): PerformanceReport {
    const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    // Analyze resource timing
    const totalSize = resourceEntries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0);
    const largestResource = resourceEntries.reduce((largest, entry) => 
      (entry.transferSize || 0) > (largest.transferSize || 0) ? entry : largest
    );
    const slowestResource = resourceEntries.reduce((slowest, entry) => 
      entry.duration > slowest.duration ? entry : slowest
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations();

    return {
      metrics: this.getMetrics(),
      resourceTiming: {
        totalResources: resourceEntries.length,
        totalSize,
        largestResource: { 
          name: largestResource.name, 
          size: largestResource.transferSize || 0 
        },
        slowestResource: { 
          name: slowestResource.name, 
          duration: slowestResource.duration 
        }
      },
      bundleAnalysis: {
        totalBundleSize: totalSize,
        chunkCount: resourceEntries.filter(r => r.name.includes('.js')).length,
        unusedCode: 0 // Would need coverage API
      },
      recommendations
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.getMetrics();

    // LCP recommendations
    if (metrics.lcp && metrics.lcp > 2500) {
      recommendations.push('🎯 Improve LCP: Optimize largest content element, preload critical resources');
    }

    // CLS recommendations
    if (metrics.cls > 0.1) {
      recommendations.push('📐 Reduce CLS: Add size attributes to images, reserve space for dynamic content');
    }

    // FID/INP recommendations
    if ((metrics.fid && metrics.fid > 100) || (metrics.inp && metrics.inp > 200)) {
      recommendations.push('⚡ Improve responsiveness: Reduce JavaScript execution time, use web workers');
    }

    // TTFB recommendations
    if (metrics.ttfb && metrics.ttfb > 800) {
      recommendations.push('🌐 Improve TTFB: Optimize server response time, use CDN, enable compression');
    }

    // Resource-specific recommendations
    const resourceEntries = performance.getEntriesByType('resource');
    const largeResources = resourceEntries.filter(r => (r as any).transferSize > 500000);
    
    if (largeResources.length > 0) {
      recommendations.push(`📦 Optimize large resources: ${largeResources.length} resources >500KB detected`);
    }

    return recommendations;
  }

  public sendToAnalytics() {
    const report = this.generateReport();
    
    // Send to Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'web_vitals_report', {
        lcp: Math.round(report.metrics.lcp || 0),
        cls: Math.round((report.metrics.cls || 0) * 1000),
        fid: Math.round(report.metrics.fid || 0),
        inp: Math.round(report.metrics.inp || 0),
        ttfb: Math.round(report.metrics.ttfb || 0),
        total_resources: report.resourceTiming.totalResources,
        total_size_kb: Math.round(report.resourceTiming.totalSize / 1024),
        connection_type: report.metrics.connectionType,
        device_memory: report.metrics.deviceMemory,
        event_category: 'performance'
      });
    }

    // Send to custom analytics endpoint if available
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      }).catch(error => console.log('Performance reporting failed:', error));
    }
  }

  public cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.isCollecting = false;
  }
}

// Global performance collector instance
let performanceCollector: PerformanceCollector | null = null;

export const initializePerformanceMetrics = () => {
  if (performanceCollector) {
    performanceCollector.cleanup();
  }
  
  performanceCollector = new PerformanceCollector();
  
  // Report metrics after page is fully loaded
  window.addEventListener('load', () => {
    setTimeout(() => {
      performanceCollector?.sendToAnalytics();
    }, 5000); // Wait 5 seconds for all metrics to be collected
  });
  
  // Report on page unload
  window.addEventListener('beforeunload', () => {
    performanceCollector?.sendToAnalytics();
  });

  return performanceCollector;
};

export const getPerformanceMetrics = (): WebVitalsData | null => {
  return performanceCollector?.getMetrics() || null;
};

export const getPerformanceReport = (): PerformanceReport | null => {
  return performanceCollector?.generateReport() || null;
};

// Performance budget validation
export const validatePerformanceBudget = () => {
  const report = getPerformanceReport();
  if (!report) return { passed: false, violations: ['No performance data available'] };

  const violations: string[] = [];
  const budget = {
    lcp: 2500,
    cls: 0.1,
    fid: 100,
    inp: 200,
    ttfb: 800,
    totalSize: 2000000, // 2MB
    resourceCount: 50
  };

  // Check Core Web Vitals
  if (report.metrics.lcp && report.metrics.lcp > budget.lcp) {
    violations.push(`LCP exceeds budget: ${Math.round(report.metrics.lcp)}ms > ${budget.lcp}ms`);
  }
  
  if (report.metrics.cls > budget.cls) {
    violations.push(`CLS exceeds budget: ${report.metrics.cls.toFixed(3)} > ${budget.cls}`);
  }
  
  if (report.metrics.fid && report.metrics.fid > budget.fid) {
    violations.push(`FID exceeds budget: ${Math.round(report.metrics.fid)}ms > ${budget.fid}ms`);
  }
  
  if (report.metrics.inp && report.metrics.inp > budget.inp) {
    violations.push(`INP exceeds budget: ${Math.round(report.metrics.inp)}ms > ${budget.inp}ms`);
  }
  
  if (report.metrics.ttfb && report.metrics.ttfb > budget.ttfb) {
    violations.push(`TTFB exceeds budget: ${Math.round(report.metrics.ttfb)}ms > ${budget.ttfb}ms`);
  }

  // Check resource budget
  if (report.resourceTiming.totalSize > budget.totalSize) {
    violations.push(`Total size exceeds budget: ${Math.round(report.resourceTiming.totalSize / 1024)}KB > ${Math.round(budget.totalSize / 1024)}KB`);
  }
  
  if (report.resourceTiming.totalResources > budget.resourceCount) {
    violations.push(`Resource count exceeds budget: ${report.resourceTiming.totalResources} > ${budget.resourceCount}`);
  }

  return {
    passed: violations.length === 0,
    violations,
    score: Math.max(0, 100 - violations.length * 10)
  };
};

export default {
  initializePerformanceMetrics,
  getPerformanceMetrics,
  getPerformanceReport,
  validatePerformanceBudget
};
