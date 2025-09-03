/**
 * Critical CSS Extraction and Inlining Utility
 * Extracts above-the-fold CSS for faster LCP
 */

interface CriticalCSSConfig {
  viewport: { width: number; height: number };
  selectors: string[];
  excludeSelectors: string[];
  minify: boolean;
}

const defaultConfig: CriticalCSSConfig = {
  viewport: { width: 1200, height: 800 },
  selectors: [
    // Navigation
    '.navigation', '.nav', 'header', '[role="navigation"]',
    
    // Hero section
    '.hero', '.hero-section', '.banner', '.jumbotron',
    
    // Critical buttons and CTAs
    '.btn-primary', '.cta', '[data-cta]', '.button-primary',
    
    // Layout containers
    '.container', '.wrapper', '.main-content', '.grid',
    
    // Typography
    'h1', 'h2', '.title', '.headline', '.tagline',
    
    // Critical UI components
    '.card', '.badge', '.alert', '.loading'
  ],
  excludeSelectors: [
    // Non-critical animations
    '@keyframes', '.animate-', '.transition-',
    
    // Below-the-fold content
    '.footer', '.sidebar', '.modal', '.dropdown',
    
    // Print styles
    '@media print', '@page'
  ],
  minify: true
};

export class CriticalCSSExtractor {
  private config: CriticalCSSConfig;
  private criticalCSS: string = '';

  constructor(config: Partial<CriticalCSSConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  // Extract critical CSS from stylesheets
  public async extractCriticalCSS(): Promise<string> {
    const stylesheets = Array.from(document.styleSheets);
    let criticalRules: string[] = [];

    for (const stylesheet of stylesheets) {
      try {
        const rules = Array.from(stylesheet.cssRules || []);
        
        for (const rule of rules) {
          if (this.isCriticalRule(rule)) {
            criticalRules.push(rule.cssText);
          }
        }
      } catch (error) {
        // Skip external stylesheets due to CORS
        console.warn('Skipped stylesheet due to CORS:', stylesheet.href);
      }
    }

    this.criticalCSS = criticalRules.join('\n');
    
    if (this.config.minify) {
      this.criticalCSS = this.minifyCSS(this.criticalCSS);
    }

    return this.criticalCSS;
  }

  // Check if a CSS rule is critical (above-the-fold)
  private isCriticalRule(rule: CSSRule): boolean {
    const ruleText = rule.cssText.toLowerCase();

    // Exclude non-critical rules
    for (const exclude of this.config.excludeSelectors) {
      if (ruleText.includes(exclude.toLowerCase())) {
        return false;
      }
    }

    // Include critical selectors
    for (const selector of this.config.selectors) {
      if (ruleText.includes(selector.toLowerCase())) {
        return true;
      }
    }

    // Include base typography and layout
    const criticalPatterns = [
      'font-family', 'font-size', 'font-weight',
      'color', 'background-color',
      'display', 'position', 'width', 'height',
      'margin', 'padding', 'border',
      'flex', 'grid', 'text-align'
    ];

    return criticalPatterns.some(pattern => ruleText.includes(pattern));
  }

  // Minify CSS by removing unnecessary whitespace and comments
  private minifyCSS(css: string): string {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/;\s*}/g, '}') // Remove trailing semicolons
      .replace(/\s*{\s*/g, '{') // Clean braces
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*;\s*/g, ';') // Clean semicolons
      .replace(/\s*,\s*/g, ',') // Clean commas
      .trim();
  }

  // Inline critical CSS into document head
  public inlineCriticalCSS(css?: string): void {
    const criticalCSS = css || this.criticalCSS;
    
    if (!criticalCSS) return;

    // Remove existing critical CSS
    const existingCritical = document.getElementById('critical-css');
    if (existingCritical) {
      existingCritical.remove();
    }

    // Create and insert critical CSS
    const style = document.createElement('style');
    style.id = 'critical-css';
    style.textContent = criticalCSS;
    
    // Insert before any other stylesheets
    const firstLink = document.head.querySelector('link[rel="stylesheet"]');
    if (firstLink) {
      document.head.insertBefore(style, firstLink);
    } else {
      document.head.appendChild(style);
    }

    console.log(`🎨 Critical CSS inlined: ${(criticalCSS.length / 1024).toFixed(1)}KB`);
  }

  // Generate critical CSS for specific page types
  public generatePageSpecificCSS(pageType: string): string {
    const pageConfigs: Record<string, string[]> = {
      homepage: [
        '.hero', '.hero-section', '.cta-primary', '.social-proof',
        '.problem-solution', '.value-proposition'
      ],
      features: [
        '.feature-grid', '.feature-card', '.comparison-table',
        '.pricing-preview', '.demo-section'
      ],
      pricing: [
        '.pricing-grid', '.pricing-card', '.plan-features',
        '.billing-toggle', '.cta-section'
      ],
      blog: [
        '.article-header', '.article-meta', '.article-content',
        '.author-bio', '.related-posts'
      ]
    };

    const pageSelectors = pageConfigs[pageType] || [];
    const combinedSelectors = [...this.config.selectors, ...pageSelectors];
    
    return this.extractSelectorsCSS(combinedSelectors);
  }

  private extractSelectorsCSS(selectors: string[]): string {
    const stylesheets = Array.from(document.styleSheets);
    let rules: string[] = [];

    for (const stylesheet of stylesheets) {
      try {
        const cssRules = Array.from(stylesheet.cssRules || []);
        
        for (const rule of cssRules) {
          const ruleText = rule.cssText.toLowerCase();
          
          if (selectors.some(selector => 
            ruleText.includes(selector.toLowerCase())
          )) {
            rules.push(rule.cssText);
          }
        }
      } catch (error) {
        // Skip CORS-blocked stylesheets
      }
    }

    return this.config.minify ? this.minifyCSS(rules.join('\n')) : rules.join('\n');
  }
}

