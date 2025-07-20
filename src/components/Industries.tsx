import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  Home, 
  Building, 
  Wrench, 
  Truck,
  ArrowRight,
  CheckCircle
} from "lucide-react";

const Industries = () => {
  const industries = [
    {
      icon: Home,
      title: "Residential Contractors",
      description: "Home builders, remodelers, specialty trades",
      features: ["Custom home construction", "Kitchen & bath remodeling", "Additions & renovations", "Permit tracking"],
      badge: "Most Popular"
    },
    {
      icon: Building,
      title: "Commercial Contractors", 
      description: "Office fit-outs, retail construction",
      features: ["Office buildings", "Retail spaces", "Warehouse construction", "Tenant improvements"],
      badge: null
    },
    {
      icon: Truck,
      title: "Civil & Infrastructure",
      description: "Municipal projects, utilities",
      features: ["Road construction", "Utility installation", "Municipal projects", "Infrastructure repair"],
      badge: null
    },
    {
      icon: Wrench,
      title: "Specialty Trades",
      description: "Electrical, plumbing, HVAC, roofing",
      features: ["Multi-trade coordination", "Service calls", "Maintenance contracts", "Emergency response"],
      badge: "Fastest Growing"
    }
  ];

  return (
    <section id="industries" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-construction-dark mb-4">
            Built for Every Type of Construction Business
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From residential remodelers to commercial contractors, Build Desk adapts to your specific industry needs
          </p>
        </div>

        {/* Industries Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {industries.map((industry, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 relative overflow-hidden">
              {industry.badge && (
                <Badge 
                  className="absolute top-4 right-4 z-10"
                  variant={industry.badge === "Most Popular" ? "default" : "secondary"}
                >
                  {industry.badge}
                </Badge>
              )}
              <CardHeader>
                <div className="w-16 h-16 bg-construction-orange/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-construction-orange/20 transition-colors">
                  <industry.icon className="h-8 w-8 text-construction-orange" />
                </div>
                <CardTitle className="text-xl text-construction-dark group-hover:text-construction-orange transition-colors">
                  {industry.title}
                </CardTitle>
                <CardDescription className="text-base">
                  {industry.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {industry.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-construction-orange flex-shrink-0" />
                      <span className="text-sm text-construction-dark">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end pt-4 border-t">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-construction-blue hover:text-construction-orange"
                    asChild
                  >
                    <Link to="/auth">
                      Get Started
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-construction-dark mb-4">
            Don't See Your Industry?
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Build Desk is flexible enough to work with any construction business. 
            Our team will help customize the platform for your specific needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" asChild>
              <Link to="/auth">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" className="text-construction-blue border-construction-blue hover:bg-construction-blue hover:text-white">
              Contact Sales
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Industries;