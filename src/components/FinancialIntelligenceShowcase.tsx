import { DollarSign, TrendingUp, Zap, Brain, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const FinancialIntelligenceShowcase = () => {
  const features = [
    {
      icon: DollarSign,
      title: "Live Profit Tracking",
      desc: "Real-time margin updates per project.",
      stats: "Update Speed: <2s"
    },
    {
      icon: Brain,
      title: "AI Cost Prediction",
      desc: "Forecast overruns weeks in advance.",
      stats: "Accuracy: 85%+"
    },
    {
      icon: Zap,
      title: "Instant Close",
      desc: "Automated month-end reconciliation.",
      stats: "Time: 5 mins"
    },
    {
      icon: TrendingUp,
      title: "Impact Analysis",
      desc: "Simulate financial decisions instantly.",
      stats: "Scenarios: ∞"
    }
  ];

  return (
    <div className="space-y-20">
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <Badge variant="outline" className="px-4 py-1 border-construction-orange/30 text-construction-orange bg-construction-orange/5">
          <Brain className="h-3 w-3 mr-2" />
          Financial Intelligence Platform
        </Badge>
        <h2 className="text-4xl sm:text-5xl font-bold text-construction-dark dark:text-white leading-tight">
          Not Just Project Management. <br />
          <span className="text-gradient">A Financial Command Center.</span>
        </h2>
        <p className="text-xl text-muted-foreground">
          While competitors focus on schedules and photos, BuildDesk owns the financial intelligence layer—where profit is actually made.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f, i) => (
          <div key={i} className="glass-card p-6 rounded-2xl hover:border-construction-orange/50 transition-colors group">
            <div className="h-12 w-12 bg-secondary rounded-xl flex items-center justify-center mb-6 group-hover:bg-construction-orange group-hover:text-white transition-colors">
              <f.icon className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-construction-dark dark:text-white mb-2">{f.title}</h3>
            <p className="text-muted-foreground mb-4 h-12">{f.desc}</p>
            <div className="pt-4 border-t border-border/50 text-xs font-mono text-construction-orange font-bold">
              {f.stats}
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="glass-card rounded-3xl overflow-hidden border-0 shadow-2xl">
        <div className="bg-construction-dark/5 dark:bg-white/5 p-8 text-center border-b border-border/10">
          <h3 className="text-2xl font-bold text-construction-dark dark:text-white">Why BuildDesk Wins</h3>
          <p className="text-muted-foreground">The only platform built for financial clarity.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/10">
                <th className="p-6 font-medium text-muted-foreground w-1/2">Capability</th>
                <th className="p-6 font-bold text-construction-orange text-center bg-construction-orange/5 w-1/4">BuildDesk</th>
                <th className="p-6 font-medium text-muted-foreground text-center w-1/4">Others</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {[
                { name: "Real-time Profit Visibility", us: true, them: false },
                { name: "Predictive Cost Alerts", us: true, them: false },
                { name: "Automated Month-End Close", us: true, them: false },
                { name: "Decision Impact Calculator", us: true, them: false },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-secondary/20 transition-colors">
                  <td className="p-6 font-medium text-construction-dark dark:text-gray-200">{row.name}</td>
                  <td className="p-6 text-center bg-construction-orange/5">
                    <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-500 text-white shadow-lg shadow-green-500/30">
                      <Check className="h-5 w-5" />
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-secondary text-muted-foreground">
                      <X className="h-5 w-5" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinancialIntelligenceShowcase;
