/**
 * Canonical Error Boundary
 *
 * The single React error boundary for the app. Express the desired behaviour
 * via the `level` prop instead of reaching for a bespoke boundary component:
 *
 *   - `component` (default) — wrap a small risky subtree. Compact card, retry.
 *   - `feature`             — wrap a major feature area (Financial, CRM, ...).
 *                             Pass `featureName` (and optionally `icon` /
 *                             `description`) for a domain-specific fallback.
 *   - `route`               — wrap lazy-loaded route components. Detects chunk
 *                             load failures (common after a deploy) and offers
 *                             a hard reload.
 *   - `critical`            — wrap the whole app shell. Full-screen fallback.
 *
 * See `src/components/AGENTS.md` (Error handling) for usage guidance.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, WifiOff, LucideIcon } from 'lucide-react';
import { logError } from '@/services/errorLoggingService';
import { captureException } from '@/lib/sentry';

export type ErrorBoundaryLevel = 'component' | 'feature' | 'route' | 'critical';

interface Props {
  children: ReactNode;
  /** Controls the fallback UI and logging severity. Defaults to `component`. */
  level?: ErrorBoundaryLevel;
  /**
   * Custom fallback. Can be a React element (the caught `error` is injected as
   * a prop when it is a valid element), a render function, or a plain node.
   */
  fallback?: ReactNode | ((error?: Error) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Feature area label, used by the `feature`-level fallback. */
  featureName?: string;
  /** Icon shown in the `feature`-level fallback header. */
  icon?: LucideIcon;
  /** Custom description text shown in the fallback body. */
  description?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isChunkError: boolean;
}

const SEVERITY_BY_LEVEL: Record<ErrorBoundaryLevel, 'high' | 'critical'> = {
  component: 'high',
  feature: 'high',
  route: 'high',
  critical: 'critical',
};

function detectChunkError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Loading chunk') ||
    error.message.includes('Loading CSS chunk') ||
    error.message.includes('Unable to preload CSS')
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
    return { hasError: true, error, isChunkError: detectChunkError(error) };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { level = 'component', featureName, onError } = this.props;
    const componentStack = errorInfo.componentStack || undefined;

    console.error(`Error caught by ErrorBoundary (${level}):`, error, errorInfo);
    this.setState({ errorInfo });

    logError({
      error,
      errorType: 'render',
      severity: SEVERITY_BY_LEVEL[level],
      componentStack,
    });
    captureException(error, {
      componentStack,
      boundary: `ErrorBoundary:${level}`,
      ...(featureName ? { featureName } : {}),
      ...(this.state.isChunkError ? { isChunkError: true } : {}),
    });

    onError?.(error, errorInfo);
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
    const { fallback, level = 'component', featureName, icon, description } = this.props;
    const { error, errorInfo, isChunkError } = this.state;

    // Caller-provided fallback takes precedence.
    if (fallback !== undefined) {
      if (typeof fallback === 'function') {
        return fallback(error || undefined);
      }
      if (React.isValidElement(fallback)) {
        return React.cloneElement(fallback as React.ReactElement<{ error?: Error }>, {
          error: error || undefined,
        });
      }
      return fallback;
    }

    const isDev = import.meta.env.DEV;

    // Chunk-load failures (typically after a deploy) — surfaced at any level.
    if (isChunkError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg dark:bg-amber-900/30">
                  <WifiOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <CardTitle className="text-lg">Page failed to load</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This page couldn't be loaded. This usually happens after an update or due to a
                network issue.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={this.handleReload} variant="default" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload App
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

    if (level === 'critical') {
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
                {description ||
                  'A critical error occurred that prevented the application from functioning properly.'}
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

    if (level === 'feature') {
      const Icon = icon || AlertTriangle;
      const featureDescription =
        description ||
        `Something went wrong loading ${featureName || 'this section'}. Please try again or contact support if the problem persists.`;

      return (
        <Card className="w-full max-w-lg mx-auto mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Icon className="h-5 w-5" />
              {featureName ? `${featureName} Error` : 'Something went wrong'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{featureDescription}</p>
            {isDev && error && (
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-32">
                {error.message}
              </pre>
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

    // `route` and `component` levels share a compact fallback.
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-lg">Something went wrong</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {description || 'An unexpected error occurred while loading this content.'}
            </p>
            {isDev && error && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-xs font-mono text-destructive break-all">{error.message}</p>
              </div>
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

  public render() {
    if (this.state.hasError) {
      return this.renderFallback();
    }
    return this.props.children;
  }
}

/** HOC that wraps a component in the canonical error boundary. */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  boundaryProps?: Omit<Props, 'children'>
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary {...boundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
