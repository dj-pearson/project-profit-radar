import { useEffect } from 'react';

interface FontConfig {
  family: string;
  weights: number[];
  display: 'swap' | 'fallback' | 'optional' | 'auto';
  preload: boolean;
  subset?: string;
}

const fontConfigs: FontConfig[] = [
  {
    family: 'Inter Variable',
    weights: [400, 500, 600, 700],
    display: 'swap',
    preload: true,
    subset: 'latin'
  }
];

export const FontOptimization = () => {
  useEffect(() => {
    // Preload critical fonts
    fontConfigs.forEach(config => {
      if (config.preload) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = `/fonts/${config.family.toLowerCase().replace(' ', '-')}.woff2`;
        link.as = 'font';
        link.type = 'font/woff2';
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }
    });

    // Add font-display: swap for all fonts
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'Inter Variable';
        src: url('/fonts/inter-variable.woff2') format('woff2');
        font-weight: 100 900;
        font-style: normal;
        font-display: swap;
        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
      }
      
      /* Fallback font stack for better FOUT handling */
      .font-inter {
        font-family: 'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      /* Reduce layout shift with consistent font metrics */
      body {
        font-family: 'Inter Variable', system-ui, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
      }
    `;
    document.head.appendChild(style);

  }, []);

  return null;
};

// Hook for font loading optimization
export const useFontOptimization = () => {
  useEffect(() => {
    // Use Font Loading API if available
    if ('fonts' in document) {
      // Preload critical fonts
      const criticalFonts = [
        new FontFace('Inter Variable', 'url(/fonts/inter-variable.woff2)', {
          weight: '400 700',
          display: 'swap'
        })
      ];

      criticalFonts.forEach(async (font) => {
        try {
          await font.load();
          document.fonts.add(font);
        } catch (error) {
          console.warn('Font load failed:', font.family, error);
        }
      });
    }

    // Add font loading classes for FOUT prevention
    document.documentElement.classList.add('fonts-loading');
    
    document.fonts.ready.then(() => {
      document.documentElement.classList.remove('fonts-loading');
      document.documentElement.classList.add('fonts-loaded');
    });
  }, []);
};

export default FontOptimization;
