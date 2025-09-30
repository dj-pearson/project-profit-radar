import { Check, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePromotions } from "@/hooks/usePromotions";

const Pricing = () => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { toast } = useToast();
  const { promotions, getPromotionForPlan, calculateDiscountedPrice, getDiscountAmount } = usePromotions('homepage');

  const plans = [
    {
      name: "Starter",
      tier: "starter" as const,
      monthlyPrice: 149,
      annualPrice: 1490,
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
      annualPrice: 2990,
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
      annualPrice: 5990,
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

  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-construction-dark mb-4">
            Transparent Pricing, No Hidden Fees
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Choose the plan that fits your team size. All plans include unlimited users in their tier.
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={billingPeriod === 'monthly' ? 'font-semibold' : 'text-muted-foreground'}>Monthly</span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
              className="relative w-12 h-6 bg-gray-200 rounded-full p-1 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-construction-orange focus:ring-offset-2"
              aria-label={`Switch to ${billingPeriod === 'monthly' ? 'annual' : 'monthly'} billing`}
              role="switch"
              aria-checked={billingPeriod === 'annual'}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${billingPeriod === 'annual' ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
            <span className={billingPeriod === 'annual' ? 'font-semibold' : 'text-muted-foreground'}>Annual</span>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-construction-orange font-semibold">
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
              <Card key={index} className={`relative ${plan.isPopular ? 'border-construction-orange shadow-xl scale-105' : 'border'}`}>
                {plan.isPopular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-construction-orange text-white">
                    Most Popular
                  </Badge>
                )}
                {promotion && (
                  <Badge className="absolute -top-3 right-4 bg-red-500 text-white">
                    {promotion.name}
                  </Badge>
                )}
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl text-construction-dark">{plan.name}</CardTitle>
                  <div className="mt-4">
                    {promotion ? (
                      <div className="space-y-1">
                        <div className="text-lg text-muted-foreground line-through">
                          ${originalPrice}
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-4xl font-bold text-construction-dark">
                            ${discountedPrice}
                          </span>
                          <Badge variant="destructive" className="text-xs">
                            Save ${discountAmount}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <span className="text-4xl font-bold text-construction-dark">
                        ${originalPrice}
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      /{billingPeriod === 'monthly' ? 'month' : 'year'}
                    </span>
                    {billingPeriod === 'annual' && !promotion && (
                      <div className="text-sm text-construction-orange font-medium mt-1">
                        Save ${(plan.monthlyPrice * 12) - plan.annualPrice}
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
                      <Check className="h-4 w-4 text-construction-orange flex-shrink-0" />
                      <span className="text-sm text-construction-dark">{feature}</span>
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
                    variant={plan.isPopular ? "hero" : "construction"} 
                    className="w-full"
                    onClick={() => handleCheckout(plan.tier)}
                    disabled={loadingPlan === plan.tier}
                  >
                    {loadingPlan === plan.tier ? "Processing..." : "Start Free Trial"}
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full text-construction-blue border-construction-blue hover:bg-construction-blue hover:text-white"
                    onClick={() => handleCheckout(plan.tier)}
                    disabled={loadingPlan === plan.tier}
                  >
                    {loadingPlan === plan.tier ? "Processing..." : "Get Started Now"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        </div>

        {/* Value Props */}
        <div className="bg-secondary/50 rounded-xl p-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <h4 className="font-semibold text-construction-dark mb-2">No Setup Fees</h4>
              <p className="text-muted-foreground text-sm">Get started immediately with no upfront costs</p>
            </div>
            <div>
              <h4 className="font-semibold text-construction-dark mb-2">Cancel Anytime</h4>
              <p className="text-muted-foreground text-sm">No long-term contracts or cancellation fees</p>
            </div>
            <div>
              <h4 className="font-semibold text-construction-dark mb-2">30-Day Guarantee</h4>
              <p className="text-muted-foreground text-sm">Not satisfied? Get a full refund within 30 days</p>
            </div>
          </div>
        </div>

        {/* ROI Calculator CTA */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-construction-dark mb-4">
            Calculate Your Potential Savings
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            See how much you could save in administrative costs and project overruns with Build Desk
          </p>
          <Button variant="outline" className="text-construction-blue border-construction-blue hover:bg-construction-blue hover:text-white" asChild>
            <Link to="/roi-calculator">
              <Calculator className="mr-2 h-4 w-4" />
              ROI Calculator
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Pricing;