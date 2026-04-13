import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, LucideIcon } from 'lucide-react';
import { captureException } from '@/lib/sentry';
import { logError } from '@/services/errorLoggingService';

interface Props {
  children: ReactNode;
  /** Display name for this feature area (e.g., "Financial Dashboard") */
  featureName: string;
  /** Icon to show in the error fallback */
  icon?: LucideIcon;
  /** Custom description for users when an error occurs */
  description?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Feature-section error boundary with domain-specific fallback UI.
 *
 * Wraps major feature areas (Financial, Projects, CRM, etc.) so that
 * an error in one section doesn't take down the entire page.
 */
export class FeatureErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError({
      error,
      errorType: 'render',
      severity: 'high',
      componentStack: errorInfo.componentStack || undefined,
    });
    captureException(error, {
      componentStack: errorInfo.componentStack || undefined,
      boundary: 'FeatureErrorBoundary',
      featureName: this.props.featureName,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      const Icon = this.props.icon || AlertTriangle;
      const description =
        this.props.description ||
        `Something went wrong loading ${this.props.featureName}. Please try again or contact support if the problem persists.`;

      return (
        <Card className="w-full max-w-lg mx-auto mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Icon className="h-5 w-5" />
              {this.props.featureName} Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{description}</p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-32">
                {this.state.error.message}
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
              <Button
                variant="link"
                size="sm"
                asChild
              >
                <a href="mailto:support@brikly.net">Contact Support</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
