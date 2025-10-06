/**
 * Image Optimization Utilities
 * Provides tools for responsive images, lazy loading, and format optimization
 */

export interface ImageOptimizationConfig {
  lazy?: boolean;
  priority?: 'high' | 'low' | 'auto';
  sizes?: string;
  quality?: number;
  format?: 'webp' | 'avif' | 'auto';
}

/**
 * Generate srcset for responsive images
 */
export const generateSrcSet = (baseUrl: string, widths: number[]): string => {
  return widths
    .map(width => `${baseUrl}?w=${width} ${width}w`)
    .join(', ');
};

/**
 * Get optimal image sizes attribute
 */
export const getOptimalSizes = (breakpoints: { [key: string]: string }): string => {
  const entries = Object.entries(breakpoints);
  return entries
    .map(([breakpoint, size]) => `(max-width: ${breakpoint}) ${size}`)
    .join(', ');
};

/**
 * Lazy load images with Intersection Observer
 */
export const lazyLoadImage = (img: HTMLImageElement): void => {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const image = entry.target as HTMLImageElement;
          const src = image.dataset.src;
          const srcset = image.dataset.srcset;

          if (src) image.src = src;
          if (srcset) image.srcset = srcset;

          image.classList.add('loaded');
          observer.unobserve(image);
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01,
    });

    observer.observe(img);
  } else {
    // Fallback for browsers without Intersection Observer
    const src = img.dataset.src;
    const srcset = img.dataset.srcset;
    if (src) img.src = src;
    if (srcset) img.srcset = srcset;
  }
};

/**
 * Preload critical images
 */
export const preloadImage = (url: string, type: 'image/webp' | 'image/avif' | 'image/jpeg' = 'image/webp'): void => {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;
  link.type = type;
  document.head.appendChild(link);
};

/**
 * Check if WebP is supported
 */
export const supportsWebP = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
};

/**
 * Check if AVIF is supported
 */
export const supportsAVIF = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const avif = new Image();
    avif.onload = avif.onerror = () => {
      resolve(avif.height === 2);
    };
    avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  });
};

/**
 * Get best image format based on browser support
 */
export const getBestFormat = async (): Promise<'avif' | 'webp' | 'jpeg'> => {
  if (await supportsAVIF()) return 'avif';
  if (await supportsWebP()) return 'webp';
  return 'jpeg';
};

/**
 * Optimize image attributes for performance
 */
export const optimizeImageAttributes = (img: HTMLImageElement, config: ImageOptimizationConfig = {}): void => {
  const {
    lazy = true,
    priority = 'auto',
    sizes,
    quality = 85,
  } = config;

  // Set loading strategy
  if (lazy && priority !== 'high') {
    img.loading = 'lazy';
  } else {
    img.loading = 'eager';
  }

  // Set fetch priority
  if (priority !== 'auto') {
    img.fetchPriority = priority;
  }

  // Set decoding
  img.decoding = priority === 'high' ? 'sync' : 'async';

  // Set sizes if provided
  if (sizes) {
    img.sizes = sizes;
  }

  // Add quality hint to URL if applicable
  if (img.src && !img.src.includes('quality=')) {
    const separator = img.src.includes('?') ? '&' : '?';
    img.src += `${separator}quality=${quality}`;
  }
};

/**
 * Initialize image optimizations for all images on page
 */
export const initializeImageOptimizations = (): void => {
  if (typeof window === 'undefined') return;

  // Optimize all images
  const images = document.querySelectorAll('img');
  images.forEach((img) => {
    // Skip if already optimized
    if (img.dataset.optimized) return;

    // Determine if image is above the fold
    const rect = img.getBoundingClientRect();
    const isAboveFold = rect.top < window.innerHeight;

    optimizeImageAttributes(img, {
      lazy: !isAboveFold,
      priority: isAboveFold ? 'high' : 'low',
    });

    img.dataset.optimized = 'true';
  });

  console.log('[Image Optimization] Initialized for', images.length, 'images');
};

/**
 * Monitor image loading performance
 */
export const monitorImagePerformance = (): void => {
  if (typeof window === 'undefined' || !PerformanceObserver) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resourceEntry = entry as PerformanceResourceTiming;
        
        if (resourceEntry.initiatorType === 'img') {
          const duration = resourceEntry.duration;
          const size = resourceEntry.transferSize;

          if (duration > 1000 || size > 100 * 1024) {
            console.warn('[Image Performance]', {
              url: resourceEntry.name,
              duration: `${duration.toFixed(2)}ms`,
              size: `${(size / 1024).toFixed(2)}KB`,
            });
          }
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });
  } catch (error) {
    console.error('[Image Performance] Monitoring failed:', error);
  }
};
