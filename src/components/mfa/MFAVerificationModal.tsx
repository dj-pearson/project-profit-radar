import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Key, Loader2, Smartphone, AlertCircle } from 'lucide-react';

interface MFAVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  userEmail?: string;
}

export const MFAVerificationModal: React.FC<MFAVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userId,
  userEmail,
}) => {
  const { toast } = useToast();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [showBackupCodeInput, setShowBackupCodeInput] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on open
  useEffect(() => {
    if (isOpen && inputRefs.current[0]) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCode(['', '', '', '', '', '']);
      setBackupCode('');
      setError(null);
      setShowBackupCodeInput(false);
      setTrustDevice(false);
    }
  }, [isOpen]);

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (value && index === 5 && newCode.every((d) => d !== '')) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        if (digits.length > 0) {
          const newCode = [...code];
          digits.forEach((digit, i) => {
            if (i < 6) newCode[i] = digit;
          });
          setCode(newCode);
          if (digits.length === 6) {
            handleVerify(newCode.join(''));
          } else {
            inputRefs.current[digits.length]?.focus();
          }
        }
      });
    }
  };

  const handleVerify = async (verificationCode: string) => {
    if (verificationCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-mfa-login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            action: 'verify',
            userId,
            code: verificationCode,
            trustDevice,
            deviceInfo: {
              deviceId: getDeviceId(),
              deviceName: navigator.userAgent,
              deviceType: 'web',
              userAgent: navigator.userAgent,
            },
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || 'Invalid verification code');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        return;
      }

      toast({
        title: 'Verified',
        description: 'Two-factor authentication successful',
      });

      onSuccess();
    } catch (err) {
      console.error('MFA verification error:', err);
      setError('Verification failed. Please try again.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBackupCodeVerify = async () => {
    if (!backupCode.trim()) {
      setError('Please enter a backup code');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-mfa-login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            action: 'verify_backup',
            userId,
            code: backupCode.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || 'Invalid backup code');
        return;
      }

      toast({
        title: 'Verified',
        description: `Backup code accepted. ${result.remainingCodes} codes remaining.`,
      });

      onSuccess();
    } catch (err) {
      console.error('Backup code verification error:', err);
      setError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Generate or get device ID
  const getDeviceId = (): string => {
    let deviceId = localStorage.getItem('bd_device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('bd_device_id', deviceId);
    }
    return deviceId;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-construction-orange" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            {showBackupCodeInput
              ? 'Enter one of your backup codes to verify your identity.'
              : 'Enter the 6-digit code from your authenticator app.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!showBackupCodeInput ? (
            <>
              {/* TOTP Code Input */}
              <div className="flex items-center justify-center">
                <Smartphone className="w-16 h-16 text-muted-foreground" />
              </div>

              <div className="flex justify-center gap-2">
                {code.map((digit, index) => (
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
                    disabled={isVerifying}
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center justify-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* Trust Device Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="trustDevice"
                  checked={trustDevice}
                  onCheckedChange={(checked) => setTrustDevice(checked === true)}
                />
                <Label htmlFor="trustDevice" className="text-sm text-muted-foreground">
                  Trust this device for 90 days
                </Label>
              </div>

              {/* Verify Button */}
              <Button
                className="w-full"
                onClick={() => handleVerify(code.join(''))}
                disabled={isVerifying || code.some((d) => !d)}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Verify
                  </>
                )}
              </Button>

              {/* Backup Code Link */}
              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                  onClick={() => setShowBackupCodeInput(true)}
                >
                  Use a backup code instead
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Backup Code Input */}
              <div className="flex items-center justify-center">
                <Key className="w-16 h-16 text-muted-foreground" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="backupCode">Backup Code</Label>
                <Input
                  id="backupCode"
                  type="text"
                  placeholder="XXXXXXXX"
                  value={backupCode}
                  onChange={(e) => {
                    setBackupCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  className="text-center font-mono text-lg tracking-wider"
                  disabled={isVerifying}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center justify-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* Verify Button */}
              <Button
                className="w-full"
                onClick={handleBackupCodeVerify}
                disabled={isVerifying || !backupCode.trim()}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    Verify Backup Code
                  </>
                )}
              </Button>

              {/* Back to TOTP Link */}
              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                  onClick={() => {
                    setShowBackupCodeInput(false);
                    setBackupCode('');
                    setError(null);
                  }}
                >
                  Use authenticator app instead
                </button>
              </div>
            </>
          )}

          {/* Help Text */}
          <p className="text-xs text-center text-muted-foreground">
            Having trouble?{' '}
            <a href="/support" className="underline hover:text-foreground">
              Contact support
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MFAVerificationModal;
