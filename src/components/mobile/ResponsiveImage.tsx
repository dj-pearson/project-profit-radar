import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  aspectRatio?: 'square' | 'video' | '4/3' | '3/2';
  className?: string;
  priority?: boolean;
}

/**
 * Responsive image component with lazy loading and aspect ratio
 */
export function ResponsiveImage({
  src,
  alt,
  aspectRatio = 'video',
  className,
  priority = false,
}: ResponsiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    '4/3': 'aspect-[4/3]',
    '3/2': 'aspect-[3/2]',
  };

  if (error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted',
          aspectClasses[aspectRatio],
          className
        )}
      >
        <span className="text-sm text-muted-foreground">Image not available</span>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', aspectClasses[aspectRatio], className)}>
      {/* Placeholder while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
        className={cn(
          'absolute inset-0 w-full h-full object-cover',
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
}

/**
 * Picture element for different screen sizes
 */
interface PictureImageProps {
  src: string;
  alt: string;
  mobileSrc?: string;
  tabletSrc?: string;
  className?: string;
}

export function PictureImage({
  src,
  alt,
  mobileSrc,
  tabletSrc,
  className,
}: PictureImageProps) {
  return (
    <picture>
      {mobileSrc && (
        <source media="(max-width: 767px)" srcSet={mobileSrc} />
      )}
      {tabletSrc && (
        <source media="(max-width: 1023px)" srcSet={tabletSrc} />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn('w-full h-auto', className)}
      />
    </picture>
  );
}
