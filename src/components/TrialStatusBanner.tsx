import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CreditCard, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const TrialStatusBanner = () => {
  const [trialData, setTrialData] = useState<{
    daysLeft: number;
    isExpired: boolean;
    subscriptionStatus?: string;
    isGracePeriod?: boolean;
    graceDaysLeft?: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      checkTrialStatus();
    }
  }, [user]);

  const checkTrialStatus = async () => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (profile?.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('trial_end_date, subscription_status, subscription_tier')
          .eq('id', profile.company_id)
          .single();

        if (company && company.trial_end_date) {
          const trialEnd = new Date(company.trial_end_date);
          const today = new Date();
          const daysLeft = Math.ceil((trialEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          // Calculate grace period if applicable
          const isGracePeriod = company.subscription_status === 'grace_period';
          let graceDaysLeft = 0;
          if (isGracePeriod) {
            const gracePeriodEnd = new Date(trialEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
            graceDaysLeft = Math.ceil((gracePeriodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            graceDaysLeft = Math.max(0, graceDaysLeft);
          }
          
          setTrialData({
            daysLeft: Math.max(0, daysLeft),
            isExpired: daysLeft <= 0,
            subscriptionStatus: company.subscription_status,
            isGracePeriod,
            graceDaysLeft
          });
        }
      }
    } catch (error) {
      console.error('Error checking trial status:', error);
    }
  };

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
        body: {
          subscription_tier: 'professional',
          billing_period: 'monthly'
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Checkout Error",
        description: "Failed to start checkout process",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!trialData || trialData.subscriptionStatus === 'active') {
    return null;
  }

  const { daysLeft, isExpired, isGracePeriod, graceDaysLeft, subscriptionStatus } = trialData;

  // Show suspended status
  if (subscriptionStatus === 'suspended') {
    return (
      <Card className="border-destructive bg-destructive/10 mb-6">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <h3 className="font-semibold text-destructive">Account Suspended</h3>
              <p className="text-sm text-muted-foreground">
                Your trial and grace period have expired. Upgrade to reactivate your account.
              </p>
            </div>
          </div>
          <Button 
            onClick={handleUpgrade}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {loading ? 'Processing...' : 'Reactivate Account'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show grace period status
  if (isGracePeriod) {
    return (
      <Card className="border-amber-500 bg-amber-50 mb-6">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-amber-600" />
            <div>
              <h3 className="font-semibold text-amber-700">Grace Period Active</h3>
              <p className="text-sm text-amber-600">
                {graceDaysLeft} day{graceDaysLeft !== 1 ? 's' : ''} left in your grace period. 
                Limited features available.
              </p>
            </div>
          </div>
          <Button 
            onClick={handleUpgrade}
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {loading ? 'Processing...' : 'Upgrade Now'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show expired trial (before grace period)
  if (isExpired) {
    return (
      <Card className="border-destructive bg-destructive/5 mb-6">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <h3 className="font-semibold text-destructive">Trial Expired</h3>
              <p className="text-sm text-muted-foreground">
                Your trial has ended. Upgrade now to continue using all features.
              </p>
            </div>
          </div>
          <Button 
            onClick={handleUpgrade}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {loading ? 'Processing...' : 'Upgrade Now'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (daysLeft <= 7) {
    return (
      <Card className="border-construction-orange bg-construction-orange/5 mb-6">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-construction-orange" />
            <div>
              <h3 className="font-semibold text-construction-orange">
                Trial Ending Soon
              </h3>
              <p className="text-sm text-muted-foreground">
                {daysLeft} day{daysLeft !== 1 ? 's' : ''} left in your free trial
              </p>
            </div>
          </div>
          <Button 
            onClick={handleUpgrade}
            disabled={loading}
            variant="construction"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {loading ? 'Processing...' : 'Upgrade Now'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default TrialStatusBanner;