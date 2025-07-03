import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier?: string;
  subscription_end?: string;
}

const SubscriptionManager = () => {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user]);

  const checkSubscription = async () => {
    setRefreshLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      
      setSubscriptionData(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
      toast({
        title: "Error",
        description: "Failed to check subscription status",
        variant: "destructive"
      });
    } finally {
      setRefreshLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open subscription management",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!subscriptionData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Loading subscription status...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Subscription Status
              {subscriptionData.subscribed && (
                <Badge className="bg-green-500 text-white">Active</Badge>
              )}
              {!subscriptionData.subscribed && (
                <Badge variant="secondary">Trial</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {subscriptionData.subscribed 
                ? `${subscriptionData.subscription_tier} plan`
                : 'Free trial period'
              }
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkSubscription}
            disabled={refreshLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {subscriptionData.subscription_end && (
            <p className="text-sm text-muted-foreground">
              Next billing date: {new Date(subscriptionData.subscription_end).toLocaleDateString()}
            </p>
          )}
          
          {subscriptionData.subscribed ? (
            <Button 
              onClick={handleManageSubscription}
              disabled={loading}
              className="w-full"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {loading ? 'Opening...' : 'Manage Subscription'}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your trial gives you access to all features. Upgrade to continue after trial ends.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionManager;