/**
 * Image optimization utilities for better mobile performance
 */

export const optimizeImageUrl = (url: string, width?: number, quality = 80): string => {
  // If it's a Supabase storage URL, add transformation parameters
  if (url.includes('.supabase.co/storage/v1/object/public/')) {
    const params = new URLSearchParams();
    if (width) params.append('width', width.toString());
    params.append('quality', quality.toString());
    params.append('format', 'webp');
    
    return `${url}?${params.toString()}`;
  }
  
  return url;
};

export const getResponsiveImageSizes = () => ({
  small: 480,
  medium: 768,
  large: 1024,
  xlarge: 1280
});

export const generateSrcSet = (baseUrl: string, sizes = getResponsiveImageSizes()) => {
  return Object.entries(sizes)
    .map(([key, width]) => `${optimizeImageUrl(baseUrl, width)} ${width}w`)
    .join(', ');
};

export const preloadCriticalImages = (imageUrls: string[]) => {
  imageUrls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = optimizeImageUrl(url, 400);
    document.head.appendChild(link);
  });
};

export const lazyLoadImage = (img: HTMLImageElement, src: string) => {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          img.src = src;
          img.classList.remove('opacity-0');
          img.classList.add('opacity-100');
          observer.unobserve(img);
        }
      });
    });
    
    observer.observe(img);
  } else {
    // Fallback for browsers without IntersectionObserver
    img.src = src;
  }
};