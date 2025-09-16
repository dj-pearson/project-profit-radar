import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CriticalErrorFallbackProps {
  error?: Error;
}

const CriticalErrorFallback: React.FC<CriticalErrorFallbackProps> = ({ error }) => {
  const navigate = useNavigate();

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
              <p className="text-sm font-mono text-destructive">
                {error.message}
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()} variant="outline">
              Reload Page
            </Button>
            <Button onClick={() => navigate('/')}>
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface CriticalErrorBoundaryProps {
  children: React.ReactNode;
}

const CriticalErrorBoundary: React.FC<CriticalErrorBoundaryProps> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={<CriticalErrorFallback />}
      onError={(error, errorInfo) => {
        // Log critical errors to external service in production
        console.error('Critical error:', { error, errorInfo });
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default CriticalErrorBoundary;