// Hook for automatic critical CSS extraction
export const useCriticalCSS = (pageType: string = 'homepage') => {
  useEffect(() => {
    // Wait for stylesheets to load
    const timer = setTimeout(() => {
      const extractor = new CriticalCSSExtractor();
      const criticalCSS = extractor.generatePageSpecificCSS(pageType);
      extractor.inlineCriticalCSS(criticalCSS);
    }, 100);

    return () => clearTimeout(timer);
  }, [pageType]);
};

// Prebuilt critical CSS for different page types
export const criticalCSSTemplates = {
  homepage: `
    /* Critical Homepage Styles */
    .hero-section { display: block; min-height: 60vh; }
    .navigation { display: flex; align-items: center; }
    .btn-primary { 
      background-color: #ff6b00; 
      color: white; 
      padding: 0.75rem 1.5rem; 
      border-radius: 0.375rem;
      font-weight: 600;
      transition: background-color 0.2s;
    }
    .btn-primary:hover { background-color: #e55a00; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
    h1 { font-size: 2.5rem; font-weight: 700; line-height: 1.2; }
    h2 { font-size: 2rem; font-weight: 600; line-height: 1.3; }
    .text-construction-dark { color: #1e3a8a; }
    .text-construction-orange { color: #ff6b00; }
    .bg-construction-light { background-color: #f0f9ff; }
  `,
  
  features: `
    /* Critical Features Page Styles */
    .feature-grid { display: grid; gap: 2rem; }
    .feature-card { background: white; border-radius: 0.5rem; padding: 1.5rem; }
    .comparison-table { width: 100%; border-collapse: collapse; }
    .demo-section { padding: 4rem 0; }
  `,
  
  pricing: `
    /* Critical Pricing Page Styles */
    .pricing-grid { display: grid; gap: 2rem; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
    .pricing-card { background: white; border: 2px solid #e5e7eb; border-radius: 0.75rem; }
    .pricing-card.featured { border-color: #ff6b00; transform: scale(1.05); }
  `
};

export default CriticalCSSExtractor;
