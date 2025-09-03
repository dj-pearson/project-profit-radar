/**
 * Performance Optimization Utilities for SEO
 * Implements Core Web Vitals improvements and technical SEO optimizations
 */

// Preload critical resources
export const preloadCriticalResources = () => {
  // Preload critical fonts
  const fontLink = document.createElement('link');
  fontLink.rel = 'preload';
  fontLink.href = '/fonts/inter-variable.woff2';
  fontLink.as = 'font';
  fontLink.type = 'font/woff2';
  fontLink.crossOrigin = 'anonymous';
  document.head.appendChild(fontLink);

  // Preload hero image
  const heroImageLink = document.createElement('link');
  heroImageLink.rel = 'preload';
  heroImageLink.href = '/images/hero-construction.webp';
  heroImageLink.as = 'image';
  document.head.appendChild(heroImageLink);
};

// Optimize images for better LCP
export const optimizeImages = () => {
  const images = document.querySelectorAll('img[data-src]');
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.getAttribute('data-src');
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          img.classList.remove('lazy');
          observer.unobserve(img);
        }
      }
    });
  });

  images.forEach(img => imageObserver.observe(img));
};

// Reduce Cumulative Layout Shift (CLS)
export const preventLayoutShift = () => {
  // Add aspect ratio containers for images
  const images = document.querySelectorAll('img:not([width]):not([height])');
  images.forEach(img => {
    const container = document.createElement('div');
    container.style.aspectRatio = '16/9'; // Default aspect ratio
    container.style.width = '100%';
    img.parentNode?.insertBefore(container, img);
    container.appendChild(img);
  });

  // Presize dynamic content areas
  const dynamicContainers = document.querySelectorAll('[data-dynamic-content]');
  dynamicContainers.forEach(container => {
    const element = container as HTMLElement;
    element.style.minHeight = element.getAttribute('data-min-height') || '200px';
  });
};

// Optimize Interaction to Next Paint (INP)
export const optimizeInteractions = () => {
  // Debounce scroll events
  let scrollTimeout: NodeJS.Timeout;
  const handleScroll = () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      // Handle scroll events
    }, 16); // ~60fps
  };

  // Use passive listeners for better performance
  window.addEventListener('scroll', handleScroll, { passive: true });

  // Optimize form interactions
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.type === 'email' || target.type === 'tel') {
        // Debounce validation
        clearTimeout((target as any).validationTimeout);
        (target as any).validationTimeout = setTimeout(() => {
          // Perform validation
        }, 300);
      }
    });
  });
};

// Critical CSS inlining
export const inlineCriticalCSS = () => {
  const criticalCSS = `
    /* Critical above-the-fold styles */
    .hero-section { display: block; }
    .navigation { display: flex; }
    .btn-primary { 
      background-color: #ff6b00; 
      color: white; 
      padding: 12px 24px; 
      border-radius: 6px; 
    }
  `;

  const style = document.createElement('style');
  style.textContent = criticalCSS;
  document.head.insertBefore(style, document.head.firstChild);
};

// Service Worker registration for caching
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully:', registration);
    } catch (error) {
      console.log('Service Worker registration failed:', error);
    }
  }
};

// Resource hints for better loading
export const addResourceHints = () => {
  // DNS prefetch for external resources
  const dnsPrefetch = [
    'https://fonts.googleapis.com',
    'https://www.google-analytics.com',
    'https://www.googletagmanager.com'
  ];

  dnsPrefetch.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = domain;
    document.head.appendChild(link);
  });

  // Preconnect to critical third-party origins
  const preconnect = [
    'https://fonts.gstatic.com'
  ];

  preconnect.forEach(origin => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
};

// Advanced image optimization with WebP support
export const optimizeImageDelivery = () => {
  // Convert images to WebP format when supported
  const images = document.querySelectorAll('img[src$=".jpg"], img[src$=".jpeg"], img[src$=".png"]');
  
  images.forEach(img => {
    const image = img as HTMLImageElement;
    const originalSrc = image.src;
    
    // Check WebP support
    const canvas = document.createElement('canvas');
    const webpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    
    if (webpSupported && !originalSrc.includes('.webp')) {
      // Try to load WebP version
      const webpSrc = originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      
      const webpImage = new Image();
      webpImage.onload = () => {
        image.src = webpSrc;
        image.setAttribute('data-optimized', 'webp');
      };
      webpImage.onerror = () => {
        // Keep original if WebP fails
        console.log('WebP fallback for:', originalSrc);
      };
      webpImage.src = webpSrc;
    }
  });
};

// Implement resource prioritization
export const prioritizeResources = () => {
  // Critical resources (above-the-fold)
  const criticalSelectors = [
    'img[src*="hero"]',
    'img[src*="logo"]',
    '.hero img',
    '.navigation img'
  ];

  criticalSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      if ('fetchPriority' in el) {
        (el as any).fetchPriority = 'high';
      }
      if ('loading' in el) {
        (el as any).loading = 'eager';
      }
    });
  });

  // Deprioritize below-the-fold images
  const belowFoldImages = document.querySelectorAll('img:not(.hero img):not(.navigation img)');
  belowFoldImages.forEach(img => {
    if ('fetchPriority' in img) {
      (img as any).fetchPriority = 'low';
    }
    if ('loading' in img && !(img as HTMLImageElement).src.includes('hero')) {
      (img as any).loading = 'lazy';
    }
  });
};

