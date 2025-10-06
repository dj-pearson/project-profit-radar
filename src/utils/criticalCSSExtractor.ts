/**
 * Critical CSS Extraction Utilities
 * Identifies and inlines critical above-the-fold CSS for faster FCP
 */

export interface CriticalCSSConfig {
  page: string;
  viewport: {
    width: number;
    height: number;
  };
}

// Critical CSS for homepage hero section
export const homepageCriticalCSS = `
  /* Critical Hero Styles */
  .hero-section {
    background: linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--secondary)) 100%);
    padding-top: 3rem;
    padding-bottom: 3rem;
  }
  
  @media (min-width: 640px) {
    .hero-section { padding-top: 5rem; padding-bottom: 5rem; }
  }
  
  @media (min-width: 1024px) {
    .hero-section { padding-top: 8rem; padding-bottom: 8rem; }
  }
  
  /* Critical Typography */
  .hero-title {
    font-size: 1.875rem;
    font-weight: 700;
    line-height: 1.2;
    color: hsl(var(--construction-dark));
  }
  
  @media (min-width: 640px) {
    .hero-title { font-size: 2.25rem; }
  }
  
  @media (min-width: 1024px) {
    .hero-title { font-size: 3rem; }
  }
  
  @media (min-width: 1280px) {
    .hero-title { font-size: 3.75rem; }
  }
  
  /* Critical Button Styles */
  .hero-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 1rem 2rem;
    background: linear-gradient(135deg, hsl(var(--construction-orange)), hsl(24 100% 32%));
    color: white;
    font-weight: 600;
    border-radius: 0.5rem;
    transition: transform 0.2s;
  }
  
  .hero-cta:hover {
    transform: translateY(-2px);
  }
`;

// Critical CSS for dashboard
export const dashboardCriticalCSS = `
  /* Critical Dashboard Layout */
  .dashboard-container {
    display: grid;
    gap: 1.5rem;
    padding: 1.5rem;
  }
  
  @media (min-width: 768px) {
    .dashboard-container {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  @media (min-width: 1024px) {
    .dashboard-container {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  
  /* Critical Card Styles */
  .dashboard-card {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
    padding: 1.5rem;
    box-shadow: var(--shadow-card);
  }
`;

// Map page types to critical CSS
const criticalCSSMap: Record<string, string> = {
  homepage: homepageCriticalCSS,
  dashboard: dashboardCriticalCSS,
};

/**
 * Get critical CSS for a specific page
 */
export const getCriticalCSS = (pageType: string): string => {
  return criticalCSSMap[pageType] || '';
};

/**
 * Inject critical CSS into document head
 */
export const injectCriticalCSS = (pageType: string): void => {
  const css = getCriticalCSS(pageType);
  
  if (!css || typeof document === 'undefined') return;
  
  // Check if already injected
  if (document.getElementById(`critical-css-${pageType}`)) return;
  
  const style = document.createElement('style');
  style.id = `critical-css-${pageType}`;
  style.textContent = css;
  
  // Insert at the beginning of head for highest priority
  document.head.insertBefore(style, document.head.firstChild);
};

/**
 * Hook to inject critical CSS on component mount
 */
export const useCriticalCSS = (pageType: string): void => {
  if (typeof window === 'undefined') return;
  
  // Inject immediately (synchronous for critical path)
  injectCriticalCSS(pageType);
};

/**
 * Preload non-critical CSS
 */
export const preloadNonCriticalCSS = (): void => {
  if (typeof document === 'undefined') return;
  
  // Find all stylesheets
  const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
  
  stylesheets.forEach((link) => {
    const href = link.getAttribute('href');
    if (href && !href.includes('critical')) {
      // Set media to print to prevent blocking, then switch to all once loaded
      link.setAttribute('media', 'print');
      link.addEventListener('load', function() {
        this.setAttribute('media', 'all');
      });
    }
  });
};

/**
 * Calculate critical viewport CSS
 */
export const calculateCriticalViewport = (config: CriticalCSSConfig): string => {
  const { width, height } = config.viewport;
  
  // Return CSS that only affects above-the-fold content
  return `
    /* Viewport-specific critical CSS */
    @media (max-width: ${width}px) {
      .hero-section {
        min-height: ${height}px;
      }
    }
  `;
};

/**
 * Performance metrics for critical CSS
 */
export const measureCriticalCSSImpact = (): void => {
  if (typeof window === 'undefined' || !window.performance) return;
  
  const paintEntries = performance.getEntriesByType('paint');
  const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
  
  if (fcp) {
    console.log(`🎨 FCP with critical CSS: ${fcp.startTime.toFixed(2)}ms`);
  }
};
