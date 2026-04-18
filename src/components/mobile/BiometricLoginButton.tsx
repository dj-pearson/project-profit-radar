import { useState, useEffect } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Fingerprint, FaceIcon, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useHaptics } from '@/hooks/useHaptics';
import { cn } from '@/lib/utils';

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
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const {
    isAvailable,
    biometricType,
    isSupported,
    authenticate,
    isBiometricLoginEnabled,
    getBiometricCredentials,
  } = useBiometricAuth();
  const { user } = useAuth();
  const haptics = useHaptics();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    checkIfEnabled();
  }, []);

  const checkIfEnabled = async () => {
    const isEnabled = await isBiometricLoginEnabled();
    setEnabled(isEnabled);
  };

  const flagError = (message: string) => {
    haptics.error();
    setStatus('error');
    window.setTimeout(() => setStatus('idle'), 900);
    toast({
      variant: 'destructive',
      title: 'Authentication Failed',
      description: message,
    });
    onError?.(message);
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    setStatus('scanning');
    haptics.impact('light');

    try {
      // First authenticate with biometrics
      const authResult = await authenticate('Sign in to Brikly');

      if (!authResult.success) {
        const errorMessage = authResult.error || 'Biometric authentication failed';
        flagError(errorMessage);
        return;
      }

      // Get stored credentials
      const credentials = await getBiometricCredentials();

      if (!credentials.email || !credentials.userId) {
        flagError('Please sign in with email and password first to enable biometric login.');
        return;
      }

      // Verify the stored user still exists and session is valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        flagError('Please sign in with your email and password.');
        return;
      }

      // Verify user ID matches stored credentials
      if (session.user.id !== credentials.userId) {
        flagError('Please sign in with your email and password.');
        return;
      }

      // Success - session is valid and user authenticated with biometrics
      haptics.success();
      setStatus('success');
      toast({
        title: 'Welcome Back!',
        description: `Signed in successfully with ${biometricType}`,
      });
      window.setTimeout(() => onSuccess?.(), 450);
    } catch (error) {
      console.error('Biometric login error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to sign in with biometrics';
      flagError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const shakeVariants: Variants = {
    idle: { x: 0 },
    shake: reduceMotion
      ? { x: 0 }
      : {
          x: [0, -8, 8, -6, 6, -3, 3, 0],
          transition: { duration: 0.5 },
        },
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

      <motion.div
        variants={shakeVariants}
        animate={status === 'error' ? 'shake' : 'idle'}
        className="flex flex-col items-center gap-3"
      >
        <motion.div
          initial={false}
          animate={
            reduceMotion
              ? undefined
              : status === 'scanning'
              ? { scale: [1, 1.08, 1] }
              : status === 'success'
              ? { scale: [1, 1.2, 1] }
              : { scale: 1 }
          }
          transition={
            status === 'scanning'
              ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.35, ease: 'easeOut' }
          }
          className={cn(
            'relative flex items-center justify-center',
            'w-16 h-16 rounded-full',
            'border-2',
            status === 'success'
              ? 'border-green-500 text-green-600 bg-green-500/10'
              : status === 'error'
              ? 'border-red-500 text-red-600 bg-red-500/10'
              : status === 'scanning'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-muted-foreground/30 text-muted-foreground',
          )}
          aria-hidden="true"
        >
          {/* Scanning shimmer ring */}
          {status === 'scanning' && !reduceMotion && (
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-primary/40"
              initial={{ opacity: 0.8, scale: 1 }}
              animate={{ opacity: 0, scale: 1.4 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          {status === 'success' ? (
            <CheckCircle2 className="h-8 w-8" />
          ) : status === 'error' ? (
            <AlertCircle className="h-8 w-8" />
          ) : (
            <div className="h-8 w-8 flex items-center justify-center">
              {biometricType === 'Face ID' ? (
                <FaceIcon className="h-8 w-8" />
              ) : biometricType === 'Fingerprint' ? (
                <Fingerprint className="h-8 w-8" />
              ) : (
                <Shield className="h-8 w-8" />
              )}
            </div>
          )}
        </motion.div>

        <Button
          type="button"
          variant="outline"
          className={`w-full ${className}`}
          onClick={handleBiometricLogin}
          disabled={loading}
          aria-busy={status === 'scanning'}
        >
          {getIcon()}
          <span className="ml-2">{getButtonText()}</span>
        </Button>
      </motion.div>

      <Alert className="rounded-xl glass-thin border-blue-200/60 dark:border-blue-500/30 bg-blue-50/80 dark:bg-blue-950/20">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-900">
          Your biometric data is stored securely on your device and never leaves it.
        </AlertDescription>
      </Alert>
    </div>
  );
};
