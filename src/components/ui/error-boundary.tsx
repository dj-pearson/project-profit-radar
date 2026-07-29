import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

// US-265: the ErrorBoundary implementation is now canonical in
// `@/components/ErrorBoundary`. Use `<ErrorBoundary variant="inline">` for the
// compact Alert look this file used to render. Re-exported here for backward
// compatibility so existing `from '@/components/ui/error-boundary'` imports work.
export { ErrorBoundary, withErrorBoundary } from "@/components/ErrorBoundary";
export type { ErrorBoundaryVariant } from "@/components/ErrorBoundary";

// This module now owns the small state-feedback helpers (ErrorState / EmptyState).

// Hook-based error state component
export const ErrorState: React.FC<{
  error?: Error | string;
  onRetry?: () => void;
  className?: string;
}> = ({ error, onRetry, className }) => {
  const errorMessage = typeof error === 'string' ? error : error?.message || 'An unexpected error occurred';

  return (
    <div className={cn("flex items-center justify-center p-6", className)}>
      <Alert variant="destructive" className="max-w-md">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <p>{errorMessage}</p>
          {onRetry && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
};

// Empty state component
export const EmptyState: React.FC<{
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}> = ({ icon: Icon, title, description, action, className }) => {
  return (
    <div className={cn("text-center p-8", className)}>
      {Icon && <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />}
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground mb-4">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};