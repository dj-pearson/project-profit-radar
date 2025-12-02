/**
 * Font Optimization Utilities
 * Handles font loading strategies, preloading, and FOIT/FOUT prevention
 */

export interface FontConfig {
  family: string;
  weight?: number | string;
  style?: string;
  display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  preload?: boolean;
}

/**
 * Preload critical fonts
 */
export const preloadFont = (url: string, type: string = 'font/woff2'): void => {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.type = type;
  link.href = url;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
};

/**
 * Load fonts with Font Loading API
 */
export const loadFont = async (config: FontConfig): Promise<FontFace | null> => {
  if (typeof window === 'undefined' || !('FontFace' in window)) {
    return null;
  }

  try {
    const { family, weight = '400', style = 'normal' } = config;
    
    const font = new FontFace(family, `local("${family}")`, {
      weight: String(weight),
      style,
    });

    await font.load();
    document.fonts.add(font);

    return font;
  } catch (error) {
    console.error('[Font Loading] Failed to load font:', config.family, error);
    return null;
  }
};

/**
 * Preconnect to font providers
 */
export const preconnectFontProviders = (providers: string[]): void => {
  if (typeof window === 'undefined') return;

  providers.forEach(provider => {
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = provider;
    preconnect.crossOrigin = 'anonymous';
    document.head.appendChild(preconnect);

    const dnsPrefetch = document.createElement('link');
    dnsPrefetch.rel = 'dns-prefetch';
    dnsPrefetch.href = provider;
    document.head.appendChild(dnsPrefetch);
  });

};

/**
 * Apply font-display strategy
 */
export const applyFontDisplay = (display: 'swap' | 'fallback' | 'optional' = 'swap'): void => {
  if (typeof window === 'undefined') return;

  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-display: ${display};
    }
  `;
  document.head.appendChild(style);
};

/**
 * Monitor font loading performance
 */
export const monitorFontPerformance = (): void => {
  if (typeof window === 'undefined' || !document.fonts) return;

  document.fonts.ready.then(() => {
    const fonts = Array.from(document.fonts);

    if (PerformanceObserver) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const resourceEntry = entry as PerformanceResourceTiming;
            
            if (resourceEntry.initiatorType === 'link' && 
                resourceEntry.name.includes('font')) {
                url: resourceEntry.name,
                duration: `${resourceEntry.duration.toFixed(2)}ms`,
                size: `${((resourceEntry.transferSize || 0) / 1024).toFixed(2)}KB`,
              });
            }
          }
        });

        observer.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.error('[Font Performance] Monitoring failed:', error);
      }
    }
  });
};

/**
 * Initialize font optimizations
 */
export const initializeFontOptimizations = (fonts: FontConfig[]): void => {
  if (typeof window === 'undefined') return;

  fonts
    .filter(font => font.preload)
    .forEach(font => {
    });

  applyFontDisplay('swap');
  monitorFontPerformance();

};
