import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useSecurity } from '@/hooks/useSecurity';
import { Shield, Smartphone, Key, Copy, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TwoFactorAuthProps {
  onClose?: () => void;
}

export const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({ onClose }) => {
  const { userSecurity, enable2FA, disable2FA, generateTOTPSecret } = useSecurity();
  const [step, setStep] = useState<'status' | 'setup' | 'verify'>('status');
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const startSetup = () => {
    const newSecret = generateTOTPSecret();
    setSecret(newSecret);
    
    // Generate QR code URL (would typically use a QR code library)
    const appName = 'Build Desk';
    const userEmail = 'user@example.com'; // Would get from auth context
    const qrUrl = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(userEmail)}?secret=${newSecret}&issuer=${encodeURIComponent(appName)}`;
    setQrCodeUrl(qrUrl);
    
    setStep('setup');
  };

  const handleEnable2FA = async () => {
    if (!verificationCode.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter the verification code from your authenticator app."
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await enable2FA(secret, verificationCode);
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error
        });
      } else {
        setStep('verify');
        // Generate backup codes (would be returned from the enable2FA function)
        const codes = Array.from({ length: 10 }, () => 
          Math.random().toString(36).substring(2, 10).toUpperCase()
        );
        setBackupCodes(codes);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to enable 2FA. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setLoading(true);
    try {
      const { error } = await disable2FA();
      if (!error) {
        setStep('status');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to disable 2FA. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard."
    });
  };

  const copyAllBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    copyToClipboard(codesText);
  };

  if (step === 'status') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Two-Factor Authentication</span>
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account with 2FA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Status</p>
              <p className="text-sm text-muted-foreground">
                2FA is currently {userSecurity?.two_factor_enabled ? 'enabled' : 'disabled'}
              </p>
            </div>
            <Badge variant={userSecurity?.two_factor_enabled ? 'default' : 'secondary'}>
              {userSecurity?.two_factor_enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          {userSecurity?.two_factor_enabled ? (
            <div className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Your account is protected with two-factor authentication.
                </AlertDescription>
              </Alert>
              <Button 
                variant="destructive" 
                onClick={handleDisable2FA}
                disabled={loading}
              >
                Disable 2FA
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Enable 2FA to add an extra layer of security to your account. You'll need an authenticator app like Google Authenticator or Authy.
                </AlertDescription>
              </Alert>
              <Button onClick={startSetup}>
                <Smartphone className="h-4 w-4 mr-2" />
                Enable 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (step === 'setup') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Set Up Two-Factor Authentication</CardTitle>
          <CardDescription>
            Scan the QR code with your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="w-48 h-48 mx-auto bg-muted rounded-lg flex items-center justify-center">
              <p className="text-sm text-muted-foreground">QR Code would appear here</p>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Scan with your authenticator app
            </p>
          </div>

          <div>
            <Label>Manual Entry Key</Label>
            <div className="flex items-center space-x-2 mt-1">
              <Input value={secret} readOnly />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(secret)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Use this key if you can't scan the QR code
            </p>
          </div>

          <div>
            <Label htmlFor="verification-code">Verification Code</Label>
            <Input
              id="verification-code"
              placeholder="Enter 6-digit code from your app"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              maxLength={6}
            />
          </div>

          <div className="flex space-x-2">
            <Button onClick={() => setStep('status')} variant="outline">
              Cancel
            </Button>
            <Button 
              onClick={handleEnable2FA} 
              disabled={!verificationCode.trim() || loading}
            >
              {loading ? 'Verifying...' : 'Enable 2FA'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'verify') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>2FA Successfully Enabled</span>
          </CardTitle>
          <CardDescription>
            Save these backup codes in a secure location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Key className="h-4 w-4" />
            <AlertDescription>
              These backup codes can be used to access your account if you lose your authenticator device. Each code can only be used once.
            </AlertDescription>
          </Alert>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Backup Codes</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={copyAllBackupCodes}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy All
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
              {backupCodes.map((code, index) => (
                <div
                  key={index}
                  className="font-mono text-sm p-2 bg-background rounded border"
                >
                  {code}
                </div>
              ))}
            </div>
          </div>

          <Button onClick={() => { setStep('status'); onClose?.(); }}>
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
};