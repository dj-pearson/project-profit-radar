import React, { useEffect } from 'react';

interface CoreWebVitalsOptimizerProps {
  enableImageOptimization?: boolean;
  /** @deprecated No-op since US-378: the font loads once from index.html. */
  enableFontOptimization?: boolean;
  enableCriticalCSS?: boolean;
  pageType?: 'homepage' | 'landing' | 'content' | 'app';
}

export const CoreWebVitalsOptimizer: React.FC<CoreWebVitalsOptimizerProps> = ({
  enableImageOptimization = true,
  enableCriticalCSS = true,
  pageType = 'homepage'
}) => {
  useEffect(() => {
    // Optimize Largest Contentful Paint (LCP)
    const optimizeLCP = () => {
      // Preload hero images
      if (pageType === 'homepage') {
        const heroImageLink = document.createElement('link');
        heroImageLink.rel = 'preload';
        heroImageLink.href = '/placeholder.svg';
        heroImageLink.as = 'image';
        document.head.appendChild(heroImageLink);
      }

      // No font work here. Inter is self-hosted and loaded once from
      // index.html (/fonts/inter.css); this used to inject a second copy
      // from Google Fonts at runtime (US-378).
    };

    // Optimize Cumulative Layout Shift (CLS)
    const optimizeCLS = () => {
      // Add dimensions to images to prevent layout shifts
      const images = document.querySelectorAll('img:not([width]):not([height])');
      images.forEach((img) => {
        const htmlImg = img as HTMLImageElement;
        // Set aspect ratio to prevent CLS
        htmlImg.style.aspectRatio = '16/9';
        htmlImg.style.width = '100%';
        htmlImg.style.height = 'auto';
      });

      // Reserve space for dynamic content
      const dynamicContainers = document.querySelectorAll('[data-dynamic-height]');
      dynamicContainers.forEach((container) => {
        const htmlContainer = container as HTMLElement;
        const minHeight = htmlContainer.dataset.dynamicHeight;
        if (minHeight) {
          htmlContainer.style.minHeight = minHeight;
        }
      });
    };

    // Optimize Interaction to Next Paint (INP)
    const optimizeINP = () => {
      // Debounce rapid interactions
      let isThrottled = false;
      const throttleTime = 16; // ~60fps

      const throttleEvents = ['click', 'keydown', 'input'];
      throttleEvents.forEach(eventType => {
        document.addEventListener(eventType, () => {
          if (isThrottled) return;
          isThrottled = true;
          setTimeout(() => {
            isThrottled = false;
          }, throttleTime);
        }, { passive: true });
      });

      // Use requestIdleCallback for non-critical tasks
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          // Preload next likely pages
          if (pageType === 'homepage') {
            const linkElements = [
              '<link rel="prefetch" href="/features">',
              '<link rel="prefetch" href="/pricing">',
              '<link rel="prefetch" href="/auth">'
            ];
            linkElements.forEach(linkHtml => {
              document.head.insertAdjacentHTML('beforeend', linkHtml);
            });
          }
        });
      }
    };

    // Apply optimizations
    optimizeLCP();
    optimizeCLS();
    optimizeINP();

    // Monitor and report Web Vitals
    if (typeof window !== 'undefined' && 'web-vitals' in window) {
      // Web Vitals monitoring would go here in production
    }

    return () => {
      // Cleanup if needed
    };
  }, [enableImageOptimization, enableCriticalCSS, pageType]);

  return null; // This is a utility component with no UI
};

// Lazy Image Component with optimization
export const OptimizedImage: React.FC<{
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}> = ({ src, alt, width, height, className = '', priority = false }) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isInView, setIsInView] = React.useState(priority);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio: width && height ? `${width}/${height}` : undefined }}
    >
      {/* Placeholder while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      {/* Actual image */}
      <img
        ref={imgRef}
        src={isInView ? src : undefined}
        alt={alt}
        width={width}
        height={height}
        className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        style={{
          width: '100%',
          height: 'auto',
          maxWidth: width ? `${width}px` : undefined
        }}
      />
    </div>
  );
};

export default CoreWebVitalsOptimizer;