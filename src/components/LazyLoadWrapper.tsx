import { Suspense, ComponentType, ReactNode } from 'react';

interface LazyLoadWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

const DefaultFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

export const LazyLoadWrapper = ({ children, fallback = <DefaultFallback /> }: LazyLoadWrapperProps) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};

export const withLazyLoading = <P extends object>(Component: ComponentType<P>) => {
  return (props: P) => (
    <LazyLoadWrapper>
      <Component {...props} />
    </LazyLoadWrapper>
  );
};