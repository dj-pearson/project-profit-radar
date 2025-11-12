import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowUp, ArrowDown, CreditCard, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionChangeProps {
  currentSubscription: {
    subscription_tier: string;
    billing_period: string;
    subscription_end: string;
  };
  onSubscriptionChanged?: () => void;
}

const SubscriptionChange = ({ currentSubscription, onSubscriptionChanged }: SubscriptionChangeProps) => {
  const [newTier, setNewTier] = useState(currentSubscription.subscription_tier);
  const [newBilling, setNewBilling] = useState(currentSubscription.billing_period);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [changePreview, setChangePreview] = useState<any>(null);
  const { toast } = useToast();

  const tiers = {
    starter: {
      name: 'Starter',
      monthly: 149,
      annual: 1490,
      features: ['5 Projects', 'Basic Reporting', 'Email Support']
    },
    professional: {
      name: 'Professional',
      monthly: 299,
      annual: 2990,
      features: ['25 Projects', 'Advanced Reporting', 'Priority Support', 'QuickBooks Integration']
    },
    enterprise: {
      name: 'Enterprise',
      monthly: 599,
      annual: 5990,
      features: ['Unlimited Projects', 'Custom Reports', 'Dedicated Support', 'API Access']
    }
  };

  const getCurrentPrice = () => {
    const tier = tiers[currentSubscription.subscription_tier as keyof typeof tiers];
    return currentSubscription.billing_period === 'annual' ? tier.annual : tier.monthly;
  };

  const getNewPrice = () => {
    const tier = tiers[newTier as keyof typeof tiers];
    return newBilling === 'annual' ? tier.annual : tier.monthly;
  };

  const isUpgrade = () => {
    const currentPrice = getCurrentPrice();
    const newPrice = getNewPrice();
    return newPrice > currentPrice;
  };

  const isDowngrade = () => {
    const currentPrice = getCurrentPrice();
    const newPrice = getNewPrice();
    return newPrice < currentPrice;
  };

  const hasChanges = () => {
    return newTier !== currentSubscription.subscription_tier || 
           newBilling !== currentSubscription.billing_period;
  };

  const calculateSavings = (tier: string) => {
    const tierInfo = tiers[tier as keyof typeof tiers];
    return (tierInfo.monthly * 12) - tierInfo.annual;
  };

  const handleChangeSubscription = async () => {
    if (!hasChanges()) {
      toast({
        title: "No Changes",
        description: "Please select a different plan or billing period.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('change-subscription', {
        body: {
          new_tier: newTier,
          new_billing_period: newBilling,
          proration_behavior: 'create_prorations'
        }
      });

      if (error) throw error;

      if (data.success) {
        const change = data.subscription_change;
        setChangePreview(change);
        
        toast({
          title: "Subscription Updated",
          description: `Successfully ${change.is_upgrade ? 'upgraded' : 'downgraded'} to ${change.new_tier} plan.`,
        });

        setIsOpen(false);
        onSubscriptionChanged?.();
      }

    } catch (error) {
      console.error('Subscription change error:', error);
      toast({
        title: "Change Failed",
        description: error.message || "Failed to change subscription",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewTier(currentSubscription.subscription_tier);
    setNewBilling(currentSubscription.billing_period);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-construction-orange" />
          Change Subscription
        </CardTitle>
        <CardDescription>
          Upgrade or downgrade your subscription plan
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Current Plan Display */}
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Current Plan</h3>
            <Badge className="bg-green-500 text-white">Active</Badge>
          </div>
          <p className="text-lg font-bold">
            {tiers[currentSubscription.subscription_tier as keyof typeof tiers]?.name} Plan
          </p>
          <p className="text-sm text-muted-foreground">
            ${currentSubscription.billing_period === 'annual' 
              ? Math.round(getCurrentPrice() / 12) 
              : getCurrentPrice()}/month
            {currentSubscription.billing_period === 'annual' && ' (billed annually)'}
          </p>
          <p className="text-xs text-muted-foreground">
            Next billing: {new Date(currentSubscription.subscription_end).toLocaleDateString()}
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="w-full bg-construction-orange hover:bg-construction-orange/90">
              Change Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Change Your Subscription</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Plan Selection */}
              <div>
                <h3 className="font-semibold mb-4">Choose Your Plan</h3>
                <div className="grid gap-4">
                  {Object.entries(tiers).map(([key, tier]) => (
                    <div 
                      key={key}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        newTier === key ? 'border-construction-orange bg-construction-orange/5' : 'border-border hover:border-construction-orange/50'
                      }`}
                      onClick={() => setNewTier(key)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{tier.name}</h4>
                        <div className="text-right">
                          <p className="font-bold">
                            ${newBilling === 'annual' ? Math.round(tier.annual / 12) : tier.monthly}/mo
                          </p>
                          {newBilling === 'annual' && (
                            <p className="text-xs text-muted-foreground">
                              ${tier.annual}/year
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {tier.features.map((feature, index) => (
                          <div key={index} className="flex items-center">
                            <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Billing Period */}
              <div>
                <h3 className="font-semibold mb-4">Billing Period</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={newBilling === 'monthly' ? 'default' : 'outline'}
                    onClick={() => setNewBilling('monthly')}
                    className="h-auto p-4 flex flex-col items-start space-y-1"
                  >
                    <span className="font-medium">Monthly</span>
                    <span className="text-sm opacity-70">
                      ${tiers[newTier as keyof typeof tiers]?.monthly}/month
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant={newBilling === 'annual' ? 'default' : 'outline'}
                    onClick={() => setNewBilling('annual')}
                    className="h-auto p-4 flex flex-col items-start space-y-1 relative"
                  >
                    <span className="font-medium">Annual</span>
                    <span className="text-sm opacity-70">
                      ${Math.round(tiers[newTier as keyof typeof tiers]?.annual / 12)}/month
                    </span>
                    <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-xs">
                      Save ${calculateSavings(newTier)}
                    </Badge>
                  </Button>
                </div>
              </div>

              {/* Change Preview */}
              {hasChanges() && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    {isUpgrade() ? (
                      <ArrowUp className="h-4 w-4 text-green-500" />
                    ) : isDowngrade() ? (
                      <ArrowDown className="h-4 w-4 text-orange-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-blue-500" />
                    )}
                    <span className="font-medium">
                      {isUpgrade() ? 'Upgrade' : isDowngrade() ? 'Downgrade' : 'Plan Change'} Preview
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Current:</span>
                      <span>
                        {tiers[currentSubscription.subscription_tier as keyof typeof tiers]?.name} 
                        ({currentSubscription.billing_period})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>New:</span>
                      <span>
                        {tiers[newTier as keyof typeof tiers]?.name} ({newBilling})
                      </span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>New Rate:</span>
                      <span>
                        ${newBilling === 'annual' 
                          ? Math.round(getNewPrice() / 12) 
                          : getNewPrice()}/month
                      </span>
                    </div>
                  </div>
                  {isUpgrade() && (
                    <p className="text-xs text-muted-foreground mt-2">
                      You'll be charged prorated amount immediately for the upgrade.
                    </p>
                  )}
                  {isDowngrade() && (
                    <p className="text-xs text-muted-foreground mt-2">
                      You'll receive prorated credit for the downgrade.
                    </p>
                  )}
                </div>
              )}

              <Button 
                onClick={handleChangeSubscription}
                disabled={loading || !hasChanges()}
                className="w-full"
              >
                {loading ? 'Processing...' : `Confirm ${isUpgrade() ? 'Upgrade' : isDowngrade() ? 'Downgrade' : 'Change'}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Recent Change Preview */}
        {changePreview && (
          <div className="mt-4 p-4 border rounded-lg bg-green-50">
            <h4 className="font-semibold text-green-700 mb-2">Recent Change</h4>
            <div className="text-sm space-y-1">
              <p>Changed from {changePreview.previous_tier} to {changePreview.new_tier}</p>
              <p>Billing: {changePreview.new_billing}</p>
              {changePreview.immediate_charge && (
                <p>Charged: ${(changePreview.proration_amount / 100).toFixed(2)}</p>
              )}
              <p>Next billing: {new Date(changePreview.next_billing_date).toLocaleDateString()}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionChange;