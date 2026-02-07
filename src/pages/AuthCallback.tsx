import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CallbackStatus = 'processing' | 'success' | 'error';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for error from OAuth provider
        const error = searchParams.get('error');
        if (error) {
          setStatus('error');
          setErrorMessage(searchParams.get('error_description') || error);
          return;
        }

        // Handle magic link token from OAuth proxy
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        const redirectTo = searchParams.get('redirect_to') || '/dashboard';

        if (token && type) {
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: type as 'magiclink' | 'email',
          });

          if (verifyError) {
            setStatus('error');
            setErrorMessage(verifyError.message);
            return;
          }

          if (data.session) {
            setStatus('success');
            setTimeout(() => navigate(redirectTo, { replace: true }), 800);
            return;
          }
        }

        // Handle PKCE code (fallback for standard Supabase OAuth)
        const code = searchParams.get('code');
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setStatus('error');
            setErrorMessage(exchangeError.message);
            return;
          }
          if (data.session) {
            setStatus('success');
            setTimeout(() => navigate('/dashboard', { replace: true }), 800);
            return;
          }
        }

        // No valid auth data found
        navigate('/auth', { replace: true });
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <main
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900"
      role="main"
      aria-label="Authentication callback"
    >
      <div className="text-center space-y-6 p-8" role="status" aria-live="polite">
        {status === 'processing' && (
          <>
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                <div className="relative w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Completing sign in...</h1>
              <p className="text-blue-300/70 mt-2 text-sm">Verifying your identity</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Welcome!</h1>
              <p className="text-emerald-300/70 mt-2 text-sm">Redirecting to your dashboard...</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Authentication Failed</h1>
              <p className="text-red-300/70 mt-2 text-sm max-w-sm mx-auto">
                {errorMessage || 'Something went wrong during sign in.'}
              </p>
            </div>
            <Button
              onClick={() => navigate('/auth', { replace: true })}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Back to Sign In
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
