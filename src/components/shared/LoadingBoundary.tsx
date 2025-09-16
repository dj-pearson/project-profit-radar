import React, { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  message = 'Loading...' 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
};

interface LoadingCardProps {
  message?: string;
  height?: string;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({ 
  message = 'Loading...', 
  height = 'h-64' 
}) => {
  return (
    <Card>
      <CardContent className={`flex items-center justify-center ${height}`}>
        <LoadingSpinner message={message} />
      </CardContent>
    </Card>
  );
};

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundaryComponent extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ComponentType<{ error?: Error; retry: () => void }> }>,
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  retry: () => void;
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, retry }) => {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Something went wrong</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {error?.message || 'An unexpected error occurred. Please try again.'}
          </p>
        </div>
        <Button onClick={retry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
};

interface LoadingBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType;
  errorFallback?: React.ComponentType<ErrorFallbackProps>;
  loadingMessage?: string;
}

export const LoadingBoundary: React.FC<LoadingBoundaryProps> = ({
  children,
  fallback: LoadingFallback,
  errorFallback,
  loadingMessage = 'Loading...'
}) => {
  const DefaultLoadingFallback = () => <LoadingSpinner message={loadingMessage} />;
  
  return (
    <ErrorBoundaryComponent fallback={errorFallback}>
      <Suspense fallback={LoadingFallback ? <LoadingFallback /> : <DefaultLoadingFallback />}>
        {children}
      </Suspense>
    </ErrorBoundaryComponent>
  );
};

// Hook for handling async operations with loading states
export const useAsyncOperation = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const execute = async <T,>(
    asyncFn: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: Error) => void
  ): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await asyncFn();
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setError(null);
  };

  return { loading, error, execute, reset };
};

// Data fetching hook with built-in loading and error states
export const useAsyncData = <T,>(
  fetchFn: () => Promise<T>,
  deps: React.DependencyList = []
) => {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const refetch = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch data');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, deps);

  React.useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
};