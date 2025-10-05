import { useState, useEffect, useRef } from 'react';

interface OptimizedSupabaseImageProps {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  quality?: number;
}

/**
 * Optimized image component for Supabase Storage images
 * Automatically applies:
 * - Image transformations (resize, quality)
 * - Responsive srcset
 * - Lazy loading
 * - Intersection Observer
 */
export const OptimizedSupabaseImage = ({
  src,
  alt,
  sizes = '100vw',
  className = '',
  width,
  height,
  priority = false,
  quality = 80
}: OptimizedSupabaseImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.01,
        rootMargin: '100px'
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [priority]);

  // Check if URL is from Supabase Storage
  const isSupabaseUrl = src.includes('supabase.co/storage');

  // Generate transformed URLs for Supabase images
  const getTransformedUrl = (size: number) => {
    if (!isSupabaseUrl) return src;
    
    const baseUrl = src.split('?')[0];
    return `${baseUrl}?width=${size}&quality=${quality}`;
  };

  // Generate srcset for responsive images
  const srcSet = isSupabaseUrl
    ? `
        ${getTransformedUrl(400)} 400w,
        ${getTransformedUrl(800)} 800w,
        ${getTransformedUrl(1200)} 1200w,
        ${getTransformedUrl(1600)} 1600w
      `
    : undefined;

  // Main image URL (optimized)
  const optimizedSrc = isSupabaseUrl ? getTransformedUrl(800) : src;

  // Placeholder styles
  const placeholderStyle = {
    backgroundColor: '#f3f4f6',
    minHeight: height ? `${height}px` : '200px'
  };

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={!isLoaded ? placeholderStyle : undefined}
    >
      {isInView && (
        <img
          src={optimizedSrc}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)}
        />
      )}
      
      {!isLoaded && isInView && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
    </div>
  );
};

/**
 * Helper function to get optimized Supabase image URL
 * Use this when you need just the URL, not the component
 */
export const getOptimizedSupabaseUrl = (
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif';
  } = {}
): string => {
  if (!url.includes('supabase.co/storage')) return url;

  const { width, height, quality = 80, format } = options;
  const baseUrl = url.split('?')[0];
  const params = new URLSearchParams();

  if (width) params.append('width', width.toString());
  if (height) params.append('height', height.toString());
  if (quality) params.append('quality', quality.toString());
  if (format) params.append('format', format);

  return `${baseUrl}?${params.toString()}`;
};

/**
 * Generate responsive sizes string helper
 */
export const generateSizes = (breakpoints: {
  mobile?: number;
  tablet?: number;
  desktop?: number;
}) => {
  const { mobile = 100, tablet, desktop } = breakpoints;
  
  const sizes = [];
  
  if (desktop) sizes.push(`(min-width: 1024px) ${desktop}vw`);
  if (tablet) sizes.push(`(min-width: 768px) ${tablet}vw`);
  sizes.push(`${mobile}vw`);
  
  return sizes.join(', ');
};
