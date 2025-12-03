import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Shield,
  Smartphone,
  Key,
  CheckCircle,
  Copy,
  Loader2,
  AlertCircle,
  Download,
  RefreshCw,
} from 'lucide-react';

type SetupStep = 'intro' | 'qrcode' | 'verify' | 'backup' | 'complete';

interface TOTPSetupScreenProps {
  onComplete?: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
}

export const TOTPSetupScreen: React.FC<TOTPSetupScreenProps> = ({
  onComplete,
  onSkip,
  showSkip = true,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState<SetupStep>('intro');
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input when on verify step
  useEffect(() => {
    if (step === 'verify' && inputRefs.current[0]) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  const handleStartSetup = async () => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to set up MFA',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-mfa`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            user_id: user.id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to initialize MFA setup');
      }

      setQrCodeUrl(result.qr_code_url);
      setSecret(result.secret);
      setStep('qrcode');
    } catch (err) {
      console.error('MFA setup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start MFA setup');
      toast({
        title: 'Error',
        description: 'Failed to initialize MFA setup. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    setError(null);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        if (digits.length > 0) {
          const newCode = [...verificationCode];
          digits.forEach((digit, i) => {
            if (i < 6) newCode[i] = digit;
          });
          setVerificationCode(newCode);
          if (digits.length === 6) {
            handleVerify(newCode.join(''));
          } else {
            inputRefs.current[digits.length]?.focus();
          }
        }
      });
    }
  };

  const handleVerify = async (code?: string) => {
    const codeToVerify = code || verificationCode.join('');

    if (codeToVerify.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    if (!user?.id) {
      setError('You must be logged in');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-mfa-setup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            user_id: user.id,
            verification_code: codeToVerify,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Invalid verification code');
      }

      setBackupCodes(result.backup_codes || []);
      setStep('backup');

      toast({
        title: 'Code Verified',
        description: 'Your authenticator app is now linked. Save your backup codes!',
      });
    } catch (err) {
      console.error('MFA verify error:', err);
      setError(err instanceof Error ? err.message : 'Verification failed');
      setVerificationCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
      toast({
        title: 'Copied',
        description: 'Secret key copied to clipboard',
      });
    }
  };

  const handleCopyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    setCopiedBackupCodes(true);
    setTimeout(() => setCopiedBackupCodes(false), 2000);
    toast({
      title: 'Copied',
      description: 'Backup codes copied to clipboard',
    });
  };

  const handleDownloadBackupCodes = () => {
    const codesText = `BuildDesk Backup Codes\n${'='.repeat(30)}\n\nSave these codes in a safe place. Each code can only be used once.\n\n${backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}\n\nGenerated: ${new Date().toISOString()}`;
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'builddesk-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Downloaded',
      description: 'Backup codes saved to file',
    });
  };

  const handleComplete = () => {
    setStep('complete');
    setTimeout(() => {
      onComplete?.();
    }, 2000);
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-construction-orange/10 flex items-center justify-center">
            <Shield className="w-8 h-8 text-construction-orange" />
          </div>
        </div>
        <CardTitle>
          {step === 'intro' && 'Set Up Two-Factor Authentication'}
          {step === 'qrcode' && 'Scan QR Code'}
          {step === 'verify' && 'Verify Your Setup'}
          {step === 'backup' && 'Save Your Backup Codes'}
          {step === 'complete' && 'Setup Complete!'}
        </CardTitle>
        <CardDescription>
          {step === 'intro' && 'Add an extra layer of security to your account'}
          {step === 'qrcode' && 'Use your authenticator app to scan this code'}
          {step === 'verify' && 'Enter the 6-digit code from your authenticator app'}
          {step === 'backup' && 'Store these codes safely. You\'ll need them if you lose access to your authenticator.'}
          {step === 'complete' && 'Two-factor authentication is now enabled'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: Introduction */}
        {step === 'intro' && (
          <>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted">
                <Smartphone className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Use an authenticator app</p>
                  <p className="text-sm text-muted-foreground">
                    Download Google Authenticator, Authy, or 1Password on your phone
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted">
                <Key className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Get backup codes</p>
                  <p className="text-sm text-muted-foreground">
                    We'll give you backup codes in case you lose your phone
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleStartSetup} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  'Get Started'
                )}
              </Button>
              {showSkip && (
                <Button variant="ghost" onClick={onSkip} className="w-full">
                  Skip for now
                </Button>
              )}
            </div>
          </>
        )}

        {/* Step 2: QR Code */}
        {step === 'qrcode' && (
          <>
            <div className="flex justify-center">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="QR Code for authenticator app"
                  className="w-48 h-48 rounded-lg border"
                />
              ) : (
                <div className="w-48 h-48 rounded-lg border flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            {secret && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Can't scan? Enter this code manually:
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                    {secret}
                  </code>
                  <Button size="icon" variant="outline" onClick={handleCopySecret}>
                    {copiedSecret ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            <Button onClick={() => setStep('verify')} className="w-full">
              I've scanned the code
            </Button>
          </>
        )}

        {/* Step 3: Verification */}
        {step === 'verify' && (
          <>
            <div className="flex justify-center gap-2">
              {verificationCode.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-mono"
                  disabled={isLoading}
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            {error && (
              <div className="flex items-center justify-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('qrcode')}
                className="flex-1"
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                onClick={() => handleVerify()}
                className="flex-1"
                disabled={isLoading || verificationCode.some((d) => !d)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </Button>
            </div>
          </>
        )}

        {/* Step 4: Backup Codes */}
        {step === 'backup' && (
          <>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Important</p>
                  <p className="text-sm text-yellow-700">
                    Save these backup codes in a secure place. Each code can only be used once.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
              {backupCodes.map((code, index) => (
                <div key={index} className="p-2 bg-background rounded">
                  {code}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopyBackupCodes} className="flex-1">
                {copiedBackupCodes ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleDownloadBackupCodes} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>

            <Button onClick={handleComplete} className="w-full">
              I've saved my backup codes
            </Button>
          </>
        )}

        {/* Step 5: Complete */}
        {step === 'complete' && (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <div>
              <Badge variant="default" className="bg-green-600">
                <Shield className="w-3 h-3 mr-1" />
                MFA Enabled
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Your account is now protected with two-factor authentication.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TOTPSetupScreen;
