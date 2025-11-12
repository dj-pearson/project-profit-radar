import { AlertTriangle, CheckCircle, Clock, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ProblemSolution = () => {
  const problems = [
    {
      icon: DollarSign,
      stat: "$40K+",
      description: "Average cost overrun discovered too late",
      detail: "You only find out about profit erosion at tax time when it's already gone"
    },
    {
      icon: Clock,
      stat: "3 days",
      description: "Wasted on manual month-end close",
      detail: "Spreadsheets, QuickBooks data entry, and reconciliation consume valuable time"
    },
    {
      icon: AlertTriangle,
      stat: "Zero",
      description: "Early warning before budget disasters",
      detail: "No predictive intelligence to catch problems weeks before they become catastrophic"
    }
  ];

  const solutions = [
    {
      icon: CheckCircle,
      title: "Real-Time Profitability Intelligence",
      description: "See every project's profit margin update instantly as costs are captured. Know exactly where you stand, right now."
    },
    {
      icon: CheckCircle,
      title: "Predictive Cost Alerts",
      description: "AI-powered predictions catch budget overruns 2-3 weeks early. Fix problems before they cost you thousands."
    },
    {
      icon: CheckCircle,
      title: "5-Minute Month-End Close",
      description: "One-click financial statements with automated QuickBooks sync. Close your books in 5 minutes instead of 3 days."
    }
  ];

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-construction-dark mb-4 leading-tight">
            Why Most Contractors Don't Know They're Losing Money Until It's Too Late
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Without real-time financial intelligence, profit erosion is invisible until year-end when it's impossible to recover
          </p>
        </div>

        {/* Problems */}
        <div className="mb-16 sm:mb-20">
          <div className="text-center mb-8 sm:mb-12">
            <h3 className="text-xl sm:text-2xl font-bold text-construction-dark mb-4 flex flex-col sm:flex-row items-center justify-center gap-2">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-destructive" />
              The Financial Blindness Problem
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
              The Financial Intelligence Solution
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Where other platforms focus on project management, BuildDesk owns financial intelligence - the category where SMB contractors have the greatest pain
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
              Real Results from Real Contractors
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-construction-orange mb-2">4%+</div>
                <div className="text-sm sm:text-base text-construction-dark font-semibold">Profit Margin Improvement</div>
                <div className="text-xs text-muted-foreground mt-1">From better cost visibility</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-construction-orange mb-2">3 Weeks</div>
                <div className="text-sm sm:text-base text-construction-dark font-semibold">Early Warning on Overruns</div>
                <div className="text-xs text-muted-foreground mt-1">Time to fix before disaster</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-construction-orange mb-2">5 Minutes</div>
                <div className="text-sm sm:text-base text-construction-dark font-semibold">Month-End Close Time</div>
                <div className="text-xs text-muted-foreground mt-1">Down from 3 days</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSolution;