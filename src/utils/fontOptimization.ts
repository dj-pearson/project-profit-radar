/**
 * Font optimization utilities for BuildDesk
 * Handles font loading, fallbacks, and performance optimization
 */

// Font loading performance optimization
export const initializeFontOptimization = () => {
  // Preload critical fonts
  const preloadFont = (fontUrl: string, fontDisplay: string = 'swap') => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.href = fontUrl;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  };

  // Add font display swap for better loading performance
  const addFontDisplaySwap = () => {
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: url(https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2) format('woff2');
      }
      @font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 500;
        font-display: swap;
        src: url(https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiA.woff2) format('woff2');
      }
      @font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 600;
        font-display: swap;
        src: url(https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiA.woff2) format('woff2');
      }
      @font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 700;
        font-display: swap;
        src: url(https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuDyfAZ9hiA.woff2) format('woff2');
      }
    `;
    document.head.appendChild(style);
  };

  // Font loading detection and fallback
  const detectFontLoading = () => {
    if ('fonts' in document) {
      document.fonts.ready.then(() => {
        console.log('🎨 All fonts loaded');
        document.body.classList.add('fonts-loaded');
      }).catch(() => {
        console.warn('Font loading failed, using system fallbacks');
        document.body.classList.add('fonts-fallback');
      });
    }
  };

  // Initialize optimizations
  addFontDisplaySwap();
  detectFontLoading();
};

// Performance monitoring for fonts
export const monitorFontPerformance = () => {
  if ('performance' in window && 'getEntriesByType' in performance) {
    window.addEventListener('load', () => {
      const fontEntries = performance.getEntriesByType('resource').filter(
        (entry: any) => entry.initiatorType === 'css' && entry.name.includes('font')
      );
      
      fontEntries.forEach((entry: any) => {
        console.log(`Font ${entry.name} loaded in ${entry.duration}ms`);
      });
    });
  }
};

// Critical font loading optimization
export const optimizeCriticalFonts = () => {
  // Add critical CSS for fonts
  const criticalCSS = `
    /* Critical font fallbacks */
    .font-inter {
      font-family: Inter, Roboto, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Avenir, Helvetica, Arial, sans-serif;
    }
    
    /* Performance optimizations */
    .fonts-loading * {
      font-display: swap;
    }
    
    .fonts-fallback * {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Avenir, Helvetica, Arial, sans-serif;
    }
  `;
  
  const style = document.createElement('style');
  style.textContent = criticalCSS;
  document.head.appendChild(style);
};