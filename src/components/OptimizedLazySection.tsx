import React, { useState, useEffect, useRef, ReactNode } from 'react';

interface OptimizedLazySectionProps {
  children: ReactNode;
  className?: string;
  threshold?: number;
  rootMargin?: string;
  fallback?: ReactNode;
  priority?: 'low' | 'normal' | 'high';
}

const OptimizedLazySection: React.FC<OptimizedLazySectionProps> = ({ 
  children, 
  className,
  threshold = 0.1, 
  rootMargin = '200px',
  fallback,
  priority = 'normal'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          
          // Use requestIdleCallback for non-critical content
          if (priority === 'low' && 'requestIdleCallback' in window) {
            requestIdleCallback(() => {
              setIsLoaded(true);
            });
          } else {
            // Use setTimeout for better performance on mobile
            setTimeout(() => {
              setIsLoaded(true);
            }, priority === 'high' ? 0 : 50);
          }
          
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin, priority]);

  return (
    <div 
      ref={sectionRef} 
      className={className}
      style={{ minHeight: isVisible ? 'auto' : '200px' }}
    >
      {isLoaded ? children : (
        fallback || (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse bg-muted rounded-lg w-full h-32" />
          </div>
        )
      )}
    </div>
  );
};

export default OptimizedLazySection;