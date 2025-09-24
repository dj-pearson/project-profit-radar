import React, { useEffect } from 'react';

interface AdvancedCoreWebVitalsProps {
  enableReporting?: boolean;
  enableOptimization?: boolean;
  thresholds?: {
    lcp: number; // Largest Contentful Paint (ms)
    fid: number; // First Input Delay (ms)
    cls: number; // Cumulative Layout Shift
    fcp: number; // First Contentful Paint (ms)
    ttfb: number; // Time to First Byte (ms)
  };
}

export const AdvancedCoreWebVitals: React.FC<AdvancedCoreWebVitalsProps> = ({
  enableReporting = true,
  enableOptimization = true,
  thresholds = {
    lcp: 2500,
    fid: 100,
    cls: 0.1,
    fcp: 1800,
    ttfb: 600
  }
}) => {
  useEffect(() => {
    if (!enableReporting && !enableOptimization) return;

    const measurePerformance = async () => {
      if ('web-vitals' in window || typeof window !== 'undefined') {
        try {
          // Dynamic import for web-vitals (would need to be installed)
          // For now, we'll use Performance Observer API directly
          
          // Measure LCP
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            const lcp = lastEntry.startTime;
            
            if (enableReporting && window.gtag) {
              window.gtag('event', 'web_vitals', {
                name: 'LCP',
                value: Math.round(lcp),
                rating: lcp <= thresholds.lcp ? 'good' : lcp <= 4000 ? 'needs-improvement' : 'poor'
              });
            }

            if (enableOptimization && lcp > thresholds.lcp) {
              // Optimize images that might be causing slow LCP
              optimizeLCP();
            }
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

          // Measure FID
          const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              const fid = entry.processingStart - entry.startTime;
              
              if (enableReporting && window.gtag) {
                window.gtag('event', 'web_vitals', {
                  name: 'FID',
                  value: Math.round(fid),
                  rating: fid <= thresholds.fid ? 'good' : fid <= 300 ? 'needs-improvement' : 'poor'
                });
              }

              if (enableOptimization && fid > thresholds.fid) {
                // Defer non-critical JavaScript
                optimizeFID();
              }
            });
          });
          fidObserver.observe({ entryTypes: ['first-input'] });

          // Measure CLS
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            });

            if (enableReporting && window.gtag) {
              window.gtag('event', 'web_vitals', {
                name: 'CLS',
                value: Math.round(clsValue * 1000) / 1000,
                rating: clsValue <= thresholds.cls ? 'good' : clsValue <= 0.25 ? 'needs-improvement' : 'poor'
              });
            }

            if (enableOptimization && clsValue > thresholds.cls) {
              // Fix layout shift issues
              optimizeCLS();
            }
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });

        } catch (error) {
          console.warn('Core Web Vitals measurement failed:', error);
        }
      }
    };

    // Start measuring after page load
    if (document.readyState === 'complete') {
      measurePerformance();
    } else {
      window.addEventListener('load', measurePerformance);
    }

    return () => {
      window.removeEventListener('load', measurePerformance);
    };
  }, [enableReporting, enableOptimization, thresholds]);

  const optimizeLCP = () => {
    // Preload critical images
    const images = document.querySelectorAll('img[data-critical="true"]');
    images.forEach((img) => {
      if (img instanceof HTMLImageElement && !img.complete) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = img.src;
        document.head.appendChild(link);
      }
    });

    // Add loading="eager" to above-the-fold images
    const heroImages = document.querySelectorAll('img[data-hero="true"]');
    heroImages.forEach((img) => {
      if (img instanceof HTMLImageElement) {
        img.loading = 'eager';
        img.fetchPriority = 'high';
      }
    });
  };

  const optimizeFID = () => {
    // Defer non-critical scripts
    const scripts = document.querySelectorAll('script[data-defer="true"]');
    scripts.forEach((script) => {
      if (script instanceof HTMLScriptElement) {
        script.defer = true;
      }
    });

    // Use requestIdleCallback for non-critical operations
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        // Process non-critical tasks here
        const nonCriticalElements = document.querySelectorAll('[data-non-critical="true"]');
        nonCriticalElements.forEach((element) => {
          // Process non-critical elements during idle time
          element.classList.add('processed');
        });
      });
    }
  };

  const optimizeCLS = () => {
    // Add size attributes to images without them
    const images = document.querySelectorAll('img:not([width]):not([height])');
    images.forEach((img) => {
      if (img instanceof HTMLImageElement) {
        // Set aspect ratio to prevent layout shift
        img.style.aspectRatio = '16/9'; // Default aspect ratio
        img.style.width = '100%';
        img.style.height = 'auto';
      }
    });

    // Reserve space for dynamic content
    const dynamicElements = document.querySelectorAll('[data-dynamic="true"]');
    dynamicElements.forEach((element) => {
      if (element instanceof HTMLElement && !element.style.minHeight) {
        element.style.minHeight = '200px'; // Reserve minimum space
      }
    });
  };

  return null; // This component doesn't render anything visible
};

export default AdvancedCoreWebVitals;