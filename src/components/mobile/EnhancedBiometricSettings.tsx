/**
 * Enhanced Biometric Settings Component
 *
 * Provides comprehensive biometric authentication settings:
 * - Biometric login toggle
 * - App lock settings
 * - Device trust integration
 * - Security information
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Fingerprint,
  Scan,
  Eye,
  Shield,
  ShieldCheck,
  ShieldX,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { useBiometricLogin } from '@/hooks/useBiometricLogin';
import { mobileCardClasses, mobileTextClasses } from '@/utils/mobileHelpers';
import { Capacitor } from '@capacitor/core';

export const EnhancedBiometricSettings: React.FC = () => {
  const {
    capabilities,
    isEnabled,
    isAppLockEnabled,
    loading,
    initializing,
    authenticate,
    enableBiometricLogin,
    disableBiometricLogin,
    enableAppLock,
    disableAppLock,
    getBiometricLabel,
    refresh,
  } = useBiometricLogin();

  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);

  // Don't render if not on native platform
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  if (initializing) {
    return (
      <Card className={mobileCardClasses.container}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getIcon = () => {
    switch (capabilities?.biometricType) {
      case 'face_id':
        return <Scan className="h-6 w-6" />;
      case 'touch_id':
      case 'fingerprint':
        return <Fingerprint className="h-6 w-6" />;
      case 'iris':
        return <Eye className="h-6 w-6" />;
      default:
        return <Shield className="h-6 w-6" />;
    }
  };

  const getSecurityBadge = () => {
    switch (capabilities?.securityLevel) {
      case 'strong':
        return (
          <Badge variant="default" className="bg-success text-success-foreground">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Strong Security
          </Badge>
        );
      case 'weak':
        return (
          <Badge variant="secondary">
            <Shield className="h-3 w-3 mr-1" />
            Basic Security
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <ShieldX className="h-3 w-3 mr-1" />
            Not Available
          </Badge>
        );
    }
  };

  const handleToggleBiometric = async (enabled: boolean) => {
    if (enabled) {
      await enableBiometricLogin();
    } else {
      await disableBiometricLogin();
    }
  };

  const handleToggleAppLock = async (enabled: boolean) => {
    if (enabled) {
      await enableAppLock();
    } else {
      await disableAppLock();
    }
  };

  const handleTestBiometric = async () => {
    setTestResult(null);
    const result = await authenticate(`Test ${getBiometricLabel()}`);
    setTestResult(result.success ? 'success' : 'failed');

    // Reset after 3 seconds
    setTimeout(() => setTestResult(null), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Main Biometric Card */}
      <Card className={mobileCardClasses.container}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                capabilities?.isAvailable
                  ? 'bg-success/10 text-success'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {getIcon()}
              </div>
              <div>
                <CardTitle>{getBiometricLabel()} Authentication</CardTitle>
                <CardDescription className="mt-1">
                  {capabilities?.isAvailable
                    ? `Use ${getBiometricLabel()} for quick, secure access`
                    : 'Not available on this device'}
                </CardDescription>
              </div>
            </div>
            {getSecurityBadge()}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Enrollment Warning */}
          {capabilities?.isSupported && !capabilities?.isEnrolled && (
            <Alert className="border-warning/50 bg-warning/10">
              <AlertCircle className="h-4 w-4 text-warning" />
              <AlertDescription className={mobileTextClasses.body}>
                {getBiometricLabel()} is not set up on this device. Please enroll in your device
                settings to use this feature.
              </AlertDescription>
            </Alert>
          )}

          {/* Biometric Login Toggle */}
          <div className="flex items-center justify-between space-x-4 py-3 px-4 rounded-lg border bg-card">
            <div className="flex-1">
              <Label htmlFor="biometric-login" className="flex flex-col space-y-1">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Quick Sign In</span>
                </div>
                <span className={mobileTextClasses.muted}>
                  {isEnabled
                    ? `Sign in with ${getBiometricLabel()} without entering password`
                    : 'Enable to skip password entry on login'}
                </span>
              </Label>
            </div>
            <Switch
              id="biometric-login"
              checked={isEnabled}
              onCheckedChange={handleToggleBiometric}
              disabled={!capabilities?.isAvailable || loading}
            />
          </div>

          {/* App Lock Toggle */}
          <div className="flex items-center justify-between space-x-4 py-3 px-4 rounded-lg border bg-card">
            <div className="flex-1">
              <Label htmlFor="app-lock" className="flex flex-col space-y-1">
                <div className="flex items-center gap-2">
                  {isAppLockEnabled ? (
                    <Lock className="h-4 w-4 text-success" />
                  ) : (
                    <Unlock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">App Lock</span>
                </div>
                <span className={mobileTextClasses.muted}>
                  Lock app after 5 minutes of inactivity
                </span>
              </Label>
            </div>
            <Switch
              id="app-lock"
              checked={isAppLockEnabled}
              onCheckedChange={handleToggleAppLock}
              disabled={!capabilities?.isAvailable || loading}
            />
          </div>

          <Separator />

          {/* Test Button */}
          {capabilities?.isAvailable && (
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleTestBiometric}
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : testResult === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-success mr-2" />
                ) : testResult === 'failed' ? (
                  <ShieldX className="h-4 w-4 text-destructive mr-2" />
                ) : (
                  getIcon()
                )}
                <span className="ml-2">
                  {testResult === 'success'
                    ? 'Authentication Successful!'
                    : testResult === 'failed'
                    ? 'Authentication Failed'
                    : `Test ${getBiometricLabel()}`}
                </span>
              </Button>
            </div>
          )}

          {/* Security Information */}
          <Alert className="border-primary/50 bg-primary/5">
            <Shield className="h-4 w-4 text-primary" />
            <AlertDescription className={mobileTextClasses.body}>
              <strong>Your Privacy:</strong> Biometric data is stored securely on your device and
              never transmitted to our servers. Your credentials are encrypted and protected by your
              device's security.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* How It Works Card */}
      <Card className={mobileCardClasses.container}>
        <CardHeader>
          <CardTitle className="text-base">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                1
              </div>
              <div>
                <p className={`${mobileTextClasses.body} font-medium`}>Enable Quick Sign In</p>
                <p className={mobileTextClasses.muted}>
                  Toggle the switch above to enable {getBiometricLabel()} login
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                2
              </div>
              <div>
                <p className={`${mobileTextClasses.body} font-medium`}>Verify Your Identity</p>
                <p className={mobileTextClasses.muted}>
                  Use {getBiometricLabel()} to confirm it's really you
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                3
              </div>
              <div>
                <p className={`${mobileTextClasses.body} font-medium`}>Sign In Instantly</p>
                <p className={mobileTextClasses.muted}>
                  Next time, just use {getBiometricLabel()} to sign in
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Information */}
      <Card className={mobileCardClasses.container}>
        <CardHeader>
          <CardTitle className="text-base">Device Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2">
              <span className={mobileTextClasses.muted}>Biometric Type</span>
              <span className={mobileTextClasses.body}>{getBiometricLabel()}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center py-2">
              <span className={mobileTextClasses.muted}>Hardware Available</span>
              <span className={mobileTextClasses.body}>
                {capabilities?.isSupported ? 'Yes' : 'No'}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center py-2">
              <span className={mobileTextClasses.muted}>Enrolled</span>
              <span className={mobileTextClasses.body}>
                {capabilities?.isEnrolled ? 'Yes' : 'No'}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center py-2">
              <span className={mobileTextClasses.muted}>Security Level</span>
              <span className={mobileTextClasses.body}>
                {capabilities?.securityLevel === 'strong'
                  ? 'Strong (Class 3)'
                  : capabilities?.securityLevel === 'weak'
                  ? 'Basic (Class 2)'
                  : 'Not Available'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
