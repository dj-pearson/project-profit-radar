import { lazy, Suspense } from 'react';

// Lazy load heavy components for better performance
const LazyFeatures = lazy(() => import('@/components/Features'));
const LazyPricing = lazy(() => import('@/components/Pricing'));
const LazyIndustries = lazy(() => import('@/components/Industries'));

// Loading component with skeleton
const ComponentSkeleton = ({ height = "400px" }: { height?: string }) => (
  <div className="w-full animate-pulse" style={{ height }}>
    <div className="bg-muted rounded-lg h-full flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  </div>
);

// Performance-optimized lazy wrapper
export const PerformanceLazyWrapper = ({ 
  children, 
  fallback,
  className = "" 
}: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
  className?: string;
}) => (
  <Suspense fallback={fallback || <ComponentSkeleton />}>
    <div className={className}>
      {children}
    </div>
  </Suspense>
);

export { LazyFeatures, LazyPricing, LazyIndustries };