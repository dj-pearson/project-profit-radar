import { Check, Calculator, Loader2, Shield, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePromotions } from "@/hooks/usePromotions";
import { PRICING_PLANS, getPlanPrice, getAnnualSavings, type BillingPeriod, type SubscriptionTier } from "@/config/pricing";

const Pricing = () => {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { toast } = useToast();
  const { promotions, getPromotionForPlan, calculateDiscountedPrice, getDiscountAmount } = usePromotions('homepage');

  const handleCheckout = async (tier: 'starter' | 'professional' | 'enterprise') => {
    try {
      setLoadingPlan(tier);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Store plan selection for after authentication
        localStorage.setItem('pendingCheckout', JSON.stringify({
          tier,
          billing_period: billingPeriod,
          timestamp: Date.now(),
        }));

        // Redirect to signup with plan context
        navigate(`/auth?tab=signup&plan=${tier}&period=${billingPeriod}&redirect=checkout`);

        toast({
          title: "Sign up to continue",
          description: `Create your account to start your ${tier} trial`,
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
        // Redirect to Stripe checkout in same tab for clearer flow
        window.location.href = data.url;
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
    <>
      {/* Full-page loading overlay */}
      {loadingPlan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center shadow-2xl">
            <Loader2 className="h-16 w-16 animate-spin text-construction-orange mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-construction-dark mb-2">
              Creating your checkout session...
            </h3>
            <p className="text-muted-foreground">
              You'll be redirected to our secure payment page in a moment.
            </p>
          </div>
        </div>
      )}

      <section id="pricing" className="py-20 bg-background">
        <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-construction-dark mb-4">
            Investment in Financial Intelligence, Not Just Software
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-4">
            Average customers recoup their investment in under 30 days from prevented cost overruns alone
          </p>
          <p className="text-base text-construction-orange font-semibold mb-8">
            Prevent a single $40K+ cost overrun and BuildDesk pays for itself for years
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
          {PRICING_PLANS.map((plan, index) => {
            const promotion = getPromotionForPlan(plan.tier);
            const originalPrice = getPlanPrice(plan.tier, billingPeriod);
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
                        Save ${getAnnualSavings(plan.tier)}
                      </div>
                    )}
                    {promotion && (
                      <div className="text-sm text-red-600 font-medium mt-1">
                        {promotion.discount_percentage}% OFF - Limited Time!
                      </div>
                    )}
                  </div>
                  <CardDescription className="text-base mt-2">{plan.shortDescription || plan.description}</CardDescription>
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

        {/* Trust Badges & Payment Methods */}
        <div className="flex flex-col items-center justify-center gap-6 py-8 border-y border-border">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-5 w-5 text-green-600" />
              <span className="font-medium">Secure Checkout</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-5 w-5 text-blue-600" />
              <span className="font-medium">256-bit SSL Encrypted</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-5 w-5 text-construction-orange" />
              <span className="font-medium">14-Day Free Trial</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Accepted Payment Methods</p>
            <div className="flex items-center gap-4">
              {/* Payment method placeholders - using text for now since we don't have actual logos */}
              <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 rounded border border-border">
                <span className="text-sm font-semibold text-muted-foreground">VISA</span>
                <span className="text-sm font-semibold text-muted-foreground">MasterCard</span>
                <span className="text-sm font-semibold text-muted-foreground">Amex</span>
                <span className="text-sm font-semibold text-muted-foreground">Discover</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Powered by <span className="font-semibold text-[#635BFF]">Stripe</span></p>
          </div>
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
        <div className="mt-16 bg-gradient-to-r from-construction-orange/10 to-construction-blue/10 rounded-xl p-8 sm:p-12">
          <div className="text-center">
            <h3 className="text-2xl sm:text-3xl font-bold text-construction-dark mb-4">
              What's Early Cost Detection Worth to You?
            </h3>
            <p className="text-muted-foreground mb-4 max-w-2xl mx-auto">
              If catching one $40K cost overrun 3 weeks early saves your project, BuildDesk pays for itself for the next 10 years.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6 max-w-3xl mx-auto">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-construction-orange">$40K+</div>
                <div className="text-sm text-muted-foreground">Average overrun prevented</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-construction-orange">3 Weeks</div>
                <div className="text-sm text-muted-foreground">Early warning time</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-construction-orange">4%</div>
                <div className="text-sm text-muted-foreground">Margin improvement</div>
              </div>
            </div>
            <Button size="lg" variant="hero" asChild>
              <Link to="/roi-calculator">
                <Calculator className="mr-2 h-5 w-5" />
                Calculate Your Financial Intelligence ROI
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
    </>
  );
};

export default Pricing;