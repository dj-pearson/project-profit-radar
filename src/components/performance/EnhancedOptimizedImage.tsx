import React, { useState, useEffect, useRef, useCallback } from 'react';

interface EnhancedOptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  placeholder?: string;
  sizes?: string;
  srcSet?: string;
  onLoad?: () => void;
  onError?: () => void;
  quality?: number;
  format?: 'webp' | 'avif' | 'auto';
}

export const EnhancedOptimizedImage = ({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  loading = 'lazy',
  placeholder,
  sizes,
  srcSet,
  onLoad,
  onError,
  quality = 80,
  format = 'auto'
}: EnhancedOptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Generate optimized image sources
  const generateOptimizedSrc = useCallback((originalSrc: string, targetFormat: string) => {
    // If it's already optimized or external, return as-is
    if (originalSrc.includes('http') && !originalSrc.includes(window.location.origin)) {
      return originalSrc;
    }

    // Generate WebP or AVIF version
    if (targetFormat === 'webp') {
      return originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    } else if (targetFormat === 'avif') {
      return originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.avif');
    }
    
    return originalSrc;
  }, []);

  // Check format support
  const checkFormatSupport = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    const supportsWebP = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    const supportsAVIF = canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
    
    if (format === 'auto') {
      if (supportsAVIF) return 'avif';
      if (supportsWebP) return 'webp';
      return 'original';
    }
    
    return format === 'webp' && supportsWebP ? 'webp' : 
           format === 'avif' && supportsAVIF ? 'avif' : 'original';
  }, [format]);

  // Load image with fallback strategy
  const loadImage = useCallback(async (targetSrc: string) => {
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        // Measure load time for performance tracking
        const loadTime = performance.now();
        
        if (typeof window !== 'undefined' && 'gtag' in window) {
          (window as any).gtag('event', 'image_load', {
            image_src: targetSrc,
            load_time: Math.round(loadTime),
            format: targetSrc.includes('.webp') ? 'webp' : targetSrc.includes('.avif') ? 'avif' : 'original',
            event_category: 'performance'
          });
        }
        
        resolve(targetSrc);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = targetSrc;
    });
  }, []);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (observerRef.current) {
            observerRef.current.disconnect();
          }
        }
      },
      {
        threshold: 0.1,
        rootMargin: priority ? '0px' : '100px'
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [priority, isInView]);

  // Load optimized image when in view
  useEffect(() => {
    if (!isInView) return;

    const loadOptimizedImage = async () => {
      const supportedFormat = checkFormatSupport();
      const optimizedSrc = supportedFormat !== 'original' 
        ? generateOptimizedSrc(src, supportedFormat)
        : src;

      try {
        // Try optimized format first
        if (optimizedSrc !== src) {
          const loadedSrc = await loadImage(optimizedSrc);
          setCurrentSrc(loadedSrc);
        } else {
          throw new Error('Use original');
        }
      } catch (error) {
        // Fallback to original
        try {
          const loadedSrc = await loadImage(src);
          setCurrentSrc(loadedSrc);
        } catch (originalError) {
          setHasError(true);
          onError?.();
        }
      }
    };

    loadOptimizedImage();
  }, [isInView, src, generateOptimizedSrc, checkFormatSupport, loadImage, onError]);

  // Handle image load completion
  const handleImageLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  // Generate default placeholder
  const defaultPlaceholder = placeholder || 
    `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width || 400} ${height || 300}"%3E%3Crect width="100%25" height="100%25" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23d1d5db" font-family="sans-serif" font-size="14"%3ELoading...%3C/text%3E%3C/svg%3E`;

  // Generate responsive srcSet if not provided
  const responsiveSrcSet = srcSet || (currentSrc && !currentSrc.includes('http') ? 
    `${currentSrc} 1x, ${currentSrc.replace(/\.(jpg|jpeg|png|webp|avif)$/i, '@2x.$1')} 2x` : 
    undefined);

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio: width && height ? `${width}/${height}` : undefined }}
    >
      {/* Placeholder */}
      {!isLoaded && !hasError && (
        <img
          src={defaultPlaceholder}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-sm"
          aria-hidden="true"
        />
      )}
      
      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 w-full h-full bg-gray-100 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-2xl mb-2">📷</div>
            <div className="text-sm">Image unavailable</div>
          </div>
        </div>
      )}
      
      {/* Actual image */}
      {isInView && currentSrc && !hasError && (
        <img
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          srcSet={responsiveSrcSet}
          loading={loading}
          fetchPriority={priority ? 'high' : 'low'}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleImageLoad}
          onError={() => setHasError(true)}
          style={{
            contentVisibility: priority ? 'visible' : 'auto',
            containIntrinsicSize: width && height ? `${width}px ${height}px` : 'auto'
          }}
        />
      )}
      
      {/* Loading indicator */}
      {isInView && currentSrc && !isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80">
          <div className="w-8 h-8 border-2 border-construction-blue border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

// Hook for image optimization statistics
export const useImageOptimizationStats = () => {
  const [stats, setStats] = useState({
    totalImages: 0,
    optimizedImages: 0,
    webpSupport: false,
    avifSupport: false,
    averageLoadTime: 0
  });

  useEffect(() => {
    const updateStats = () => {
      const allImages = document.querySelectorAll('img');
      const optimizedImages = document.querySelectorAll('img[data-optimized]');
      
      // Check format support
      const canvas = document.createElement('canvas');
      const webpSupport = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      const avifSupport = canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
      
      // Calculate average load time from performance entries
      const imageResources = performance.getEntriesByType('resource')
        .filter(entry => entry.name.match(/\.(jpg|jpeg|png|webp|avif|svg)$/i));
      
      const averageLoadTime = imageResources.length > 0 
        ? imageResources.reduce((sum, entry) => sum + entry.duration, 0) / imageResources.length
        : 0;

      setStats({
        totalImages: allImages.length,
        optimizedImages: optimizedImages.length,
        webpSupport,
        avifSupport,
        averageLoadTime: Math.round(averageLoadTime)
      });
    };

    // Update stats after images have had time to load
    const timer = setTimeout(updateStats, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  return stats;
};

export default EnhancedOptimizedImage;
