import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DollarSign, 
  Smartphone, 
  Shield, 
  Zap, 
  MessageSquare, 
  Calendar,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Features = () => {
  const features = [
    {
      icon: DollarSign,
      title: "Real-Time Job Costing",
      description: "Know your profit margins instantly",
      details: "Track labor, materials, and overhead in real-time. Get alerts before costs spiral out of control.",
      benefits: ["Live P&L tracking", "Cost variance alerts", "Margin protection"]
    },
    {
      icon: Smartphone,
      title: "Mobile Field Management",
      description: "Your crew stays connected, online or off",
      details: "Time tracking, photo updates, and progress reports that sync when back online.",
      benefits: ["Offline functionality", "Time clock integration", "Photo documentation"]
    },
    {
      icon: Shield,
      title: "Automated Compliance",
      description: "Never miss an OSHA deadline again",
      details: "Automated safety checklists, certification tracking, and regulatory reporting.",
      benefits: ["OSHA compliance", "Safety inspections", "Certification alerts"]
    },
    {
      icon: Zap,
      title: "Seamless QuickBooks Sync",
      description: "Your books stay current automatically",
      details: "Two-way sync with QuickBooks keeps your financials accurate without double entry.",
      benefits: ["Real-time sync", "No duplicate entry", "Tax-ready reports"]
    },
    {
      icon: MessageSquare,
      title: "Client Communication Hub",
      description: "Keep clients happy with transparency",
      details: "Automated progress updates, photo sharing, and change order approvals.",
      benefits: ["Client portal", "Progress photos", "Digital approvals"]
    },
    {
      icon: Calendar,
      title: "Resource Scheduling",
      description: "Deploy crews efficiently across projects",
      details: "Visual scheduling with drag-and-drop simplicity and resource conflict detection.",
      benefits: ["Visual scheduling", "Resource optimization", "Conflict alerts"]
    }
  ];

  return (
    <section id="features" className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-construction-dark mb-4">
            6 Core Features That Transform Your Business
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Everything you need to run profitable projects, delivered without enterprise complexity
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 bg-card/70 backdrop-blur-sm hover:bg-card">
              <CardHeader>
                <div className="w-12 h-12 bg-construction-orange/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-construction-orange/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-construction-orange" />
                </div>
                <CardTitle className="text-construction-dark group-hover:text-construction-orange transition-colors">
                  {feature.title}
                </CardTitle>
                <CardDescription className="text-lg font-semibold text-construction-blue">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{feature.details}</p>
                <div className="space-y-2">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <div key={benefitIndex} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-construction-orange rounded-full"></div>
                      <span className="text-construction-dark">{benefit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Interactive Demo CTA */}
        <div className="bg-gradient-to-r from-construction-blue to-construction-blue/80 rounded-2xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-4">See These Features in Action</h3>
          <p className="text-lg mb-6 text-white/90">
            Watch our 2-minute demo or start your free trial to experience the difference
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" className="bg-white text-construction-blue hover:bg-white/90" asChild>
              <Link to="/auth">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" className="border-white text-white hover:bg-white hover:text-construction-blue">
              Watch Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;