/**
 * SEO utility functions for handling URL parameters and canonical URLs
 */

/**
 * Get the clean canonical URL for the current page, stripping all query parameters
 * that are used for cache management and tracking
 */
export const getCleanCanonicalUrl = (): string => {
  if (typeof window === 'undefined') return '';
  
  const baseUrl = 'https://builddesk.com';
  const pathname = window.location.pathname;
  
  // Always return clean URL without any parameters
  return `${baseUrl}${pathname}`;
};

/**
 * Check if the current URL has SEO-problematic parameters
 */
export const hasProblematicParameters = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const params = new URLSearchParams(window.location.search);
  const problematicParams = ['v', 'refreshed', 'timestamp', 'cache'];
  
  return problematicParams.some(param => params.has(param));
};

/**
 * Get URL parameters that should be preserved for functionality
 * (e.g., utm parameters, affiliate codes)
 */
export const getPreservedParameters = (): URLSearchParams => {
  if (typeof window === 'undefined') return new URLSearchParams();
  
  const currentParams = new URLSearchParams(window.location.search);
  const preservedParams = new URLSearchParams();
  
  // Parameters to preserve for marketing/functionality
  const keepParams = ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'affiliate'];
  
  keepParams.forEach(param => {
    if (currentParams.has(param)) {
      preservedParams.set(param, currentParams.get(param)!);
    }
  });
  
  return preservedParams;
};

/**
 * Initialize SEO-friendly URL handling on page load
 */
export const initializeSEOUrlHandling = (): void => {
  if (typeof window === 'undefined') return;
  
  // Add canonical link element if it doesn't exist
  const existingCanonical = document.querySelector('link[rel="canonical"]');
  if (!existingCanonical) {
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = getCleanCanonicalUrl();
    document.head.appendChild(canonical);
  }
  
  // Update existing canonical to ensure it's clean
  if (existingCanonical) {
    (existingCanonical as HTMLLinkElement).href = getCleanCanonicalUrl();
  }
};

/**
 * Clean URL for sitemap generation
 */
export const cleanUrlForSitemap = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch {
    return url.split('?')[0];
  }
};
