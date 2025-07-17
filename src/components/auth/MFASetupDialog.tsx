import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, Smartphone, Key, Copy, CheckCircle, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSecurity } from '@/hooks/useSecurity';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MFASetupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isRequired?: boolean; // If company requires MFA
}

export const MFASetupDialog: React.FC<MFASetupDialogProps> = ({ 
  isOpen, 
  onClose, 
  isRequired = false 
}) => {
  const { user, userProfile } = useAuth();
  const { userSecurity, enable2FA, generateTOTPSecret } = useSecurity();
  const [step, setStep] = useState<'intro' | 'setup' | 'verify' | 'success'>('intro');
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyRequiresMFA, setCompanyRequiresMFA] = useState(false);

  // Check if company requires MFA
  useEffect(() => {
    const checkCompanyMFAPolicy = async () => {
      if (!userProfile?.company_id) return;
      
      try {
        const { data, error } = await supabase
          .from('company_admin_settings')
          .select('security_policies')
          .eq('company_id', userProfile.company_id)
          .single();
        
        if (data?.security_policies && typeof data.security_policies === 'object') {
          const securityPolicies = data.security_policies as { require_2fa?: boolean };
          if (securityPolicies.require_2fa) {
            setCompanyRequiresMFA(true);
          }
        }
      } catch (error) {
        console.error('Error checking company MFA policy:', error);
      }
    };

    checkCompanyMFAPolicy();
  }, [userProfile?.company_id]);

  const startSetup = () => {
    const newSecret = generateTOTPSecret();
    setSecret(newSecret);
    
    // Generate QR code URL for authenticator apps
    const appName = 'Build Desk';
    const userEmail = user?.email || 'user@example.com';
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
        // Generate backup codes (in a real implementation, these would come from the server)
        const codes = Array.from({ length: 10 }, () => 
          Math.random().toString(36).substring(2, 10).toUpperCase()
        );
        setBackupCodes(codes);
        setStep('success');
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

  const handleSkip = () => {
    if (companyRequiresMFA || isRequired) {
      toast({
        variant: "destructive",
        title: "2FA Required",
        description: "Your company requires two-factor authentication to be enabled."
      });
      return;
    }
    onClose();
  };

  const handleComplete = () => {
    toast({
      title: "2FA Enabled",
      description: "Two-factor authentication has been successfully enabled for your account."
    });
    onClose();
  };

  if (step === 'intro') {
    return (
      <Dialog open={isOpen} onOpenChange={!isRequired && !companyRequiresMFA ? onClose : undefined}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Secure Your Account</span>
              </DialogTitle>
              {!isRequired && !companyRequiresMFA && (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <DialogDescription>
              {companyRequiresMFA || isRequired 
                ? "Your company requires two-factor authentication for all accounts."
                : "Protect your account with an extra layer of security."
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {(companyRequiresMFA || isRequired) && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Required:</strong> Two-factor authentication is mandatory for your account.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <h4 className="font-medium">What is Two-Factor Authentication?</h4>
              <p className="text-sm text-muted-foreground">
                2FA adds an extra layer of security by requiring a code from your phone in addition to your password.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">You'll need:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• An authenticator app (Google Authenticator, Authy, etc.)</li>
                <li>• Your smartphone or tablet</li>
                <li>• A few minutes to set it up</li>
              </ul>
            </div>
            
            <div className="flex space-x-2 pt-4">
              {!isRequired && !companyRequiresMFA && (
                <Button variant="outline" onClick={handleSkip}>
                  Skip for Now
                </Button>
              )}
              <Button onClick={startSetup} className="flex-1">
                <Smartphone className="h-4 w-4 mr-2" />
                Set Up 2FA
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (step === 'setup') {
    return (
      <Dialog open={isOpen} onOpenChange={!isRequired && !companyRequiresMFA ? onClose : undefined}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
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
                <Input value={secret} readOnly className="font-mono text-xs" />
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
                className="text-center text-lg tracking-widest"
              />
            </div>

            <div className="flex space-x-2">
              <Button 
                onClick={() => setStep('intro')} 
                variant="outline"
                disabled={loading}
              >
                Back
              </Button>
              <Button 
                onClick={handleEnable2FA} 
                disabled={!verificationCode.trim() || loading}
                className="flex-1"
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (step === 'success') {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>2FA Successfully Enabled</span>
            </DialogTitle>
            <DialogDescription>
              Save these backup codes in a secure location
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
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

            <Button onClick={handleComplete} className="w-full">
              Continue to Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
};