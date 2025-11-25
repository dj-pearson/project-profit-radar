import { DollarSign, TrendingUp, Zap, Brain, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const FinancialIntelligenceShowcase = () => {
  const intelligenceFeatures = [
    {
      icon: DollarSign,
      badge: "Real-Time Profitability",
      title: "Live Profit Margin Tracking",
      description: "See every project's profit margin update in real-time as costs are captured from the field",
      metrics: [
        { label: "Update Speed", value: "<2 seconds" },
        { label: "Margin Visibility", value: "Per Project" },
        { label: "Cost Categories", value: "All Tracked" }
      ],
      highlight: "Know your exact financial position right now, not at tax time"
    },
    {
      icon: Brain,
      badge: "Predictive Intelligence",
      title: "AI-Powered Cost Prediction",
      description: "Catch budget overruns 2-3 weeks before they become disasters with predictive alerts",
      metrics: [
        { label: "Early Warning", value: "3+ weeks" },
        { label: "Prediction Accuracy", value: "85%+" },
        { label: "Alerts Delivered", value: "Real-time" }
      ],
      highlight: "Fix problems before they cost you thousands"
    },
    {
      icon: Zap,
      badge: "5-Minute Month-End",
      title: "One-Click Financial Close",
      description: "Generate complete financial statements instantly with automated QuickBooks sync",
      metrics: [
        { label: "Close Time", value: "5 minutes" },
        { label: "vs Manual Process", value: "3 days" },
        { label: "Automation", value: "100%" }
      ],
      highlight: "Reclaim 3 days every month for actual business growth"
    },
    {
      icon: TrendingUp,
      badge: "Decision Impact",
      title: "What-If Calculator",
      description: "See the financial impact of decisions before you make them - change orders, new hires, equipment",
      metrics: [
        { label: "Impact Scenarios", value: "Unlimited" },
        { label: "Calculation Time", value: "Instant" },
        { label: "Accuracy", value: "Live Data" }
      ],
      highlight: "Know if approving that change order drops your margin from 18% to 12%"
    }
  ];

  const competitorComparison = [
    {
      feature: "Real-time profit visibility",
      builddesk: true,
      competitors: false,
      note: "They show costs, we show profit impact"
    },
    {
      feature: "Predictive cost alerts",
      builddesk: true,
      competitors: false,
      note: "We warn weeks early, they report after the fact"
    },
    {
      feature: "5-minute month-end close",
      builddesk: true,
      competitors: false,
      note: "Automated vs manual reconciliation"
    },
    {
      feature: "Decision impact calculator",
      builddesk: true,
      competitors: false,
      note: "See consequences before committing"
    }
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <Badge className="mb-4" variant="outline">
            <Brain className="h-3 w-3 mr-1" />
            Financial Intelligence Platform
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-construction-dark mb-4 leading-tight">
            Not Just Construction Management.
            <span className="block text-construction-orange mt-2">A Financial Command Center.</span>
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            While competitors focus on project management, BuildDesk owns financial intelligence -
            giving you the insights SMB contractors desperately need but can't get anywhere else
          </p>
        </div>

        {/* Intelligence Features Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-16">
          {intelligenceFeatures.map((feature, index) => (
            <Card key={index} className="border-2 hover:border-construction-orange transition-all hover:shadow-xl">
              <CardHeader>
                <div className="flex items-start justify-between mb-3">
                  <feature.icon className="h-10 w-10 text-construction-orange" />
                  <Badge variant="secondary">{feature.badge}</Badge>
                </div>
                <CardTitle className="text-xl sm:text-2xl mb-2">{feature.title}</CardTitle>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-secondary/50 rounded-lg">
                  {feature.metrics.map((metric, idx) => (
                    <div key={idx} className="text-center">
                      <div className="text-lg sm:text-xl font-bold text-construction-orange">
                        {metric.value}
                      </div>
                      <div className="text-xs text-muted-foreground">{metric.label}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 text-sm bg-construction-orange/10 p-3 rounded-lg border-l-4 border-construction-orange">
                  <AlertCircle className="h-4 w-4 text-construction-orange flex-shrink-0 mt-0.5" />
                  <p className="font-medium text-construction-dark">{feature.highlight}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Competitive Differentiation */}
        <div className="bg-white dark:bg-card rounded-xl shadow-xl p-6 sm:p-8 border-2 border-construction-orange/20">
          <div className="text-center mb-8">
            <h3 className="text-2xl sm:text-3xl font-bold text-construction-dark dark:text-foreground mb-3">
              Why BuildDesk vs. Procore, Buildertrend, CoConstruct?
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              They manage projects. We prevent financial disasters.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-construction-dark dark:border-border">
                  <th className="text-left py-4 px-4 font-bold text-construction-dark dark:text-foreground">Capability</th>
                  <th className="text-center py-4 px-4 font-bold text-construction-orange">BuildDesk</th>
                  <th className="text-center py-4 px-4 font-bold text-muted-foreground">Competitors</th>
                  <th className="text-left py-4 px-4 font-bold text-construction-dark dark:text-foreground">The Difference</th>
                </tr>
              </thead>
              <tbody>
                {competitorComparison.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-secondary/30 transition-colors dark:border-border">
                    <td className="py-4 px-4 font-medium text-foreground">{item.feature}</td>
                    <td className="text-center py-4 px-4">
                      {item.builddesk ? (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white font-bold">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-destructive/20 text-destructive">
                          ✗
                        </span>
                      )}
                    </td>
                    <td className="text-center py-4 px-4">
                      {item.competitors ? (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white font-bold">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-destructive/20 text-destructive">
                          ✗
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-muted-foreground italic">{item.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 p-6 bg-gradient-to-r from-construction-orange/10 to-construction-blue/10 rounded-lg text-center">
            <h4 className="text-xl font-bold text-construction-dark dark:text-foreground mb-2">
              The Bottom Line
            </h4>
            <p className="text-muted-foreground mb-4">
              Other platforms help you manage work. BuildDesk helps you make money.
            </p>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-construction-orange">
              <Clock className="h-4 w-4" />
              Average ROI payback: Less than 1 month
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-8 flex-wrap justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-construction-orange">500+</div>
              <div className="text-sm text-muted-foreground">Contractors Trust BuildDesk</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-construction-orange">$2M+</div>
              <div className="text-sm text-muted-foreground">Cost Overruns Prevented</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-construction-orange">98%</div>
              <div className="text-sm text-muted-foreground">Would Recommend</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinancialIntelligenceShowcase;
