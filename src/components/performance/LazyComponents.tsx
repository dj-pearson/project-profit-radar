import { lazy, Suspense } from 'react';

// Lazy load heavy components for better performance
const LazyFeatures = lazy(() => import('@/components/Features'));
const LazyPricing = lazy(() => import('@/components/Pricing'));
const LazyIndustries = lazy(() => import('@/components/Industries'));

interface ComponentSkeletonProps {
  height?: string;
  /** Accessible label for screen readers */
  label?: string;
}

/**
 * Accessible loading skeleton for lazy-loaded components
 */
const ComponentSkeleton = ({
  height = "400px",
  label = "Loading section"
}: ComponentSkeletonProps) => (
  <div
    className="w-full animate-pulse"
    style={{ height }}
    role="status"
    aria-busy="true"
    aria-label={label}
  >
    <span className="sr-only">{label}, please wait...</span>
    <div className="bg-muted rounded-lg h-full flex items-center justify-center">
      <div
        className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"
        aria-hidden="true"
      />
    </div>
  </div>
);

interface PerformanceLazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  /** Label for the loading state */
  loadingLabel?: string;
}

/**
 * Performance-optimized lazy wrapper with accessibility support
 */
export const PerformanceLazyWrapper = ({
  children,
  fallback,
  className = "",
  loadingLabel = "Loading content"
}: PerformanceLazyWrapperProps) => (
  <Suspense fallback={fallback || <ComponentSkeleton label={loadingLabel} />}>
    <div className={className}>
      {children}
    </div>
  </Suspense>
);

export { LazyFeatures, LazyPricing, LazyIndustries, ComponentSkeleton };