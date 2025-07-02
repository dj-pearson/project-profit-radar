import { Check, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Pricing = () => {
  const plans = [
    {
      name: "Starter",
      price: "$149",
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
      price: "$299",
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
      price: "$599",
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

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-construction-dark mb-4">
            Transparent Pricing, No Hidden Fees
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Choose the plan that fits your team size. All plans include unlimited users in their tier.
          </p>
          <div className="flex items-center justify-center gap-2 text-construction-orange font-semibold">
            <Calculator className="h-5 w-5" />
            Save 20% with annual billing
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <Card key={index} className={`relative ${plan.isPopular ? 'border-construction-orange shadow-xl scale-105' : 'border'}`}>
              {plan.isPopular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-construction-orange text-white">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl text-construction-dark">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-construction-dark">{plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
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
                <Button 
                  variant={plan.isPopular ? "hero" : "construction"} 
                  className="w-full"
                >
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>
          ))}
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
            See how much you could save in administrative costs and project overruns with BuildTrack
          </p>
          <Button variant="outline" className="text-construction-blue border-construction-blue hover:bg-construction-blue hover:text-white">
            <Calculator className="mr-2 h-4 w-4" />
            ROI Calculator
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Pricing;