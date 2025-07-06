import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Settings, AlertTriangle, CheckCircle, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import SubscriptionChange from './SubscriptionChange';
import PaymentFailureAlert from './PaymentFailureAlert';

interface SubscriptionData {
  subscription_tier: string;
  billing_period: string;
  subscription_end: string;
  subscribed: boolean;
  stripe_customer_id: string;
  is_complimentary?: boolean;
  complimentary_type?: string;
}

const SubscriptionManager = () => {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSubscriptionData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setSubscriptionData(data);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshSubscriptionStatus = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;

      await fetchSubscriptionData();
      
      toast({
        title: "Status Refreshed",
        description: "Subscription status has been updated",
      });
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to refresh subscription status",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open customer portal",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-construction-orange mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading subscription...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSubscriptionStatus = () => {
    if (!subscriptionData?.subscribed) {
      return {
        status: 'inactive',
        badge: <Badge variant="outline" className="border-red-500 text-red-700">Inactive</Badge>,
        description: 'No active subscription'
      };
    }

    // Handle complimentary subscriptions
    if (subscriptionData.is_complimentary) {
      const complimentaryType = subscriptionData.complimentary_type;
      
      if (complimentaryType === 'permanent' || complimentaryType === 'root_admin') {
        return {
          status: 'complimentary',
          badge: <Badge className="bg-green-500 text-white">Complimentary</Badge>,
          description: complimentaryType === 'root_admin' ? 'Root Admin Access' : 'Permanent Complimentary'
        };
      }
      
      // Temporary complimentary
      if (subscriptionData.subscription_end) {
        const endDate = new Date(subscriptionData.subscription_end);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          status: 'complimentary',
          badge: <Badge className="bg-blue-500 text-white">Complimentary</Badge>,
          description: `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`
        };
      }
    }

    const endDate = new Date(subscriptionData.subscription_end);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
      return {
        status: 'expiring',
        badge: <Badge variant="outline" className="border-orange-500 text-orange-700">Expiring Soon</Badge>,
        description: `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`
      };
    }

    return {
      status: 'active',
      badge: <Badge className="bg-green-500 text-white">Active</Badge>,
      description: `Next billing: ${endDate.toLocaleDateString()}`
    };
  };

  const getTierDisplayName = (tier: string) => {
    const tierNames = {
      starter: 'Starter',
      professional: 'Professional',
      enterprise: 'Enterprise'
    };
    return tierNames[tier as keyof typeof tierNames] || tier;
  };

  const getBillingAmount = () => {
    const pricing = {
      starter: { monthly: 149, annual: 1490 },
      professional: { monthly: 299, annual: 2990 },
      enterprise: { monthly: 599, annual: 5990 }
    };

    if (!subscriptionData?.subscription_tier) return 0;
    
    const tier = subscriptionData.subscription_tier as keyof typeof pricing;
    const period = subscriptionData.billing_period === 'annual' ? 'annual' : 'monthly';
    
    return pricing[tier]?.[period] || 0;
  };

  const statusInfo = getSubscriptionStatus();

  return (
    <div className="space-y-6">
      {/* Payment Failure Alerts */}
      <PaymentFailureAlert />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-construction-orange" />
                Subscription Management
              </CardTitle>
              <CardDescription>Manage your subscription plan and billing</CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={refreshSubscriptionStatus}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              {refreshing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-construction-orange"></div>
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Refresh Status
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="change-plan">Change Plan</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Current Plan Overview */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold">
                          {subscriptionData?.subscription_tier 
                            ? getTierDisplayName(subscriptionData.subscription_tier)
                            : 'No Plan'
                          }
                        </span>
                        {statusInfo.badge}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {statusInfo.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Billing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-construction-orange" />
                        <span className="text-lg font-bold">
                          ${subscriptionData?.billing_period === 'annual' 
                            ? Math.round(getBillingAmount() / 12) 
                            : getBillingAmount()}/month
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {subscriptionData?.billing_period === 'annual' && 'Billed annually'}
                        {subscriptionData?.billing_period === 'monthly' && 'Billed monthly'}
                        {!subscriptionData?.billing_period && 'No active billing'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Next Action</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Calendar className="h-4 w-4 text-construction-orange" />
                      <p className="text-sm text-muted-foreground">
                        {subscriptionData?.subscription_end 
                          ? `Renewal: ${new Date(subscriptionData.subscription_end).toLocaleDateString()}`
                          : 'Subscribe to get started'
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Status Alerts */}
              {statusInfo.status === 'expiring' && (
                <Alert className="border-orange-500 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    Your subscription is expiring soon. Renew now to avoid service interruption.
                  </AlertDescription>
                </Alert>
              )}

              {statusInfo.status === 'inactive' && (
                <Alert className="border-red-500 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    You don't have an active subscription. Subscribe now to access all features.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="change-plan">
              {subscriptionData?.subscribed ? (
                <SubscriptionChange 
                  currentSubscription={{
                    subscription_tier: subscriptionData.subscription_tier,
                    billing_period: subscriptionData.billing_period,
                    subscription_end: subscriptionData.subscription_end
                  }}
                  onSubscriptionChanged={fetchSubscriptionData}
                />
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
                    <p className="text-muted-foreground mb-4">
                      You need an active subscription to change plans.
                    </p>
                    <Button className="bg-construction-orange hover:bg-construction-orange/90">
                      Subscribe Now
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="billing">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Billing Management
                  </CardTitle>
                  <CardDescription>
                    Manage your payment methods, view invoices, and update billing information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <h4 className="font-medium">Current Billing Method</h4>
                        <p className="text-sm text-muted-foreground">
                          {subscriptionData?.stripe_customer_id 
                            ? 'Managed through Stripe'
                            : 'No payment method on file'
                          }
                        </p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium">Billing Frequency</h4>
                        <p className="text-sm text-muted-foreground">
                          {subscriptionData?.billing_period || 'Not applicable'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <Button 
                        onClick={openCustomerPortal}
                        className="w-full sm:w-auto"
                        disabled={!subscriptionData?.stripe_customer_id}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Manage Billing & Payment Methods
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        You'll be redirected to our secure billing portal to manage your payment methods, 
                        view invoices, and update billing information.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionManager;