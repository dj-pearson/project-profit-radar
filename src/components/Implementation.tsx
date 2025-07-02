import { CheckCircle, Clock, Users, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Implementation = () => {
  const timeline = [
    {
      week: "Week 1-2",
      title: "Platform Setup & Team Onboarding",
      icon: Users,
      tasks: [
        "Account setup and user provisioning",
        "Basic configuration and preferences",
        "Team training sessions (2-hour sessions)",
        "Mobile app installation and setup"
      ],
      outcome: "Your team is trained and ready to start using Build Desk"
    },
    {
      week: "Week 3-4", 
      title: "Data Migration & Workflow Customization",
      icon: Zap,
      tasks: [
        "Import existing project data",
        "QuickBooks integration setup",
        "Custom workflow configuration",
        "Client portal setup and branding"
      ],
      outcome: "All your existing data is migrated and workflows are customized"
    },
    {
      week: "Week 5+",
      title: "Full Deployment with Ongoing Support",
      icon: CheckCircle,
      tasks: [
        "Go-live with all active projects",
        "Performance monitoring and optimization",
        "Advanced feature training",
        "Continuous improvement planning"
      ],
      outcome: "Full deployment with measurable improvements in efficiency"
    }
  ];

  const guarantees = [
    {
      icon: Clock,
      title: "Live in 30 Days",
      description: "We guarantee your team will be fully operational within 30 days or money back"
    },
    {
      icon: Users,
      title: "Dedicated Success Manager",
      description: "Your assigned success manager ensures smooth implementation and adoption"
    },
    {
      icon: CheckCircle,
      title: "Zero Data Loss",
      description: "Our migration process is proven with 100% data integrity guarantee"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-secondary/30 to-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-construction-dark mb-4">
            Implementation That Actually Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our proven 30-day implementation process gets your team productive fast, with zero disruption to ongoing projects
          </p>
        </div>

        {/* Timeline */}
        <div className="mb-20">
          <div className="grid md:grid-cols-3 gap-8">
            {timeline.map((phase, index) => (
              <Card key={index} className="relative overflow-hidden border-0 bg-card/70 backdrop-blur-sm">
                {/* Progress indicator */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-construction-orange to-construction-blue"></div>
                
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 mx-auto mb-4 bg-construction-orange/10 rounded-full flex items-center justify-center">
                    <phase.icon className="h-8 w-8 text-construction-orange" />
                  </div>
                  <div className="text-sm font-semibold text-construction-orange uppercase tracking-wide">
                    {phase.week}
                  </div>
                  <CardTitle className="text-xl text-construction-dark">{phase.title}</CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {phase.tasks.map((task, taskIndex) => (
                      <div key={taskIndex} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-construction-orange mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{task}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-4 border-t border-border">
                    <div className="text-sm font-semibold text-construction-dark mb-1">Outcome:</div>
                    <div className="text-sm text-construction-blue">{phase.outcome}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Guarantees */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-construction-dark text-center mb-12">
            Our Implementation Guarantees
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {guarantees.map((guarantee, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-construction-blue/10 rounded-full flex items-center justify-center">
                  <guarantee.icon className="h-8 w-8 text-construction-blue" />
                </div>
                <h4 className="text-lg font-semibold text-construction-dark mb-2">{guarantee.title}</h4>
                <p className="text-muted-foreground">{guarantee.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Success Metrics */}
        <div className="bg-gradient-to-r from-construction-orange/10 to-construction-blue/10 rounded-xl p-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-construction-dark mb-4">
              Implementation Success Rate
            </h3>
            <p className="text-muted-foreground">
              Track record from 500+ successful implementations
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-construction-orange mb-2">98%</div>
              <div className="text-construction-dark font-semibold">On-Time Completion</div>
              <div className="text-sm text-muted-foreground">Live within 30 days</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-construction-orange mb-2">100%</div>
              <div className="text-construction-dark font-semibold">Data Integrity</div>
              <div className="text-sm text-muted-foreground">Zero data loss</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-construction-orange mb-2">94%</div>
              <div className="text-construction-dark font-semibold">User Adoption</div>
              <div className="text-sm text-muted-foreground">Team satisfaction</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-construction-orange mb-2">4.9</div>
              <div className="text-construction-dark font-semibold">Implementation Rating</div>
              <div className="text-sm text-muted-foreground">Customer feedback</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Implementation;