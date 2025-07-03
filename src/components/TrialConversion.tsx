import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Zap, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface TrialConversionProps {
  trialData: {
    daysLeft: number;
    isExpired: boolean;
    subscriptionStatus?: string;
    isGracePeriod?: boolean;
    graceDaysLeft?: number;
  };
  onConversionStarted?: () => void;
}

const TrialConversion = ({ trialData, onConversionStarted }: TrialConversionProps) => {
  const [selectedTier, setSelectedTier] = useState<'starter' | 'professional' | 'enterprise'>('professional');
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const tiers = {
    starter: {
      name: 'Starter',
      monthly: 149,
      annual: 1490,
      features: ['5 Projects', 'Basic Reporting', 'Email Support', 'Mobile App']
    },
    professional: {
      name: 'Professional',
      monthly: 299,
      annual: 2990,
      features: ['25 Projects', 'Advanced Reporting', 'Priority Support', 'Team Management', 'QuickBooks Integration']
    },
    enterprise: {
      name: 'Enterprise',
      monthly: 599,
      annual: 5990,
      features: ['Unlimited Projects', 'Custom Reports', 'Dedicated Support', 'Advanced Security', 'API Access', 'White Label']
    }
  };

  const handleConvert = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get user's company ID
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('Company not found');
      }

      const { data, error } = await supabase.functions.invoke('convert-trial-to-paid', {
        body: {
          company_id: profile.company_id,
          subscription_tier: selectedTier,
          billing_period: selectedBilling
        }
      });

      if (error) throw error;

      if (data?.checkout_url) {
        // Open Stripe checkout in new tab
        window.open(data.checkout_url, '_blank');
        onConversionStarted?.();
      } else if (data?.success) {
        toast({
          title: "Conversion Successful",
          description: "Your trial has been converted to a paid subscription!",
        });
        onConversionStarted?.();
      }

    } catch (error) {
      console.error('Conversion error:', error);
      toast({
        title: "Conversion Failed",
        description: error.message || "Failed to convert trial",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedTierInfo = tiers[selectedTier];
  const price = selectedBilling === 'annual' ? selectedTierInfo.annual : selectedTierInfo.monthly;
  const monthlyPrice = selectedBilling === 'annual' ? Math.round(selectedTierInfo.annual / 12) : selectedTierInfo.monthly;
  const savings = selectedBilling === 'annual' ? selectedTierInfo.monthly * 12 - selectedTierInfo.annual : 0;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-construction-orange" />
              Convert Your Trial
            </CardTitle>
            <CardDescription>
              {trialData.isGracePeriod 
                ? `${trialData.graceDaysLeft} days left in grace period`
                : trialData.isExpired 
                ? "Trial expired - upgrade to continue"
                : `${trialData.daysLeft} days left in trial`
              }
            </CardDescription>
          </div>
          {trialData.isGracePeriod && (
            <Badge variant="outline" className="border-amber-500 text-amber-600">
              Grace Period
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Plan Selection */}
        <div className="space-y-4">
          <h3 className="font-semibold">Choose Your Plan</h3>
          <Select value={selectedTier} onValueChange={(value: any) => setSelectedTier(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a plan" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(tiers).map(([key, tier]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{tier.name}</span>
                    <span className="text-sm text-muted-foreground ml-4">
                      ${selectedBilling === 'annual' ? Math.round(tier.annual / 12) : tier.monthly}/mo
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Billing Period */}
        <div className="space-y-4">
          <h3 className="font-semibold">Billing Period</h3>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant={selectedBilling === 'monthly' ? 'default' : 'outline'}
              onClick={() => setSelectedBilling('monthly')}
              className="h-auto p-4 flex flex-col items-start space-y-1"
            >
              <span className="font-medium">Monthly</span>
              <span className="text-sm opacity-70">${selectedTierInfo.monthly}/month</span>
            </Button>
            <Button
              variant={selectedBilling === 'annual' ? 'default' : 'outline'}
              onClick={() => setSelectedBilling('annual')}
              className="h-auto p-4 flex flex-col items-start space-y-1 relative"
            >
              <span className="font-medium">Annual</span>
              <span className="text-sm opacity-70">${Math.round(selectedTierInfo.annual / 12)}/month</span>
              {savings > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-xs">
                  Save ${savings}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Selected Plan Summary */}
        <div className="border rounded-lg p-4 bg-muted/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">{selectedTierInfo.name} Plan</h3>
            <div className="text-right">
              <div className="text-2xl font-bold">${monthlyPrice}/mo</div>
              {selectedBilling === 'annual' && (
                <div className="text-sm text-muted-foreground">
                  Billed annually (${price})
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {selectedTierInfo.features.map((feature, index) => (
              <div key={index} className="flex items-center text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Convert Button */}
        <Button 
          onClick={handleConvert}
          disabled={loading}
          className="w-full bg-construction-orange hover:bg-construction-orange/90"
          size="lg"
        >
          <CreditCard className="mr-2 h-5 w-5" />
          {loading ? 'Processing...' : `Convert to ${selectedTierInfo.name} Plan`}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Your trial data will be preserved. Cancel anytime.
        </p>
      </CardContent>
    </Card>
  );
};

export default TrialConversion;