// Initialize all performance optimizations
export const initializePerformanceOptimizations = () => {
  // Run immediately for critical resources
  preloadCriticalResources();
  addResourceHints();
  inlineCriticalCSS();
  prioritizeResources();

  // Run after DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    optimizeImages();
    optimizeImageDelivery();
    preventLayoutShift();
    optimizeInteractions();
    monitorWebVitals();
  });

  // Run after page is fully loaded
  window.addEventListener('load', () => {
    registerServiceWorker();
    
    // Report initial performance metrics
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const loadTime = navigation.loadEventEnd - navigation.fetchStart;
      
      console.log('📊 Page Load Complete:', Math.round(loadTime) + 'ms');
      
      if (typeof gtag !== 'undefined') {
        gtag('event', 'page_load_complete', {
          load_time: Math.round(loadTime),
          event_category: 'performance'
        });
      }
    }, 100);
  });
};

// Enhanced Web Vitals monitoring with detailed reporting
export const monitorWebVitals = () => {
  const metrics = { lcp: 0, cls: 0, fid: 0, inp: 0, ttfb: 0 };

  // Monitor LCP (Largest Contentful Paint)
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    metrics.lcp = lastEntry.startTime;
    
    const status = lastEntry.startTime <= 2500 ? '✅' : lastEntry.startTime <= 4000 ? '⚠️' : '❌';
    console.log(`${status} LCP: ${Math.round(lastEntry.startTime)}ms`);
    
    // Report to analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'web_vitals', {
        metric_name: 'LCP',
        metric_value: Math.round(lastEntry.startTime),
        metric_rating: lastEntry.startTime <= 2500 ? 'good' : lastEntry.startTime <= 4000 ? 'needs_improvement' : 'poor',
        event_category: 'performance'
      });
    }
  });
  lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

  // Monitor CLS (Cumulative Layout Shift)
  let clsValue = 0;
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
      }
    }
    metrics.cls = clsValue;
    
    const status = clsValue <= 0.1 ? '✅' : clsValue <= 0.25 ? '⚠️' : '❌';
    console.log(`${status} CLS: ${clsValue.toFixed(3)}`);
    
    if (typeof gtag !== 'undefined') {
      gtag('event', 'web_vitals', {
        metric_name: 'CLS',
        metric_value: Math.round(clsValue * 1000) / 1000,
        metric_rating: clsValue <= 0.1 ? 'good' : clsValue <= 0.25 ? 'needs_improvement' : 'poor',
        event_category: 'performance'
      });
    }
  });
  clsObserver.observe({ entryTypes: ['layout-shift'] });

  // Monitor FID (First Input Delay) and INP (Interaction to Next Paint)
  const interactionObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'first-input') {
        const fid = (entry as any).processingStart - entry.startTime;
        metrics.fid = fid;
        
        const status = fid <= 100 ? '✅' : fid <= 300 ? '⚠️' : '❌';
        console.log(`${status} FID: ${Math.round(fid)}ms`);
        
        if (typeof gtag !== 'undefined') {
          gtag('event', 'web_vitals', {
            metric_name: 'FID',
            metric_value: Math.round(fid),
            metric_rating: fid <= 100 ? 'good' : fid <= 300 ? 'needs_improvement' : 'poor',
            event_category: 'performance'
          });
        }
      }
      
      // Monitor INP (newer metric replacing FID)
      if (entry.entryType === 'event' && (entry as any).interactionId) {
        const duration = (entry as any).duration;
        if (duration > 0) {
          metrics.inp = Math.max(metrics.inp, duration);
          
          const status = duration <= 200 ? '✅' : duration <= 500 ? '⚠️' : '❌';
          console.log(`${status} INP: ${Math.round(duration)}ms`);
          
          if (typeof gtag !== 'undefined') {
            gtag('event', 'web_vitals', {
              metric_name: 'INP',
              metric_value: Math.round(duration),
              metric_rating: duration <= 200 ? 'good' : duration <= 500 ? 'needs_improvement' : 'poor',
              event_category: 'performance'
            });
          }
        }
      }
    }
  });
  interactionObserver.observe({ entryTypes: ['first-input', 'event'] });

  // Monitor TTFB (Time to First Byte)
  const navigationEntries = performance.getEntriesByType('navigation');
  if (navigationEntries.length > 0) {
    const navEntry = navigationEntries[0] as PerformanceNavigationTiming;
    const ttfb = navEntry.responseStart - navEntry.requestStart;
    metrics.ttfb = ttfb;
    
    const status = ttfb <= 800 ? '✅' : ttfb <= 1800 ? '⚠️' : '❌';
    console.log(`${status} TTFB: ${Math.round(ttfb)}ms`);
    
    if (typeof gtag !== 'undefined') {
      gtag('event', 'web_vitals', {
        metric_name: 'TTFB',
        metric_value: Math.round(ttfb),
        metric_rating: ttfb <= 800 ? 'good' : ttfb <= 1800 ? 'needs_improvement' : 'poor',
        event_category: 'performance'
      });
    }
  }

  return metrics;
};

export default {
  initializePerformanceOptimizations,
  monitorWebVitals,
  preloadCriticalResources,
  optimizeImages,
  preventLayoutShift,
  optimizeInteractions
};
