/**
 * QuickBooks OAuth Callback Page
 *
 * Handles the redirect from QuickBooks OAuth flow.
 * Exchanges authorization code for access tokens and stores them.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

type CallbackStatus = 'processing' | 'success' | 'error';

interface CallbackState {
  status: CallbackStatus;
  message: string;
  details?: string;
}

export default function QuickBooksCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [state, setState] = useState<CallbackState>({
    status: 'processing',
    message: 'Connecting to QuickBooks...'
  });

  useEffect(() => {
    const processCallback = async () => {
      // Get OAuth parameters from URL
      const code = searchParams.get('code');
      const oauthState = searchParams.get('state');
      const realmId = searchParams.get('realmId');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Handle QuickBooks error response
      if (error) {
        setState({
          status: 'error',
          message: 'QuickBooks authorization failed',
          details: errorDescription || error
        });
        return;
      }

      // Validate required parameters
      if (!code || !oauthState) {
        setState({
          status: 'error',
          message: 'Invalid callback parameters',
          details: 'Missing authorization code or state parameter'
        });
        return;
      }

      if (!userProfile?.company_id) {
        setState({
          status: 'error',
          message: 'Authentication required',
          details: 'Please sign in and try connecting again'
        });
        return;
      }

      try {
        setState({
          status: 'processing',
          message: 'Exchanging authorization code...'
        });

        // Call edge function to exchange code for tokens
        const { data, error: exchangeError } = await supabase.functions.invoke('quickbooks-callback', {
          body: {
            code,
            state: oauthState,
            realm_id: realmId,
            company_id: userProfile.company_id,
            redirect_uri: `${window.location.origin}/quickbooks/callback`
          }
        });

        if (exchangeError) {
          throw new Error(exchangeError.message || 'Failed to exchange authorization code');
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        setState({
          status: 'success',
          message: 'Successfully connected to QuickBooks!',
          details: data?.company_name ? `Connected to: ${data.company_name}` : undefined
        });

        // Redirect to settings after a short delay
        setTimeout(() => {
          navigate('/settings/integrations', {
            state: {
              message: 'QuickBooks connected successfully',
              type: 'success'
            }
          });
        }, 2000);

      } catch (err) {
        console.error('QuickBooks callback error:', err);
        setState({
          status: 'error',
          message: 'Failed to complete QuickBooks connection',
          details: err instanceof Error ? err.message : 'An unexpected error occurred'
        });
      }
    };

    processCallback();
  }, [searchParams, userProfile?.company_id, navigate]);

  const handleRetry = () => {
    navigate('/settings/integrations');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {state.status === 'processing' && (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>Connecting to QuickBooks</span>
              </>
            )}
            {state.status === 'success' && (
              <>
                <CheckCircle className="h-6 w-6 text-green-500" />
                <span>Connection Successful</span>
              </>
            )}
            {state.status === 'error' && (
              <>
                <XCircle className="h-6 w-6 text-destructive" />
                <span>Connection Failed</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.status === 'processing' && (
            <div className="text-center">
              <p className="text-muted-foreground">{state.message}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Please wait while we complete the connection...
              </p>
            </div>
          )}

          {state.status === 'success' && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-700 dark:text-green-300">
                {state.message}
              </AlertTitle>
              {state.details && (
                <AlertDescription className="text-green-600 dark:text-green-400">
                  {state.details}
                </AlertDescription>
              )}
            </Alert>
          )}

          {state.status === 'error' && (
            <>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>{state.message}</AlertTitle>
                {state.details && (
                  <AlertDescription>{state.details}</AlertDescription>
                )}
              </Alert>
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={handleRetry}>
                  Try Again
                </Button>
                <Button onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </Button>
              </div>
            </>
          )}

          {state.status === 'success' && (
            <p className="text-center text-sm text-muted-foreground">
              Redirecting to integrations settings...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
