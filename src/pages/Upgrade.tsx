import React, { useState, useEffect } from 'react';
import { Check, Calculator, ArrowLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { usePromotions } from "@/hooks/usePromotions";

const Upgrade = () => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [trialInfo, setTrialInfo] = useState<any>(null);
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { promotions, getPromotionForPlan, calculateDiscountedPrice, getDiscountAmount } = usePromotions('upgrade');

  const plans = [
    {
      name: "Starter",
      tier: "starter" as const,
      monthlyPrice: 149,
      annualPrice: 119, // 20% discount: 149 * 12 * 0.8 / 12
      description: "Perfect for small teams (1-5 users)",
      features: [
        "Up to 5 active projects",
        "Basic job costing",
        "Mobile time tracking",
        "QuickBooks sync",
        "Email support",
        "Basic reporting"
      ],
      limitations: ["Limited integrations", "Basic compliance tools"]
    },
    {
      name: "Professional",
      tier: "professional" as const,
      monthlyPrice: 299,
      annualPrice: 239, // 20% discount: 299 * 12 * 0.8 / 12
      description: "Most popular for growing contractors (5-15 users)",
      features: [
        "Unlimited projects",
        "Advanced job costing",
        "Full mobile suite",
        "All integrations",
        "OSHA compliance tools",
        "Client portal",
        "Advanced reporting",
        "Phone support",
        "Custom workflows"
      ],
      isPopular: true
    },
    {
      name: "Enterprise",
      tier: "enterprise" as const,
      monthlyPrice: 599,
      annualPrice: 479, // 20% discount: 599 * 12 * 0.8 / 12
      description: "For established contractors (15+ users)",
      features: [
        "Everything in Professional",
        "Custom integrations",
        "Advanced automation",
        "White-label client portal",
        "Dedicated success manager",
        "24/7 priority support",
        "Advanced analytics",
        "Multi-company management"
      ]
    }
  ];

  useEffect(() => {
    // Load trial info or current subscription status
    loadTrialInfo();
  }, []);

  const loadTrialInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('trial_end_date, subscription_status, subscription_tier')
        .eq('id', userProfile?.company_id)
        .single();

      if (data) {
        setTrialInfo(data);
      }
    } catch (error) {
      console.error('Error loading trial info:', error);
    }
  };

  const getTrialDaysRemaining = () => {
    if (!trialInfo?.trial_end_date) return null;
    const trialEnd = new Date(trialInfo.trial_end_date);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const handleCheckout = async (tier: 'starter' | 'professional' | 'enterprise') => {
    try {
      setLoadingPlan(tier);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to subscribe to a plan.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
        body: {
          subscription_tier: tier,
          billing_period: billingPeriod,
          promotion_code: getPromotionForPlan(tier)?.id || null
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
        toast({
          title: "Checkout Opened",
          description: "Complete your subscription in the new tab to upgrade your account.",
        });
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Checkout Error",
        description: error instanceof Error ? error.message : "Failed to start checkout process",
        variant: "destructive"
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const trialDaysRemaining = getTrialDaysRemaining();
  const isTrialExpired = trialDaysRemaining === 0;
  const isOnTrial = trialInfo?.subscription_status === 'trial';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center h-14 sm:h-16 lg:h-18">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="mr-2 sm:mr-3 lg:mr-4 flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground truncate">
                Upgrade Your Plan
              </h1>
              {isOnTrial && (
                <p className="text-sm text-muted-foreground">
                  {isTrialExpired 
                    ? "Your trial has expired. Choose a plan to continue using BuildDesk."
                    : `${trialDaysRemaining} days remaining in your trial`
                  }
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Trial Alert */}
        {isOnTrial && (
          <Card className={`mb-8 ${isTrialExpired ? 'border-destructive bg-destructive/5' : 'border-warning bg-warning/5'}`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Zap className={`h-5 w-5 ${isTrialExpired ? 'text-destructive' : 'text-warning'}`} />
                <div>
                  <h3 className="font-semibold">
                    {isTrialExpired ? 'Trial Expired' : 'Trial Active'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isTrialExpired 
                      ? "Your free trial has ended. Upgrade now to continue accessing BuildDesk."
                      : `You have ${trialDaysRemaining} days left in your free trial. Upgrade now to unlock all features.`
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Choose Your Plan
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            All plans include unlimited users in their tier. No setup fees, no hidden costs.
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={billingPeriod === 'monthly' ? 'font-semibold' : 'text-muted-foreground'}>Monthly</span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
              className="relative w-12 h-6 bg-muted rounded-full p-1 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <div className={`w-4 h-4 bg-background rounded-full shadow-md transform transition-transform duration-200 ${billingPeriod === 'annual' ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
            <span className={billingPeriod === 'annual' ? 'font-semibold' : 'text-muted-foreground'}>Annual</span>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-primary font-semibold">
            <Calculator className="h-5 w-5" />
            {billingPeriod === 'annual' ? 'Save 20% with annual billing' : 'Switch to annual for 20% savings'}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => {
            const promotion = getPromotionForPlan(plan.tier);
            const originalPrice = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
            const discountedPrice = promotion ? calculateDiscountedPrice(originalPrice, plan.tier) : originalPrice;
            const discountAmount = promotion ? getDiscountAmount(originalPrice, plan.tier) : 0;
            
            return (
              <Card key={index} className={`relative ${plan.isPopular ? 'border-primary shadow-xl scale-105' : 'border'}`}>
                {plan.isPopular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                )}
                {promotion && (
                  <Badge className="absolute -top-3 right-4 bg-red-500 text-white">
                    {promotion.name}
                  </Badge>
                )}
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    {promotion ? (
                      <div className="space-y-1">
                        <div className="text-lg text-muted-foreground line-through">
                          ${originalPrice}
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-4xl font-bold">
                            ${discountedPrice}
                          </span>
                          <Badge variant="destructive" className="text-xs">
                            Save ${discountAmount}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <span className="text-4xl font-bold">
                        ${originalPrice}
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      /month
                    </span>
                    {billingPeriod === 'annual' && !promotion && (
                      <div className="text-sm text-primary font-medium mt-1">
                        Save ${plan.monthlyPrice - plan.annualPrice}/month
                      </div>
                    )}
                    {promotion && (
                      <div className="text-sm text-red-600 font-medium mt-1">
                        {promotion.discount_percentage}% OFF - Limited Time!
                      </div>
                    )}
                  </div>
                  <CardDescription className="text-base mt-2">{plan.description}</CardDescription>
                </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                  {plan.limitations && plan.limitations.map((limitation, limitIndex) => (
                    <div key={limitIndex} className="flex items-center gap-3 opacity-60">
                      <div className="h-4 w-4 flex-shrink-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                      </div>
                      <span className="text-sm text-muted-foreground">{limitation}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Button 
                    variant={plan.isPopular ? "default" : "outline"} 
                    className="w-full"
                    onClick={() => handleCheckout(plan.tier)}
                    disabled={loadingPlan === plan.tier}
                  >
                    {loadingPlan === plan.tier ? "Processing..." : "Choose Plan"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        </div>

        {/* Value Props */}
        <Card className="bg-muted/50">
          <CardContent className="p-8">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <h4 className="font-semibold mb-2">No Setup Fees</h4>
                <p className="text-muted-foreground text-sm">Get started immediately with no upfront costs</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Cancel Anytime</h4>
                <p className="text-muted-foreground text-sm">No long-term contracts or cancellation fees</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">30-Day Guarantee</h4>
                <p className="text-muted-foreground text-sm">Not satisfied? Get a full refund within 30 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Upgrade;