import { AlertTriangle, CheckCircle, Clock, DollarSign, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ProblemSolution = () => {
  const problems = [
    {
      icon: AlertTriangle,
      stat: "3 weeks",
      description: "Too late when you discover cost overruns",
      detail: "Traditional software shows you what happened yesterday. By the time you see the problem, thousands are already lost."
    },
    {
      icon: DollarSign,
      stat: "18%",
      description: "Profit margins evaporating invisibly",
      detail: "Field costs pile up untracked. Change orders go underpriced. You think you're profitable until tax time proves otherwise."
    },
    {
      icon: Clock,
      stat: "3 days",
      description: "Month-end close kills productivity",
      detail: "Manual reconciliation, spreadsheet chaos, and QuickBooks double-entry drain your team while decisions wait."
    }
  ];

  const solutions = [
    {
      icon: CheckCircle,
      title: "Predictive Cost Intelligence",
      description: "AI warns you 2-3 weeks before overruns happen. Fix problems while you still have leverage, not after the damage is done."
    },
    {
      icon: CheckCircle,
      title: "Live Profitability Dashboard",
      description: "See real-time profit margins on every project as costs flow from the field. Color-coded alerts when margins drop below threshold."
    },
    {
      icon: CheckCircle,
      title: "5-Minute Month-End Close",
      description: "Automated reconciliation, one-click financial statements, and seamless QuickBooks sync. Close the books in 5 minutes, not 3 days."
    }
  ];

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-construction-dark mb-4 leading-tight">
            Financial Blind Spots Are Killing Your Profitability
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Traditional construction software shows you what happened. BuildDesk predicts what's about to happen—while you can still do something about it.
          </p>
        </div>

        {/* Problems */}
        <div className="mb-16 sm:mb-20">
          <div className="text-center mb-8 sm:mb-12">
            <h3 className="text-xl sm:text-2xl font-bold text-construction-dark mb-4 flex flex-col sm:flex-row items-center justify-center gap-2">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-destructive" />
              The Reality Check
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {problems.map((problem, index) => (
              <Card key={index} className="border-l-4 border-l-destructive hover:shadow-lg transition-shadow">
                <CardHeader className="text-center p-4 sm:p-6">
                  <problem.icon className="h-10 w-10 sm:h-12 sm:w-12 text-destructive mx-auto mb-3 sm:mb-4" />
                  <CardTitle className="text-2xl sm:text-3xl font-bold text-destructive">{problem.stat}</CardTitle>
                  <CardDescription className="text-base sm:text-lg font-semibold text-construction-dark leading-tight">
                    {problem.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <p className="text-sm sm:text-base text-muted-foreground text-center leading-relaxed">{problem.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Solutions */}
        <div>
          <div className="text-center mb-8 sm:mb-12">
            <h3 className="text-xl sm:text-2xl font-bold text-construction-dark mb-4 flex flex-col sm:flex-row items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-construction-orange" />
              The Financial Intelligence Layer
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              The only platform that combines real-time job costing with predictive AI to protect your margins
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {solutions.map((solution, index) => (
              <Card key={index} className="border-l-4 border-l-construction-orange hover:shadow-lg transition-shadow">
                <CardHeader className="text-center p-4 sm:p-6">
                  <solution.icon className="h-10 w-10 sm:h-12 sm:w-12 text-construction-orange mx-auto mb-3 sm:mb-4" />
                  <CardTitle className="text-base sm:text-lg text-construction-dark leading-tight">{solution.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <p className="text-sm sm:text-base text-muted-foreground text-center leading-relaxed">{solution.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Results Preview */}
        <div className="mt-16 sm:mt-20 bg-gradient-to-r from-construction-orange/10 to-construction-blue/10 rounded-xl p-6 sm:p-8">
          <div className="text-center">
            <h3 className="text-xl sm:text-2xl font-bold text-construction-dark mb-4 sm:mb-6">
              Real Results from Predictive Intelligence
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-construction-orange mb-2">$127K</div>
                <div className="text-sm sm:text-base text-construction-dark font-semibold">Average Cost Overruns Prevented</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-construction-orange mb-2">3 Weeks</div>
                <div className="text-sm sm:text-base text-construction-dark font-semibold">Early Warning on Problems</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-construction-orange mb-2">5 Min</div>
                <div className="text-sm sm:text-base text-construction-dark font-semibold">Month-End Close Time</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSolution;