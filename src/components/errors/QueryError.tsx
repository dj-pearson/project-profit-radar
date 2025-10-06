import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';

interface QueryErrorProps {
  error: Error;
  onRetry?: () => void;
  showHomeButton?: boolean;
}

export const QueryError = ({ error, onRetry, showHomeButton }: QueryErrorProps) => {
  const navigate = useNavigate();
  
  const getErrorMessage = (error: Error) => {
    // Parse Supabase errors
    if (error.message.includes('JWT') || error.message.includes('token')) {
      return 'Your session has expired. Please log in again.';
    }
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return 'Unable to connect. Please check your internet connection.';
    }
    if (error.message.includes('not found') || error.message.includes('404')) {
      return 'The requested resource was not found.';
    }
    if (error.message.includes('permission') || error.message.includes('RLS')) {
      return 'You don\'t have permission to access this resource.';
    }
    return 'An unexpected error occurred. Please try again.';
  };

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription className="mt-2">
        {getErrorMessage(error)}
      </AlertDescription>
      <div className="mt-4 flex gap-2">
        {onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Try Again
          </Button>
        )}
        {showHomeButton && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <Home className="h-3 w-3" />
            Go Home
          </Button>
        )}
      </div>
    </Alert>
  );
};
