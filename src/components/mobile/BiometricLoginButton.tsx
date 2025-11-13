import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Fingerprint, FaceIcon, Shield, AlertCircle } from 'lucide-react';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BiometricLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export const BiometricLoginButton = ({
  onSuccess,
  onError,
  className = '',
}: BiometricLoginButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const {
    isAvailable,
    biometricType,
    isSupported,
    authenticate,
    isBiometricLoginEnabled,
    getBiometricCredentials,
  } = useBiometricAuth();
  const { user } = useAuth();

  useEffect(() => {
    checkIfEnabled();
  }, []);

  const checkIfEnabled = async () => {
    const isEnabled = await isBiometricLoginEnabled();
    setEnabled(isEnabled);
  };

  const handleBiometricLogin = async () => {
    setLoading(true);

    try {
      // First authenticate with biometrics
      const authResult = await authenticate('Sign in to BuildDesk');

      if (!authResult.success) {
        const errorMessage = authResult.error || 'Biometric authentication failed';
        toast({
          variant: 'destructive',
          title: 'Authentication Failed',
          description: errorMessage,
        });
        onError?.(errorMessage);
        return;
      }

      // Get stored credentials
      const credentials = await getBiometricCredentials();

      if (!credentials.email || !credentials.userId) {
        toast({
          variant: 'destructive',
          title: 'No Credentials Found',
          description: 'Please sign in with email and password first to enable biometric login.',
        });
        onError?.('No credentials stored');
        return;
      }

      // Verify the stored user still exists and session is valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        // No active session, user needs to sign in again
        toast({
          variant: 'destructive',
          title: 'Session Expired',
          description: 'Please sign in with your email and password.',
        });
        onError?.('Session expired');
        return;
      }

      // Verify user ID matches stored credentials
      if (session.user.id !== credentials.userId) {
        toast({
          variant: 'destructive',
          title: 'User Mismatch',
          description: 'Please sign in with your email and password.',
        });
        onError?.('User mismatch');
        return;
      }

      // Success - session is valid and user authenticated with biometrics
      toast({
        title: 'Welcome Back!',
        description: `Signed in successfully with ${biometricType}`,
      });
      onSuccess?.();
    } catch (error) {
      console.error('Biometric login error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to sign in with biometrics';
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: errorMessage,
      });
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Don't render if biometrics not supported
  if (!isSupported) {
    return null;
  }

  // Don't render if biometrics not available or not enabled
  if (!isAvailable || !enabled) {
    return null;
  }

  const getIcon = () => {
    if (biometricType === 'Face ID') {
      return <FaceIcon className="h-5 w-5" />;
    } else if (biometricType === 'Fingerprint') {
      return <Fingerprint className="h-5 w-5" />;
    }
    return <Shield className="h-5 w-5" />;
  };

  const getButtonText = () => {
    if (loading) return 'Authenticating...';
    if (biometricType) return `Sign in with ${biometricType}`;
    return 'Sign in with Biometrics';
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className={`w-full ${className}`}
        onClick={handleBiometricLogin}
        disabled={loading}
      >
        {getIcon()}
        <span className="ml-2">{getButtonText()}</span>
      </Button>

      <Alert className="border-blue-200 bg-blue-50">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-900">
          Your biometric data is stored securely on your device and never leaves it.
        </AlertDescription>
      </Alert>
    </div>
  );
};
