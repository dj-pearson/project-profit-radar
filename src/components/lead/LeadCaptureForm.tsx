import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LeadCaptureFormProps {
  variant?: 'inline' | 'card';
  interestType?: string;
  placeholder?: string;
  buttonText?: string;
  onSuccess?: () => void;
  className?: string;
}

export const LeadCaptureForm = ({
  variant = 'inline',
  interestType = 'newsletter',
  placeholder = 'Enter your email',
  buttonText = 'Get Started',
  onSuccess,
  className = ''
}: LeadCaptureFormProps) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Get UTM parameters
      const urlParams = new URLSearchParams(window.location.search);
      const utm_source = urlParams.get('utm_source');
      const utm_medium = urlParams.get('utm_medium');
      const utm_campaign = urlParams.get('utm_campaign');
      const utm_content = urlParams.get('utm_content');
      const utm_term = urlParams.get('utm_term');

      const { data, error: submitError } = await supabase.functions.invoke('capture-lead', {
        body: {
          email,
          interestType,
          leadSource: 'website',
          landingPage: window.location.pathname,
          referrer: document.referrer,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_content,
          utm_term
        }
      });

      if (submitError) throw submitError;

      if (data?.success) {
        setIsSuccess(true);
        setEmail('');

        if (onSuccess) {
          setTimeout(onSuccess, 2000);
        }
      }
    } catch (err) {
      console.error('Lead capture error:', err);
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Alert className="border-green-500 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Thanks! Check your email for confirmation and next steps.
        </AlertDescription>
      </Alert>
    );
  }

  if (variant === 'inline') {
    return (
      <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="email"
            placeholder={placeholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            required
            disabled={isLoading}
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-construction-orange hover:bg-construction-orange/90"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            buttonText
          )}
        </Button>
        {error && (
          <Alert className="mt-2 border-destructive">
            <AlertDescription className="text-destructive text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}
      </form>
    );
  }

  // Card variant
  return (
    <div className={`space-y-4 ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder={placeholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-construction-orange hover:bg-construction-orange/90"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            buttonText
          )}
        </Button>

        {error && (
          <Alert className="border-destructive">
            <AlertDescription className="text-destructive text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <p className="text-xs text-center text-muted-foreground">
          We respect your privacy. Unsubscribe anytime.
        </p>
      </form>
    </div>
  );
};

export default LeadCaptureForm;
