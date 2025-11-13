/**
 * Suspense Loader Component
 * Provides skeleton loading states for lazy-loaded routes and components
 */

import { Suspense, ComponentType, ReactNode } from 'react';
import { PageSkeleton, DashboardSkeleton, DataTablePageSkeleton, CardSkeleton } from '../ui/skeletons';

export type LoaderType = 'page' | 'dashboard' | 'table' | 'card' | 'custom';

interface SuspenseLoaderProps {
  children: ReactNode;
  type?: LoaderType;
  fallback?: ReactNode;
}

/**
 * Wraps content in Suspense with appropriate loading skeleton
 */
export function SuspenseLoader({
  children,
  type = 'page',
  fallback
}: SuspenseLoaderProps) {
  const getFallback = () => {
    if (fallback) return fallback;

    switch (type) {
      case 'dashboard':
        return <DashboardSkeleton />;
      case 'table':
        return <DataTablePageSkeleton />;
      case 'card':
        return <CardSkeleton />;
      case 'page':
      default:
        return <PageSkeleton />;
    }
  };

  return (
    <Suspense fallback={getFallback()}>
      {children}
    </Suspense>
  );
}

/**
 * HOC to wrap a lazy-loaded component with Suspense and skeleton
 */
export function withSuspenseLoader<P extends object>(
  Component: ComponentType<P>,
  loaderType: LoaderType = 'page',
  customFallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <SuspenseLoader type={loaderType} fallback={customFallback}>
        <Component {...props} />
      </SuspenseLoader>
    );
  };
}

/**
 * Lazy load a component with automatic skeleton
 */
export function lazyWithSkeleton<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  loaderType: LoaderType = 'page',
  customFallback?: ReactNode
) {
  const LazyComponent = import('react').then(({ lazy }) => lazy(importFn));

  return function LoadableComponent(props: P) {
    return (
      <SuspenseLoader type={loaderType} fallback={customFallback}>
        <LazyComponent {...props} />
      </SuspenseLoader>
    );
  };
}
