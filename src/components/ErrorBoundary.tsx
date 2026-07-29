import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home, WifiOff, LucideIcon } from 'lucide-react';
import { logError } from '@/services/errorLoggingService';
import { captureException } from '@/lib/sentry';

/**
 * Canonical error boundary for the whole app (US-265).
 *
 * A single class expresses every error-UX shape via the `variant` prop, so we
 * no longer maintain 4+ near-duplicate boundary components:
 *
 * - `route`    — wraps lazy-loaded routes; detects chunk-load failures and
 *                offers reload / go-home. (was RouteErrorBoundary)
 * - `feature`  — wraps a feature section so one area's failure doesn't take down
 *                the page; shows `featureName`. (was FeatureErrorBoundary)
 * - `critical` — full-screen fallback for app-shell-level failures.
 *                (was CriticalErrorBoundary)
 * - `inline`   — compact Alert for small subtrees. (was ui/error-boundary)
 * - `default`  — centered card. (was ErrorBoundary / ui/ErrorBoundary)
 *
 * A custom `fallback` (element or `(error) => ReactNode`) overrides the variant UI.
 */
export type ErrorBoundaryVariant = 'default' | 'route' | 'feature' | 'critical' | 'inline';

interface Props {
  children: ReactNode;
  /** Selects the built-in fallback UI. Defaults to `default`. */
  variant?: ErrorBoundaryVariant;
  /** Custom fallback: a React element (receives an injected `error` prop) or a render function. */
  fallback?: ReactNode | ((error?: Error) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** `feature` variant: name of the feature area, e.g. "Financial Dashboard". */
  featureName?: string;
  /** `feature` variant: icon shown in the fallback. */
  icon?: LucideIcon;
  /** `feature` variant: custom user-facing description. */
  description?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isChunkError: boolean;
}

const SEVERITY_BY_VARIANT: Record<ErrorBoundaryVariant, 'critical' | 'high'> = {
  critical: 'critical',
  route: 'high',
  feature: 'high',
  inline: 'high',
  default: 'high',
};

function isChunkLoadError(error: Error): boolean {
  return (
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Loading chunk') ||
    error.message.includes('Loading CSS chunk') ||
    error.message.includes('Unable to preload CSS') ||
    error.name === 'ChunkLoadError'
  );
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isChunkError: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, isChunkError: isChunkLoadError(error) };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const variant = this.props.variant ?? 'default';
    console.error(`Error caught by ${variant} boundary:`, error, errorInfo);
    this.setState({ errorInfo });

    logError({
      error,
      errorType: 'render',
      severity: SEVERITY_BY_VARIANT[variant],
      componentStack: errorInfo.componentStack || undefined,
    });
    captureException(error, {
      componentStack: errorInfo.componentStack || undefined,
      boundary: `ErrorBoundary:${variant}`,
      featureName: this.props.featureName,
      isChunkError: this.state.isChunkError,
    });

    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, isChunkError: false });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  private renderFallback() {
    const { fallback, variant = 'default', featureName, icon, description } = this.props;
    const { error, errorInfo, isChunkError } = this.state;

    // Custom fallback wins.
    if (fallback) {
      if (typeof fallback === 'function') return fallback(error ?? undefined);
      if (React.isValidElement(fallback)) {
        return React.cloneElement(fallback as React.ReactElement<{ error?: Error }>, {
          error: error ?? undefined,
        });
      }
      return fallback;
    }

    const isDev = import.meta.env.DEV;

    if (variant === 'route') {
      const Icon = isChunkError ? WifiOff : AlertTriangle;
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isChunkError ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  <Icon className={`h-5 w-5 ${isChunkError ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`} />
                </div>
                <CardTitle className="text-lg">
                  {isChunkError ? 'Page failed to load' : 'Something went wrong'}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {isChunkError
                  ? "This page couldn't be loaded. This usually happens after an update or due to a network issue."
                  : 'An unexpected error occurred while loading this page.'}
              </p>
              {isDev && error && (
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-xs font-mono text-destructive break-all">{error.message}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button onClick={isChunkError ? this.handleReload : this.handleRetry} variant="default" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {isChunkError ? 'Reload App' : 'Try Again'}
                </Button>
                <Button onClick={this.handleGoHome} variant="outline" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (variant === 'feature') {
      const Icon = icon || AlertTriangle;
      const desc =
        description ||
        `Something went wrong loading ${featureName ?? 'this section'}. Please try again or contact support if the problem persists.`;
      return (
        <Card className="w-full max-w-lg mx-auto mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Icon className="h-5 w-5" />
              {featureName ? `${featureName} Error` : 'Error'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{desc}</p>
            {isDev && error && (
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-32">{error.message}</pre>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={this.handleRetry}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
              <Button variant="ghost" size="sm" onClick={this.handleGoHome}>
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button variant="link" size="sm" asChild>
                <a href="mailto:support@brikly.net">Contact Support</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (variant === 'critical') {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-6 w-6" />
                Critical Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                A critical error occurred that prevented the application from functioning properly.
              </p>
              {error && (
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm font-mono text-destructive">{error.message}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={this.handleReload} variant="outline">
                  Reload Page
                </Button>
                <Button onClick={() => (window.location.href = '/')}>
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (variant === 'inline') {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription className="mt-2 space-y-3">
                <p>An error occurred while rendering this component.</p>
                {isDev && error && (
                  <details className="text-xs">
                    <summary className="cursor-pointer">Error details</summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words">{error.toString()}</pre>
                  </details>
                )}
                <Button variant="outline" size="sm" onClick={this.handleRetry} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    // default
    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We encountered an unexpected error. Please try refreshing the page.
          </p>
          {error && (
            <div className="bg-muted p-3 rounded-md text-sm font-mono">{error.message}</div>
          )}
          {isDev && errorInfo?.componentStack && (
            <details className="text-xs">
              <summary className="cursor-pointer">Component stack</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words max-h-48 overflow-auto">
                {errorInfo.componentStack}
              </pre>
            </details>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={this.handleRetry} variant="default" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={this.handleReload} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  public render() {
    if (this.state.hasError) return this.renderFallback();
    return this.props.children;
  }
}

/** HOC for wrapping a component in the canonical ErrorBoundary. */
export function withErrorBoundary<P extends object>(
  Wrapped: React.ComponentType<P>,
  boundaryProps?: Omit<Props, 'children'>,
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary {...boundaryProps}>
        <Wrapped {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
