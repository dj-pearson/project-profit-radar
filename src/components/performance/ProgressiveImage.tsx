/**
 * Progressive Image Component
 * Loads images efficiently with blur placeholder and lazy loading
 */

import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ProgressiveImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** Full resolution image URL */
  src: string;
  /** Low quality image placeholder (optional, base64 or small image) */
  placeholder?: string;
  /** Alt text for accessibility */
  alt: string;
  /** CSS class name */
  className?: string;
  /** Aspect ratio for container (e.g., "16/9", "4/3") */
  aspectRatio?: string;
  /** Enable lazy loading (default: true) */
  lazy?: boolean;
  /** Callback when image loads */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
}

/**
 * Progressive image with lazy loading and blur-up effect
 */
export function ProgressiveImage({
  src,
  placeholder,
  alt,
  className,
  aspectRatio,
  lazy = true,
  onLoad,
  onError,
  ...props
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | undefined>(placeholder);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // If not lazy loading, load immediately
    if (!lazy) {
      loadImage();
      return;
    }

    // Intersection Observer for lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImage();
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src, lazy]);

  const loadImage = () => {
    const img = new Image();
    img.src = src;

    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
      onLoad?.();
    };

    img.onerror = () => {
      setHasError(true);
      onError?.();
    };
  };

  // Error state
  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground',
          aspectRatio && 'relative',
          className
        )}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        <div className="text-center p-4">
          <svg
            className="mx-auto h-12 w-12 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm">Failed to load image</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('relative overflow-hidden', aspectRatio && 'relative', className)}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={cn(
          'transition-all duration-300',
          aspectRatio ? 'absolute inset-0 w-full h-full object-cover' : 'w-full h-auto',
          !isLoaded && placeholder && 'blur-sm scale-105',
          isLoaded && 'blur-0 scale-100'
        )}
        {...props}
      />
      {!isLoaded && (
        <div
          className={cn(
            'absolute inset-0 bg-muted animate-pulse',
            aspectRatio ? '' : 'min-h-[200px]'
          )}
        />
      )}
    </div>
  );
}

/**
 * Simple lazy image with native loading attribute
 * Use this for basic lazy loading without progressive enhancement
 */
export function LazyImage({
  src,
  alt,
  className,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      {...props}
    />
  );
}

/**
 * Responsive image with multiple sources
 */
interface ResponsiveImageProps {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
  lazy?: boolean;
}

export function ResponsiveImage({
  src,
  srcSet,
  sizes,
  alt,
  className,
  aspectRatio,
  lazy = true,
}: ResponsiveImageProps) {
  return (
    <picture>
      {srcSet && (
        <source srcSet={srcSet} sizes={sizes} type="image/webp" />
      )}
      <ProgressiveImage
        src={src}
        alt={alt}
        className={className}
        aspectRatio={aspectRatio}
        lazy={lazy}
      />
    </picture>
  );
}
