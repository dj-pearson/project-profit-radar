import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  Smartphone,
  Shield,
  Zap,
  ArrowRight,
  Building2,
  Wrench,
  FileText,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ResponsiveContainer, ResponsiveGrid } from "@/components/layout/ResponsiveContainer";

const Features = () => {
  const features = [
    {
      icon: Building2,
      title: "Complete Project Management",
      description: "End-to-end project lifecycle control",
      details: "From initial bid to final warranty, manage every aspect of your construction projects with comprehensive tracking and reporting.",
      benefits: ["Project phases & tasks", "Change order management", "Progress tracking"]
    },
    {
      icon: DollarSign,
      title: "Advanced Financial Management", 
      description: "Real-time profitability & cash flow control",
      details: "Live job costing, purchase order management, vendor tracking, and automated QuickBooks integration for complete financial visibility.",
      benefits: ["Real-time job costing", "Purchase order system", "Automated invoicing"]
    },
    {
      icon: Smartphone,
      title: "Mobile Field Operations",
      description: "Your crew stays connected anywhere",
      details: "Complete offline functionality with time tracking, daily reports, photo documentation, and equipment management from the field.",
      benefits: ["Offline capability", "Daily reporting", "Equipment tracking"]
    },
    {
      icon: Shield,
      title: "Legal & Compliance Suite",
      description: "Stay compliant and protected",
      details: "Comprehensive safety management, permit tracking, bond & insurance management, warranty systems, and OSHA compliance automation.",
      benefits: ["Safety management", "Permit tracking", "Insurance management"]
    },
    {
      icon: Wrench,
      title: "Resource & Equipment Management",
      description: "Optimize your assets and workforce",
      details: "Full equipment fleet management, crew scheduling, material tracking, and utilization optimization with maintenance scheduling.",
      benefits: ["Equipment fleet management", "Crew optimization", "Maintenance scheduling"]
    },
    {
      icon: FileText,
      title: "Specialized Construction Services",
      description: "Industry-specific tools and workflows",
      details: "Public procurement & bidding, service dispatch, environmental permitting, warranty management, and vendor relationship management.",
      benefits: ["Public bidding", "Service dispatch", "Warranty management"]
    },
    {
      icon: Users,
      title: "Client Communication & Support",
      description: "Keep stakeholders informed and engaged", 
      details: "Client portals, automated progress updates, email marketing, knowledge base, and integrated support systems.",
      benefits: ["Client portals", "Automated updates", "Integrated support"]
    },
    {
      icon: Zap,
      title: "Automation & Integrations",
      description: "Streamline operations with smart workflows",
      details: "Calendar integration, automated workflows, QuickBooks sync, email marketing, and comprehensive reporting dashboards.",
      benefits: ["Workflow automation", "Calendar sync", "Smart reporting"]
    }
  ];

  return (
    <section id="features" className="py-12 sm:py-16 lg:py-20 bg-secondary/30">
      <ResponsiveContainer>
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-construction-dark mb-4">
            Complete Construction Management Platform
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
            From project management to compliance, financial control to field operations - everything you need to run profitable construction projects
          </p>
        </div>

        {/* Features Grid */}
        <ResponsiveGrid 
          cols={{ default: 1, md: 2, lg: 4 }} 
          gap="lg"
          className="mb-12 sm:mb-16"
        >
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group hover:shadow-xl transition-all duration-300 border-0 bg-card/70 backdrop-blur-sm hover:bg-card h-full"
            >
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-construction-orange/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-construction-orange/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-construction-orange" />
                </div>
                <CardTitle className="text-lg sm:text-xl text-construction-dark group-hover:text-construction-orange transition-colors">
                  {feature.title}
                </CardTitle>
                <CardDescription className="text-base sm:text-lg font-semibold text-construction-blue">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <p className="text-sm sm:text-base text-muted-foreground">{feature.details}</p>
                <div className="space-y-2">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <div key={benefitIndex} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-construction-orange rounded-full shrink-0"></div>
                      <span className="text-construction-dark">{benefit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </ResponsiveGrid>

        {/* Interactive Demo CTA */}
        <div className="bg-gradient-to-r from-construction-blue to-construction-blue/80 rounded-2xl p-6 sm:p-8 text-center text-white">
          <h3 className="text-xl sm:text-2xl font-bold mb-4">Experience the Complete Platform</h3>
          <p className="text-base sm:text-lg mb-6 text-white/90 max-w-2xl mx-auto">
            Start your free trial to explore all features, or browse our comprehensive functionality showcase
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto sm:max-w-none">
            <Button variant="hero" className="bg-white text-construction-blue hover:bg-white/90 w-full sm:w-auto" asChild>
              <Link to="/auth">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" className="border-white text-white hover:bg-white hover:text-construction-blue w-full sm:w-auto">
              Watch Demo
            </Button>
          </div>
        </div>
      </ResponsiveContainer>
    </section>
  );
};

export default Features;