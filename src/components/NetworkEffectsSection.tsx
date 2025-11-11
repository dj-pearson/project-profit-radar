import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  TrendingUp,
  Target,
  BarChart3,
  Zap,
  Lock,
  Shield,
  ArrowUpRight,
  Network,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const NetworkEffectsSection = () => {
  const networkStats = [
    {
      metric: "500+",
      label: "Active Contractors",
      description: "Contributing to benchmark data pool",
      icon: Building2
    },
    {
      metric: "10,000+",
      label: "Projects Analyzed",
      description: "Building predictive accuracy",
      icon: BarChart3
    },
    {
      metric: "85%",
      label: "Prediction Accuracy",
      description: "Improving with every project",
      icon: Target
    },
    {
      metric: "Top 15%",
      label: "Performance Tier",
      description: "Average customer ranking",
      icon: TrendingUp
    }
  ];

  const networkAdvantages = [
    {
      icon: BarChart3,
      title: "Industry Benchmark Intelligence",
      description: "Every contractor added improves insights for all",
      details: "Compare your profit margins, labor efficiency, and material costs against anonymized industry data. See where you rank and what top performers do differently.",
      compounding: "Accuracy improves 5-10% with each 100 contractors"
    },
    {
      icon: Zap,
      title: "Predictive Model Enhancement",
      description: "More data = better predictions for everyone",
      details: "AI prediction models learn from every project in the network. Cost overrun patterns, timeline risks, and cash flow forecasting get more accurate over time.",
      compounding: "Models retrain weekly with aggregated learnings"
    },
    {
      icon: Network,
      title: "Integration Marketplace",
      description: "Third-party ecosystem compounds value",
      details: "Developer platform enables specialized tools for electrical, HVAC, plumbing contractors. Each integration attracts more users, which attracts more developers.",
      compounding: "Planned for Phase 5 (Months 7-12)"
    }
  ];

  const privacyGuarantees = [
    {
      icon: Lock,
      guarantee: "Company-Level Isolation",
      description: "Your project data is never shared. Only anonymized, aggregated metrics contribute to benchmarks."
    },
    {
      icon: Shield,
      guarantee: "Opt-In Participation",
      description: "You control whether to contribute to the benchmark pool. Transparency in what's shared and when."
    },
    {
      icon: Users,
      guarantee: "Competitive Privacy",
      description: "No individual company identification. Minimum 50 companies per benchmark segment for statistical anonymity."
    }
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-muted/50 to-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-block px-4 py-2 bg-purple-500/10 rounded-full mb-4">
            <span className="text-sm font-semibold text-purple-600">Network Effects</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-construction-dark mb-6">
            The Platform That Gets Smarter Over Time
          </h2>
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Every contractor who joins BuildDesk makes the platform more valuable for everyone else
          </p>
        </div>

        {/* Network Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-16">
          {networkStats.map((stat, index) => (
            <Card key={index} className="text-center border-0 bg-card shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <stat.icon className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-3xl sm:text-4xl font-bold text-construction-orange mb-1">
                  {stat.metric}
                </CardTitle>
                <p className="text-sm font-semibold text-construction-dark">{stat.label}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Network Advantages */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h3 className="text-2xl sm:text-3xl font-bold text-construction-dark mb-3">
              Compounding Value That Competitors Can't Match
            </h3>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Three network effects that create an insurmountable moat
            </p>
          </div>

          <div className="space-y-6">
            {networkAdvantages.map((advantage, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/3 bg-gradient-to-br from-purple-500 to-purple-700 p-6 sm:p-8 text-white flex flex-col justify-center">
                    <advantage.icon className="h-12 w-12 mb-4 mx-auto md:mx-0" />
                    <h4 className="text-xl font-bold mb-2 text-center md:text-left">{advantage.title}</h4>
                    <p className="text-sm text-white/90 text-center md:text-left">{advantage.description}</p>
                  </div>
                  <div className="md:w-2/3 p-6 sm:p-8">
                    <p className="text-base text-muted-foreground mb-4 leading-relaxed">
                      {advantage.details}
                    </p>
                    <div className="flex items-start gap-2 p-3 bg-purple-500/5 rounded-lg border-l-4 border-purple-500">
                      <ArrowUpRight className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-construction-dark mb-1">Compounding Effect:</p>
                        <p className="text-sm text-muted-foreground">{advantage.compounding}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Privacy Guarantees */}
        <div className="bg-card rounded-2xl p-8 sm:p-12 border border-border shadow-lg">
          <div className="text-center mb-8">
            <Lock className="h-12 w-12 text-construction-blue mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-construction-dark mb-3">
              Your Data Stays Private
            </h3>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              Network effects without compromising competitive confidentiality
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {privacyGuarantees.map((item, index) => (
              <div key={index} className="flex flex-col items-center text-center p-4">
                <div className="w-12 h-12 rounded-lg bg-construction-blue/10 flex items-center justify-center mb-3">
                  <item.icon className="h-6 w-6 text-construction-blue" />
                </div>
                <h4 className="font-semibold text-construction-dark mb-2">{item.guarantee}</h4>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button variant="outline" size="lg" asChild>
              <Link to="/security-settings">
                <Lock className="mr-2 h-4 w-4" />
                View Privacy Settings
              </Link>
            </Button>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl p-8 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }}></div>
          </div>
          <div className="relative z-10">
            <Network className="h-12 w-12 text-white mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-4">
              Join the Network. Multiply Your Intelligence.
            </h3>
            <p className="text-lg text-white/90 max-w-2xl mx-auto mb-6">
              Early adopters get the most advantage. Every contractor after you makes your predictions more accurate.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg" className="bg-white text-purple-700 hover:bg-white/90" asChild>
                <Link to="/auth">
                  Start Free Trial
                  <ArrowUpRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-purple-700">
                See Benchmark Demo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NetworkEffectsSection;
