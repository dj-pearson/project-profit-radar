import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  AlertTriangle,
  Brain,
  Zap,
  LineChart,
  Target,
  Clock,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const FinancialIntelligenceShowcase = () => {
  const intelligenceFeatures = [
    {
      icon: Brain,
      title: "Predictive Cost Intelligence",
      description: "Know problems weeks before they happen",
      details: "AI analyzes your historical data to predict cost overruns 2-3 weeks before they impact your bottom line. 80%+ accuracy.",
      stat: "3 weeks",
      statLabel: "Early Warning",
      gradient: "from-purple-500 to-purple-700"
    },
    {
      icon: TrendingUp,
      title: "Real-Time Profitability",
      description: "Live margin tracking on every project",
      details: "See profit margins update in real-time as costs flow from the field. Color-coded alerts when margins drop below your thresholds.",
      stat: "<2 sec",
      statLabel: "Live Updates",
      gradient: "from-construction-orange to-orange-700"
    },
    {
      icon: LineChart,
      title: "Cash Flow Forecasting",
      description: "30/60/90 day cash projections",
      details: "Predictive cash flow modeling based on your receivables, payables, and project pipelines. Never get caught in a cash crunch.",
      stat: "90 days",
      statLabel: "Forecast Range",
      gradient: "from-blue-500 to-blue-700"
    },
    {
      icon: Target,
      title: "Benchmark Intelligence",
      description: "Compare against industry leaders",
      details: "Anonymized data from 500+ contractors shows where you rank. See top performer strategies and close your performance gaps.",
      stat: "Top 15%",
      statLabel: "Performance Tier",
      gradient: "from-green-500 to-green-700"
    }
  ];

  const competitiveAdvantages = [
    {
      icon: Zap,
      advantage: "Modern Real-Time Architecture",
      description: "Built on Supabase real-time infrastructure vs. legacy batch processing systems",
      impact: "2-3 year competitive head start"
    },
    {
      icon: Brain,
      advantage: "Proprietary Prediction Models",
      description: "AI trained on 332+ database migrations worth of construction-specific data patterns",
      impact: "Impossible to replicate quickly"
    },
    {
      icon: TrendingUp,
      advantage: "Network Effects at Scale",
      description: "Each contractor added improves benchmark accuracy for everyone",
      impact: "Compounds over time"
    },
    {
      icon: AlertTriangle,
      advantage: "Domain Expertise Encoded",
      description: "Built by contractors who understand profit leakage points intimately",
      impact: "Defensible through execution"
    }
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-construction-dark via-construction-blue to-construction-dark text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-block px-4 py-2 bg-construction-orange/20 rounded-full mb-4">
            <span className="text-sm font-semibold text-construction-orange">The Intelligence Layer</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Predictive vs. Reactive Operations
          </h2>
          <p className="text-xl sm:text-2xl text-white/90 max-w-4xl mx-auto leading-relaxed">
            While competitors show you what <span className="text-construction-orange font-semibold">happened yesterday</span>,
            BuildDesk tells you what will <span className="text-construction-orange font-semibold">happen next week</span>
          </p>
        </div>

        {/* Intelligence Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {intelligenceFeatures.map((feature, index) => (
            <Card key={index} className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center`}>
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-construction-orange">{feature.stat}</div>
                    <div className="text-sm text-white/70">{feature.statLabel}</div>
                  </div>
                </div>
                <CardTitle className="text-2xl text-white mb-2">{feature.title}</CardTitle>
                <CardDescription className="text-construction-orange text-lg font-semibold">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-white/80 text-base">{feature.details}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Competitive Advantages */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 sm:p-12 border border-white/10">
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-bold mb-4">
              Why This Is Impossible to Replicate
            </h3>
            <p className="text-lg text-white/80 max-w-3xl mx-auto">
              Four compounding advantages that create a defensible moat around BuildDesk
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {competitiveAdvantages.map((item, index) => (
              <div key={index} className="flex gap-4 p-6 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                <div className="shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-construction-orange/20 flex items-center justify-center">
                    <item.icon className="h-6 w-6 text-construction-orange" />
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-2 text-white">{item.advantage}</h4>
                  <p className="text-white/70 text-sm mb-2">{item.description}</p>
                  <div className="inline-block px-3 py-1 bg-construction-orange/20 rounded-full">
                    <span className="text-xs font-semibold text-construction-orange">{item.impact}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <div className="inline-flex items-center gap-3 mb-6">
              <Clock className="h-5 w-5 text-construction-orange" />
              <span className="text-lg font-semibold">See it in action in under 5 minutes</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg" className="group" asChild>
                <Link to="/auth">
                  Start Free Trial
                  <DollarSign className="ml-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-construction-dark">
                Watch Demo
              </Button>
            </div>
            <p className="text-sm text-white/60 mt-4">
              ✓ 14-day free trial • ✓ See real predictions in 48 hours • ✓ No credit card required
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinancialIntelligenceShowcase;
