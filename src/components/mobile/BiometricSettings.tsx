import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Fingerprint, FaceIcon, Shield, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const BiometricSettings = () => {
  const [loading, setLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const {
    isAvailable,
    isEnrolled,
    biometricType,
    isSupported,
    authenticate,
    isBiometricLoginEnabled,
    setBiometricLoginEnabled,
    storeBiometricCredentials,
    clearBiometricCredentials,
  } = useBiometricAuth();
  const { user } = useAuth();

  useEffect(() => {
    checkCurrentStatus();
  }, []);

  const checkCurrentStatus = async () => {
    const enabled = await isBiometricLoginEnabled();
    setIsEnabled(enabled);
  };

  const handleToggleBiometric = async (enabled: boolean) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not Authenticated',
        description: 'You must be signed in to enable biometric authentication.',
      });
      return;
    }

    setLoading(true);

    try {
      if (enabled) {
        // Enabling biometric login
        // First, test biometric authentication
        const authResult = await authenticate(
          'Verify your identity to enable biometric login'
        );

        if (!authResult.success) {
          toast({
            variant: 'destructive',
            title: 'Authentication Failed',
            description: authResult.error || 'Could not verify your identity',
          });
          setLoading(false);
          return;
        }

        // Store credentials
        await storeBiometricCredentials(user.email || '', user.id);
        await setBiometricLoginEnabled(true);

        setIsEnabled(true);
        toast({
          title: 'Biometric Login Enabled',
          description: `You can now sign in with ${biometricType || 'biometrics'}`,
        });
      } else {
        // Disabling biometric login
        await clearBiometricCredentials();
        await setBiometricLoginEnabled(false);

        setIsEnabled(false);
        toast({
          title: 'Biometric Login Disabled',
          description: 'You will need to sign in with your password',
        });
      }
    } catch (error) {
      console.error('Error toggling biometric login:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to update biometric settings',
      });
    } finally {
      setLoading(false);
    }
  };

  const testBiometric = async () => {
    setLoading(true);
    try {
      const result = await authenticate('Test your biometric authentication');

      if (result.success) {
        toast({
          title: 'Success!',
          description: `${biometricType || 'Biometric'} authentication is working correctly`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Authentication Failed',
          description: result.error || 'Could not verify your identity',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to test biometric authentication',
      });
    } finally {
      setLoading(false);
    }
  };

  // Don't render if not on a native platform
  if (!isSupported) {
    return null;
  }

  const getIcon = () => {
    if (biometricType === 'Face ID') {
      return <FaceIcon className="h-6 w-6" />;
    } else if (biometricType === 'Fingerprint') {
      return <Fingerprint className="h-6 w-6" />;
    }
    return <Shield className="h-6 w-6" />;
  };

  const getStatusIcon = () => {
    if (isAvailable && isEnabled) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (isAvailable && !isEnabled) {
      return <XCircle className="h-5 w-5 text-gray-400" />;
    } else {
      return <AlertCircle className="h-5 w-5 text-orange-600" />;
    }
  };

  const getStatusText = () => {
    if (!isEnrolled) {
      return 'Not enrolled - Please enroll biometrics in your device settings';
    }
    if (!isAvailable) {
      return 'Not available on this device';
    }
    if (isEnabled) {
      return 'Enabled - You can sign in with biometrics';
    }
    return 'Available - Enable to sign in with biometrics';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getIcon()}
            <div>
              <CardTitle>
                {biometricType || 'Biometric'} Authentication
              </CardTitle>
              <CardDescription className="mt-1">
                Sign in quickly and securely with {biometricType?.toLowerCase() || 'biometrics'}
              </CardDescription>
            </div>
          </div>
          {getStatusIcon()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Alert */}
        {!isEnrolled && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-sm text-orange-900">
              {biometricType || 'Biometric authentication'} is not set up on this device.
              Please enroll in your device settings to use this feature.
            </AlertDescription>
          </Alert>
        )}

        {isEnrolled && !isAvailable && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-sm text-orange-900">
              Biometric hardware is available but there may be an issue. Try restarting your
              device.
            </AlertDescription>
          </Alert>
        )}

        {/* Toggle Switch */}
        <div className="flex items-center justify-between space-x-4 py-3">
          <Label htmlFor="biometric-toggle" className="flex flex-col space-y-1">
            <span className="font-medium">Enable Biometric Login</span>
            <span className="text-sm text-muted-foreground">
              {getStatusText()}
            </span>
          </Label>
          <Switch
            id="biometric-toggle"
            checked={isEnabled}
            onCheckedChange={handleToggleBiometric}
            disabled={!isAvailable || loading}
          />
        </div>

        {/* Test Button */}
        {isAvailable && isEnabled && (
          <Button
            variant="outline"
            className="w-full"
            onClick={testBiometric}
            disabled={loading}
          >
            <Shield className="h-4 w-4 mr-2" />
            Test {biometricType || 'Biometric'} Authentication
          </Button>
        )}

        {/* Security Notice */}
        <Alert className="border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-900">
            <strong>Security:</strong> Your biometric data is stored securely on your device
            and is never transmitted to our servers. This feature provides quick access while
            maintaining your account security.
          </AlertDescription>
        </Alert>

        {/* How it Works */}
        <div className="text-sm text-muted-foreground space-y-2">
          <p className="font-medium">How it works:</p>
          <ol className="list-decimal list-inside space-y-1 pl-2">
            <li>Enable biometric login in this setting</li>
            <li>Your identity is verified with {biometricType?.toLowerCase() || 'biometrics'}</li>
            <li>Your credentials are stored securely on your device</li>
            <li>Sign in quickly without typing your password</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
