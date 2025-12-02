import { AlertTriangle, CheckCircle, Clock, DollarSign, ArrowRight, ShieldAlert, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

const ProblemSolution = () => {
  return (
    <div className="space-y-24">
      {/* The Problem */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-medium">
            <ShieldAlert className="h-4 w-4" />
            The Silent Profit Killer
          </div>

          <h2 className="text-4xl sm:text-5xl font-bold text-construction-dark dark:text-white leading-tight">
            Stop Bleeding Profit <br />
            <span className="text-destructive">Without Knowing It.</span>
          </h2>

          <p className="text-xl text-muted-foreground leading-relaxed">
            Most contractors don't know they're losing money until the job is done. By then, it's too late to fix it.
          </p>

          <div className="space-y-6">
            {[
              {
                icon: DollarSign,
                title: "Invisible Cost Overruns",
                desc: "Average $40k+ lost per project due to delayed reporting."
              },
              {
                icon: Clock,
                title: "Days Wasted on Admin",
                desc: "Manual entry and reconciliation eats 15+ hours a week."
              },
              {
                icon: TrendingDown,
                title: "Zero Predictive Power",
                desc: "Flying blind without knowing where the project lands."
              }
            ].map((item, i) => (
              <div key={i} className="flex gap-4 items-start p-4 rounded-xl hover:bg-destructive/5 transition-colors border border-transparent hover:border-destructive/10">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-construction-dark dark:text-white mb-1">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-destructive/20 to-transparent rounded-3xl blur-3xl" />
          <div className="relative bg-card border border-border rounded-3xl p-8 shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="font-mono text-sm text-muted-foreground">STATUS: CRITICAL</span>
                <span className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
              </div>
              <div className="space-y-4">
                <div className="h-24 bg-destructive/5 rounded-xl border border-destructive/20 p-4 flex items-center gap-4">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                  <div>
                    <div className="font-bold text-destructive">Budget Overrun Detected</div>
                    <div className="text-sm text-muted-foreground">Project: Westside Complex</div>
                  </div>
                  <div className="ml-auto font-mono font-bold text-destructive">-$12,450</div>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-destructive w-[85%]" />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Budget Used</span>
                  <span className="font-bold text-destructive">115%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The Solution */}
      <div className="relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-construction-dark dark:text-white mb-6">
            The <span className="text-gradient">Financial Intelligence</span> Engine
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Turn your financial data into a competitive weapon. Real-time insights, predictive alerts, and automated workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Real-Time Visibility",
              desc: "See profit margins update instantly as costs occur.",
              color: "bg-blue-500",
              col: "md:col-span-2"
            },
            {
              title: "Predictive AI",
              desc: "Catch issues 3 weeks before they happen.",
              color: "bg-purple-500",
              col: "md:col-span-1"
            },
            {
              title: "Automated Close",
              desc: "Close books in minutes, not days.",
              color: "bg-green-500",
              col: "md:col-span-1"
            },
            {
              title: "Scenario Planning",
              desc: "Simulate decisions before committing capital.",
              color: "bg-orange-500",
              col: "md:col-span-2"
            }
          ].map((item, i) => (
            <div key={i} className={cn("group relative overflow-hidden rounded-3xl p-8 glass-card hover:shadow-2xl transition-all duration-500", item.col)}>
              <div className={cn("absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity", item.color)} />

              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="mb-8">
                  <div className={cn("w-12 h-12 rounded-2xl mb-6 flex items-center justify-center text-white shadow-lg", item.color)}>
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-construction-dark dark:text-white mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-lg">{item.desc}</p>
                </div>

                <div className="flex items-center text-sm font-bold text-construction-dark dark:text-white opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                  Learn more <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProblemSolution;