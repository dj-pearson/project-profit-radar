import { AlertTriangle, CheckCircle, Clock, DollarSign, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ProblemSolution = () => {
  const problems = [
    {
      icon: Clock,
      stat: "77 days",
      description: "Projects average behind schedule",
      detail: "Lack of real-time visibility into project progress and resource allocation"
    },
    {
      icon: DollarSign,
      stat: "28%",
      description: "Over budget on 98% of projects",
      detail: "No real-time cost tracking leads to profit margin erosion"
    },
    {
      icon: FileText,
      stat: "6 hours",
      description: "Wasted daily on admin tasks",
      detail: "Manual paperwork, duplicate data entry, and scattered communication"
    }
  ];

  const solutions = [
    {
      icon: CheckCircle,
      title: "Real-Time Project Visibility",
      description: "Track progress, costs, and resources across all projects from a single dashboard"
    },
    {
      icon: CheckCircle,
      title: "Automated Cost Tracking",
      description: "Know your profit margins instantly with automated job costing and QuickBooks sync"
    },
    {
      icon: CheckCircle,
      title: "Streamlined Workflows",
      description: "Eliminate paperwork with mobile-first tools that work offline in the field"
    }
  ];

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-construction-dark mb-4 leading-tight">
            The Hidden Costs of Poor Project Management
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            SMB contractors lose thousands monthly to preventable delays, budget overruns, and administrative inefficiencies
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
              The Build Desk Solution
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Purpose-built for SMB contractors who need enterprise-level insights without the complexity
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
              See the Impact in 30 Days
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-construction-orange mb-2">23%</div>
                <div className="text-sm sm:text-base text-construction-dark font-semibold">Average Profit Increase</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-construction-orange mb-2">15 Days</div>
                <div className="text-sm sm:text-base text-construction-dark font-semibold">Faster Project Completion</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-construction-orange mb-2">5.5 Hours</div>
                <div className="text-sm sm:text-base text-construction-dark font-semibold">Admin Time Saved Daily</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSolution;