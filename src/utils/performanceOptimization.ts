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

// Initialize all performance optimizations
export const initializePerformanceOptimizations = () => {
  // Run immediately
  preloadCriticalResources();
  addResourceHints();
  inlineCriticalCSS();

  // Run after DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    optimizeImages();
    preventLayoutShift();
    optimizeInteractions();
  });

  // Run after page is fully loaded
  window.addEventListener('load', () => {
    registerServiceWorker();
  });
};

// Web Vitals monitoring
export const monitorWebVitals = () => {
  // Monitor LCP (Largest Contentful Paint)
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('LCP:', lastEntry.startTime);
    
    // Send to analytics if > 2.5s
    if (lastEntry.startTime > 2500) {
      // gtag('event', 'web_vitals', {
      //   name: 'LCP',
      //   value: Math.round(lastEntry.startTime),
      //   event_category: 'performance'
      // });
    }
  });
  
  observer.observe({ entryTypes: ['largest-contentful-paint'] });

  // Monitor CLS (Cumulative Layout Shift)
  let clsValue = 0;
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
      }
    }
    
    if (clsValue > 0.1) {
      console.warn('CLS threshold exceeded:', clsValue);
    }
  });
  
  clsObserver.observe({ entryTypes: ['layout-shift'] });
};

export default {
  initializePerformanceOptimizations,
  monitorWebVitals,
  preloadCriticalResources,
  optimizeImages,
  preventLayoutShift,
  optimizeInteractions
};
