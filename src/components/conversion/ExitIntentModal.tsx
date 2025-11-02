import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Gift, Calendar, Mail, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface ExitIntentModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant?: 'trial_extension' | 'demo' | 'resource' | 'discount';
}

export const ExitIntentModal = ({
  isOpen,
  onClose,
  variant = 'trial_extension'
}: ExitIntentModalProps) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const handleCapture = async () => {
    if (!email) return;

    setIsLoading(true);

    try {
      // Capture lead with exit intent context
      const urlParams = new URLSearchParams(window.location.search);

      await supabase.functions.invoke('capture-lead', {
        body: {
          email,
          interestType: variant,
          leadSource: 'exit_intent',
          landingPage: window.location.pathname,
          referrer: document.referrer,
          utm_source: urlParams.get('utm_source'),
          utm_medium: urlParams.get('utm_medium'),
          utm_campaign: urlParams.get('utm_campaign'),
        }
      });

      setIsSuccess(true);

      // Close after showing success
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setEmail('');
      }, 2000);
    } catch (error) {
      console.error('Exit intent capture error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateDemo = () => {
    onClose();
    navigate('/demo-request');
  };

  const handleNavigateSignup = () => {
    onClose();
    navigate('/auth');
  };

  const getVariantContent = () => {
    switch (variant) {
      case 'trial_extension':
        return {
          icon: <Gift className="h-16 w-16 text-construction-orange" />,
          title: "Wait! Get 21 Days Free",
          subtitle: "Extended trial, no credit card required",
          description: "Most people need a bit more time to fully explore BuildDesk. Get an extra week on us!",
          ctaText: "Claim My 21-Day Trial",
          secondaryCta: "No thanks, I'll stick with 14 days"
        };

      case 'demo':
        return {
          icon: <Calendar className="h-16 w-16 text-construction-orange" />,
          title: "Before You Go...",
          subtitle: "See BuildDesk in action with a personal demo",
          description: "Not sure if BuildDesk is right for you? Let our construction experts show you exactly how it can help your business.",
          ctaText: "Schedule Free Demo",
          secondaryCta: "Maybe later"
        };

      case 'resource':
        return {
          icon: <Mail className="h-16 w-16 text-construction-orange" />,
          title: "Free Construction Management Guide",
          subtitle: "Learn the secrets of successful contractors",
          description: "Download our comprehensive guide on managing construction projects profitably. No strings attached.",
          ctaText: "Download Free Guide",
          secondaryCta: "No thanks"
        };

      case 'discount':
        return {
          icon: <Gift className="h-16 w-16 text-construction-orange" />,
          title: "Special Offer: $100 Credit",
          subtitle: "Sign up today and get your first month discounted",
          description: "We rarely do this, but since you're interested - get $100 off when you start your paid subscription.",
          ctaText: "Claim Offer & Sign Up",
          secondaryCta: "Not interested"
        };

      default:
        return {
          icon: <Gift className="h-16 w-16 text-construction-orange" />,
          title: "Wait! Special Offer",
          subtitle: "Don't miss this opportunity",
          description: "Get started with BuildDesk today.",
          ctaText: "Get Started",
          secondaryCta: "No thanks"
        };
    }
  };

  const content = getVariantContent();

  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center space-y-4 py-8">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold">You're All Set!</h3>
            <p className="text-muted-foreground">
              Check your email for next steps.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {/* Content */}
        <div className="p-8 text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            {content.icon}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-construction-dark">
              {content.title}
            </h2>
            <p className="text-lg text-construction-orange font-semibold">
              {content.subtitle}
            </p>
          </div>

          {/* Description */}
          <p className="text-muted-foreground max-w-md mx-auto">
            {content.description}
          </p>

          {/* Email Capture (for resource/trial extension) */}
          {(variant === 'trial_extension' || variant === 'resource') && (
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-center"
                disabled={isLoading}
              />
              <Button
                onClick={handleCapture}
                disabled={!email || isLoading}
                className="w-full bg-construction-orange hover:bg-construction-orange/90"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  content.ctaText
                )}
              </Button>
            </div>
          )}

          {/* Direct Action (for demo/discount) */}
          {variant === 'demo' && (
            <Button
              onClick={handleNavigateDemo}
              className="w-full bg-construction-orange hover:bg-construction-orange/90"
              size="lg"
            >
              <Calendar className="mr-2 h-5 w-5" />
              {content.ctaText}
            </Button>
          )}

          {variant === 'discount' && (
            <Button
              onClick={handleNavigateSignup}
              className="w-full bg-construction-orange hover:bg-construction-orange/90"
              size="lg"
            >
              <Gift className="mr-2 h-5 w-5" />
              {content.ctaText}
            </Button>
          )}

          {/* Secondary CTA */}
          <button
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-construction-dark transition-colors underline"
          >
            {content.secondaryCta}
          </button>

          {/* Trust indicators */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <span>✓ No credit card required</span>
              <span>✓ Cancel anytime</span>
              <span>✓ Used by 500+ contractors</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExitIntentModal;
