/**
 * Optimized Image Gallery Component
 * Features progressive loading, lazy loading, and lightbox view
 */

import { useState } from 'react';
import { ProgressiveImage } from '@/components/performance/ProgressiveImage';
import { AccessibleModal } from '@/components/accessibility/AccessibleModal';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Download, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GalleryImage {
  id: string;
  src: string;
  thumbnail?: string;
  alt: string;
  title?: string;
  caption?: string;
  width?: number;
  height?: number;
}

interface OptimizedImageGalleryProps {
  images: GalleryImage[];
  columns?: 2 | 3 | 4 | 5;
  gap?: 'sm' | 'md' | 'lg';
  aspectRatio?: string;
  className?: string;
  onImageClick?: (image: GalleryImage, index: number) => void;
}

const gapClasses = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

/**
 * Optimized image gallery with progressive loading and lightbox
 */
export function OptimizedImageGallery({
  images,
  columns = 3,
  gap = 'md',
  aspectRatio = '1/1',
  className,
  onImageClick,
}: OptimizedImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleImageClick = (image: GalleryImage, index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
    onImageClick?.(image, index);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handleDownload = async () => {
    const image = images[currentIndex];
    try {
      const response = await fetch(image.src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.title || `image-${image.id}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  const currentImage = images[currentIndex];

  return (
    <>
      {/* Gallery Grid */}
      <div
        className={cn(
          'grid',
          `grid-cols-2 md:grid-cols-${columns}`,
          gapClasses[gap],
          className
        )}
        role="list"
        aria-label="Image gallery"
      >
        {images.map((image, index) => (
          <button
            key={image.id}
            onClick={() => handleImageClick(image, index)}
            className={cn(
              'relative overflow-hidden rounded-lg',
              'transition-transform hover:scale-105',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'group'
            )}
            aria-label={`View ${image.alt}`}
            role="listitem"
          >
            <ProgressiveImage
              src={image.thumbnail || image.src}
              placeholder={image.thumbnail}
              alt={image.alt}
              aspectRatio={aspectRatio}
              className="w-full h-full"
            />

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Image title */}
            {image.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <p className="text-white text-sm font-medium truncate">
                  {image.title}
                </p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      {currentImage && (
        <AccessibleModal
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          title={currentImage.title || currentImage.alt}
          description={currentImage.caption}
          size="full"
          className="bg-black/95"
        >
          <div className="relative flex items-center justify-center min-h-[60vh]">
            {/* Main Image */}
            <ProgressiveImage
              src={currentImage.src}
              alt={currentImage.alt}
              className="max-w-full max-h-[70vh] object-contain"
              lazy={false}
            />

            {/* Navigation Buttons */}
            {images.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/80 backdrop-blur"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/80 backdrop-blur"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Image Counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-background/80 backdrop-blur rounded-full text-sm font-medium">
              {currentIndex + 1} / {images.length}
            </div>

            {/* Action Buttons */}
            <div className="absolute top-4 right-4 flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleDownload}
                className="h-10 w-10 rounded-full bg-background/80 backdrop-blur"
                aria-label="Download image"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Caption */}
          {currentImage.caption && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {currentImage.caption}
            </div>
          )}

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div className="mt-6 flex gap-2 justify-center overflow-x-auto pb-2">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    'relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden',
                    'transition-all hover:scale-110',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    index === currentIndex
                      ? 'ring-2 ring-primary scale-110'
                      : 'opacity-50 hover:opacity-100'
                  )}
                  aria-label={`View ${image.alt}`}
                  aria-current={index === currentIndex}
                >
                  <ProgressiveImage
                    src={image.thumbnail || image.src}
                    alt={image.alt}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </AccessibleModal>
      )}
    </>
  );
}

/**
 * Keyboard navigation for lightbox
 */
export function useGalleryKeyboardNavigation(
  isOpen: boolean,
  onPrevious: () => void,
  onNext: () => void,
  onClose: () => void
) {
  useState(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          onPrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          onNext();
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });
}

/**
 * Example usage:
 *
 * ```tsx
 * const galleryImages: GalleryImage[] = [
 *   {
 *     id: '1',
 *     src: '/images/project-1-full.jpg',
 *     thumbnail: '/images/project-1-thumb.jpg',
 *     alt: 'Construction site overview',
 *     title: 'Main Building',
 *     caption: 'Foundation work completed - Day 30'
 *   },
 *   // ... more images
 * ];
 *
 * <OptimizedImageGallery
 *   images={galleryImages}
 *   columns={4}
 *   gap="md"
 *   aspectRatio="16/9"
 * />
 * ```
 */
