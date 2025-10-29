import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ErrorStateProps {
  error?: Error | string;
  title?: string;
  onRetry?: () => void;
  fullPage?: boolean;
  inline?: boolean;
}

export function ErrorState({ 
  error,
  title = 'Something went wrong',
  onRetry,
  fullPage = false,
  inline = false
}: ErrorStateProps) {
  const errorMessage = typeof error === 'string' 
    ? error 
    : error?.message || 'An unexpected error occurred. Please try again.';

  if (inline) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{errorMessage}</span>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="ml-4"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  const content = (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full bg-destructive/10 p-3">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {errorMessage}
        </p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-lg">
          {content}
        </Card>
      </div>
    );
  }

  return (
    <Card>
      {content}
    </Card>
  );
}

export function EmptyState({
  title = 'No data found',
  description = 'There are no items to display.',
  action,
  icon: Icon = AlertCircle,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <div className="rounded-full bg-muted p-3">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {description}
          </p>
        </div>
        {action}
      </div>
    </Card>
  );
}
