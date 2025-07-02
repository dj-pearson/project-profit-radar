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
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-construction-dark mb-4">
            The Hidden Costs of Poor Project Management
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            SMB contractors lose thousands monthly to preventable delays, budget overruns, and administrative inefficiencies
          </p>
        </div>

        {/* Problems */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-construction-dark mb-4 flex items-center justify-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              The Reality Check
            </h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {problems.map((problem, index) => (
              <Card key={index} className="border-l-4 border-l-destructive hover:shadow-lg transition-shadow">
                <CardHeader className="text-center">
                  <problem.icon className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <CardTitle className="text-3xl font-bold text-destructive">{problem.stat}</CardTitle>
                  <CardDescription className="text-lg font-semibold text-construction-dark">
                    {problem.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center">{problem.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Solutions */}
        <div>
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-construction-dark mb-4 flex items-center justify-center gap-2">
              <CheckCircle className="h-6 w-6 text-construction-orange" />
              The BuildTrack Solution
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Purpose-built for SMB contractors who need enterprise-level insights without the complexity
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {solutions.map((solution, index) => (
              <Card key={index} className="border-l-4 border-l-construction-orange hover:shadow-lg transition-shadow">
                <CardHeader className="text-center">
                  <solution.icon className="h-12 w-12 text-construction-orange mx-auto mb-4" />
                  <CardTitle className="text-construction-dark">{solution.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center">{solution.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Results Preview */}
        <div className="mt-20 bg-gradient-to-r from-construction-orange/10 to-construction-blue/10 rounded-xl p-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-construction-dark mb-6">
              See the Impact in 30 Days
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <div className="text-3xl font-bold text-construction-orange mb-2">23%</div>
                <div className="text-construction-dark font-semibold">Average Profit Increase</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-construction-orange mb-2">15 Days</div>
                <div className="text-construction-dark font-semibold">Faster Project Completion</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-construction-orange mb-2">5.5 Hours</div>
                <div className="text-construction-dark font-semibold">Admin Time Saved Daily</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSolution;