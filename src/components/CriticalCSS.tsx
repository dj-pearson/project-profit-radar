import { useEffect } from 'react';

// Critical CSS for above-the-fold content
const criticalStyles = `
  /* Critical styles for immediate render */
  .critical-layout {
    min-height: 100vh;
    background: hsl(var(--background));
    color: hsl(var(--foreground));
  }
  
  .critical-header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: hsl(var(--background) / 0.95);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid hsl(var(--border));
  }
  
  .critical-hero {
    min-height: 80vh;
    display: flex;
    align-items: center;
    background: linear-gradient(135deg, hsl(var(--construction-orange)), hsl(24 100% 45%));
  }
  
  .critical-text-primary {
    color: hsl(var(--primary-foreground));
  }
  
  .critical-button {
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    padding: 0.75rem 2rem;
    border-radius: 0.5rem;
    font-weight: 600;
    transition: all 0.2s;
    border: none;
    cursor: pointer;
  }
  
  .critical-button:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  /* Font preload optimization */
  @font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: local('Inter Regular'), local('Inter-Regular');
  }
`;

export function CriticalCSS() {
  useEffect(() => {
    // Inject critical CSS immediately
    const style = document.createElement('style');
    style.textContent = criticalStyles;
    style.setAttribute('data-critical', 'true');
    document.head.insertBefore(style, document.head.firstChild);

    // Preload critical fonts
    const fontLink = document.createElement('link');
    fontLink.rel = 'preload';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    fontLink.as = 'style';
    fontLink.onload = function() {
      (this as HTMLLinkElement).rel = 'stylesheet';
    };
    document.head.appendChild(fontLink);

    return () => {
      // Cleanup critical styles when component unmounts
      const criticalStyle = document.querySelector('[data-critical="true"]');
      if (criticalStyle) {
        criticalStyle.remove();
      }
    };
  }, []);

  return null;
}

export default CriticalCSS;