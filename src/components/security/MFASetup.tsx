import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  ShieldCheck, 
  QrCode, 
  Copy, 
  Check,
  AlertTriangle,
  Smartphone,
  Key
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface MFASetupProps {
  onMFAStatusChange?: (enabled: boolean) => void;
}

export const MFASetup: React.FC<MFASetupProps> = ({ onMFAStatusChange }) => {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [backupCodesCopied, setBackupCodesCopied] = useState(false);
  const { userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    checkMFAStatus();
  }, [userProfile]);

  const checkMFAStatus = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('user_security')
        .select('two_factor_enabled')
        .eq('user_id', userProfile.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking MFA status:', error);
        return;
      }

      setMfaEnabled(data?.two_factor_enabled || false);
      onMFAStatusChange?.(data?.two_factor_enabled || false);
    } catch (error) {
      console.error('Error checking MFA status:', error);
    }
  };

  const initiateMFASetup = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('setup-mfa', {
        body: { user_id: userProfile.id }
      });

      if (error) throw error;

      setQrCodeUrl(data.qr_code_url);
      setSecret(data.secret);
      setSetupMode(true);
      
      toast({
        title: "MFA Setup Initiated",
        description: "Scan the QR code with your authenticator app to continue."
      });
    } catch (error) {
      console.error('Error initiating MFA setup:', error);
      toast({
        variant: "destructive",
        title: "Setup Failed",
        description: "Failed to initiate MFA setup. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnableMFA = async () => {
    if (!userProfile || !verificationCode) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('verify-mfa-setup', {
        body: { 
          user_id: userProfile.id,
          verification_code: verificationCode 
        }
      });

      if (error) throw error;

      setBackupCodes(data.backup_codes);
      setMfaEnabled(true);
      setSetupMode(false);
      onMFAStatusChange?.(true);

      toast({
        title: "MFA Enabled",
        description: "Two-factor authentication has been successfully enabled for your account."
      });
    } catch (error) {
      console.error('Error verifying MFA:', error);
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: "Invalid verification code. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const disableMFA = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);

      const { error } = await supabase.functions.invoke('disable-mfa', {
        body: { user_id: userProfile.id }
      });

      if (error) throw error;

      setMfaEnabled(false);
      setSetupMode(false);
      setQrCodeUrl('');
      setSecret('');
      setVerificationCode('');
      setBackupCodes([]);
      onMFAStatusChange?.(false);

      toast({
        title: "MFA Disabled",
        description: "Two-factor authentication has been disabled for your account."
      });
    } catch (error) {
      console.error('Error disabling MFA:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to disable MFA. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'secret' | 'backup') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'secret') {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setBackupCodesCopied(true);
        setTimeout(() => setBackupCodesCopied(false), 2000);
      }
      toast({
        title: "Copied",
        description: `${type === 'secret' ? 'Secret key' : 'Backup codes'} copied to clipboard.`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Failed to copy to clipboard."
      });
    }
  };

  if (mfaEnabled && !setupMode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Your account is protected with two-factor authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-100 text-green-800">
              <Shield className="h-3 w-3 mr-1" />
              Enabled
            </Badge>
            <span className="text-sm text-muted-foreground">
              Enhanced security is active on your account
            </span>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Disabling MFA will reduce your account security. 
              Make sure you have alternative access methods configured.
            </AlertDescription>
          </Alert>

          <Button 
            variant="destructive" 
            onClick={disableMFA}
            disabled={loading}
          >
            {loading ? 'Disabling...' : 'Disable MFA'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (setupMode && backupCodes.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-500" />
            MFA Setup Complete - Save Backup Codes
          </CardTitle>
          <CardDescription>
            Store these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> These backup codes can only be displayed once. 
              Save them in a secure location before continuing.
            </AlertDescription>
          </Alert>

          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-sm">Backup Recovery Codes</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(backupCodes.join('\n'), 'backup')}
              >
                {backupCodesCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {backupCodesCopied ? 'Copied' : 'Copy All'}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {backupCodes.map((code, index) => (
                <div key={index} className="bg-white p-2 rounded border text-center">
                  {code}
                </div>
              ))}
            </div>
          </div>

          <Button 
            onClick={() => {
              setBackupCodes([]);
              toast({
                title: "MFA Setup Complete",
                description: "Two-factor authentication is now active on your account."
              });
            }}
            className="w-full"
          >
            I've Saved My Backup Codes
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (setupMode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-blue-500" />
            Setup Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Scan the QR code with your authenticator app and enter the verification code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            {qrCodeUrl && (
              <div className="flex justify-center">
                <img src={qrCodeUrl} alt="MFA QR Code" className="w-48 h-48 border rounded-lg" />
              </div>
            )}
            
            <div>
              <Label className="text-sm font-medium">Can't scan? Enter this key manually:</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={secret}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(secret, 'secret')}
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <Label htmlFor="verification-code">
                <Smartphone className="h-4 w-4 inline mr-2" />
                Enter verification code from your authenticator app
              </Label>
              <Input
                id="verification-code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="text-center font-mono text-lg tracking-widest"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSetupMode(false)}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={verifyAndEnableMFA}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1"
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-gray-500" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account by requiring a verification code from your phone
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            <Shield className="h-3 w-3 mr-1" />
            Disabled
          </Badge>
          <span className="text-sm text-muted-foreground">
            Your account is not protected by two-factor authentication
          </span>
        </div>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Recommended:</strong> Enable two-factor authentication to significantly improve your account security. 
            You'll need an authenticator app like Google Authenticator, Authy, or 1Password.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={initiateMFASetup}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
        </Button>
      </CardContent>
    </Card>
  );
};