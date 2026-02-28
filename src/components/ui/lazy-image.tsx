import { useState, useEffect, useRef, useCallback, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /** Width in pixels to prevent CLS */
  width?: number;
  /** Height in pixels to prevent CLS */
  height?: number;
  /** Optional WebP source for modern browsers */
  webpSrc?: string;
  /** Optional AVIF source for modern browsers */
  avifSrc?: string;
  /** IntersectionObserver threshold */
  threshold?: number;
  /** IntersectionObserver root margin */
  rootMargin?: string;
  /** Show skeleton placeholder while loading */
  showPlaceholder?: boolean;
}

export const LazyImage = ({
  src,
  alt,
  width,
  height,
  webpSrc,
  avifSrc,
  threshold = 0.1,
  rootMargin = '50px',
  showPlaceholder = true,
  className,
  ...props
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold]);

  const handleLoad = useCallback(() => setIsLoaded(true), []);
  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(true);
  }, []);

  const hasModernFormats = webpSrc || avifSrc;

  // Error fallback
  if (hasError) {
    return (
      <div
        className={cn(
          'bg-muted flex items-center justify-center text-muted-foreground text-sm rounded',
          className
        )}
        style={{ width, height }}
        role="img"
        aria-label={alt}
      >
        Image unavailable
      </div>
    );
  }

  const imgElement = (
    <img
      src={isInView ? src : undefined}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      onLoad={handleLoad}
      onError={handleError}
      className={cn(
        'transition-opacity duration-300',
        isLoaded ? 'opacity-100' : 'opacity-0',
        className
      )}
      {...props}
    />
  );

  const imageContent = hasModernFormats && isInView ? (
    <picture>
      {avifSrc && <source srcSet={avifSrc} type="image/avif" />}
      {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
      {imgElement}
    </picture>
  ) : imgElement;

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ width, height }}
    >
      {!isLoaded && showPlaceholder && width && height && (
        <Skeleton className="absolute inset-0 rounded" style={{ width, height }} />
      )}
      {imageContent}
    </div>
  );
};
