/**
 * Resource Prioritization Utilities
 * Manages resource loading priorities for optimal performance
 */

export interface ResourcePriority {
  type: 'script' | 'style' | 'font' | 'image';
  url: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  async?: boolean;
  defer?: boolean;
}

/**
 * Resource priorities by page type
 */
export const resourcePriorities: Record<string, ResourcePriority[]> = {
  homepage: [
    // Critical resources
    { type: 'font', url: '/fonts/inter-400.woff2', priority: 'critical' },
    { type: 'font', url: '/fonts/inter-600.woff2', priority: 'critical' },
    { type: 'style', url: '/fonts/inter.css', priority: 'critical' },
    
    // High priority
    { type: 'script', url: '/src/main.tsx', priority: 'high', defer: true },
    
    // Medium priority
    { type: 'image', url: '/BuildDeskLogo.png', priority: 'medium' },
  ],
  dashboard: [
    { type: 'font', url: '/fonts/inter-400.woff2', priority: 'critical' },
    { type: 'font', url: '/fonts/inter-600.woff2', priority: 'critical' },
    { type: 'script', url: '/src/main.tsx', priority: 'high', defer: true },
  ],
};

/**
 * Add resource hints to document
 */
export const addResourceHints = (pageType: string): void => {
  if (typeof document === 'undefined') return;
  
  const resources = resourcePriorities[pageType] || [];
  
  resources.forEach(resource => {
    // Skip if already exists
    if (document.querySelector(`link[href="${resource.url}"]`)) return;
    
    const link = document.createElement('link');
    
    // Determine relationship based on priority and type
    if (resource.priority === 'critical') {
      link.rel = 'preload';
      link.as = resource.type === 'font' ? 'font' : resource.type === 'style' ? 'style' : 'fetch';
      
      if (resource.type === 'font') {
        link.setAttribute('crossorigin', 'anonymous');
      }
    } else if (resource.priority === 'high') {
      link.rel = 'prefetch';
    } else {
      link.rel = 'dns-prefetch';
    }
    
    link.href = resource.url;
    document.head.appendChild(link);
  });
};

/**
 * Prioritize resource loading
 */
export const prioritizeResources = (): void => {
  if (typeof document === 'undefined') return;
  
  // Prioritize fonts
  const fonts = document.querySelectorAll('link[rel="preload"][as="font"]');
  fonts.forEach(font => {
    font.setAttribute('fetchpriority', 'high');
  });
  
  // Deprioritize non-critical images
  const images = document.querySelectorAll('img:not([loading="eager"])');
  images.forEach(img => {
    img.setAttribute('loading', 'lazy');
    img.setAttribute('fetchpriority', 'low');
  });
  
  // Defer non-critical scripts
  const scripts = document.querySelectorAll('script:not([async]):not([defer])');
  scripts.forEach(script => {
    const scriptEl = script as HTMLScriptElement;
    if (scriptEl.src && !scriptEl.src.includes('critical')) {
      scriptEl.setAttribute('defer', '');
    }
  });
};

/**
 * Optimize third-party scripts
 */
export const optimizeThirdPartyScripts = (): void => {
  if (typeof window === 'undefined') return;
  
  // Delay analytics loading
  const delayAnalytics = () => {
    const script = document.createElement('script');
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-LNDT7H4SJR';
    script.async = true;
    document.head.appendChild(script);
  };
  
  // Load on interaction or after 3 seconds
  const events = ['mousedown', 'touchstart', 'scroll', 'keydown'];
  let loaded = false;
  
  const loadHandler = () => {
    if (loaded) return;
    loaded = true;
    events.forEach(event => window.removeEventListener(event, loadHandler));
    delayAnalytics();
  };
  
  events.forEach(event => window.addEventListener(event, loadHandler, { passive: true, once: true }));
  
  // Fallback after 3 seconds
  setTimeout(() => {
    if (!loaded) delayAnalytics();
  }, 3000);
};

/**
 * Preconnect to critical origins
 */
export const preconnectCriticalOrigins = (): void => {
  if (typeof document === 'undefined') return;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const origins = [
    supabaseUrl,
    'https://fonts.gstatic.com',
  ].filter(Boolean) as string[];
  
  origins.forEach(origin => {
    // Check if already exists
    if (document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) return;
    
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.setAttribute('crossorigin', '');
    document.head.appendChild(link);
  });
};

/**
 * Monitor resource loading performance
 */
export const monitorResourcePerformance = (): void => {
  if (typeof window === 'undefined' || !window.performance) return;
  
  window.addEventListener('load', () => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    // Group by type
    const byType: Record<string, number> = {};
    const slowResources: PerformanceResourceTiming[] = [];
    
    resources.forEach((resource) => {
      const type = resource.initiatorType || 'other';
      byType[type] = (byType[type] || 0) + 1;
      
      // Flag slow resources (>1s)
      if (resource.duration > 1000) {
        slowResources.push(resource);
      }
    });
    
    
    if (slowResources.length > 0) {
      console.warn('⚠️ Slow Resources (>1s):', slowResources.map(r => ({
        name: r.name,
        duration: `${r.duration.toFixed(2)}ms`
      })));
    }
  });
};

/**
 * Initialize all resource optimizations
 */
export const initializeResourceOptimizations = (pageType: string): void => {
  if (typeof window === 'undefined') return;
  
  // Run optimizations
  addResourceHints(pageType);
  preconnectCriticalOrigins();
  prioritizeResources();
  optimizeThirdPartyScripts();
  
  // Monitor in development
  if (import.meta.env.DEV) {
    monitorResourcePerformance();
  }
};
