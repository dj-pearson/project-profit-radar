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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-12 sm:mb-16">
          {industries.map((industry, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 relative overflow-hidden">
              {industry.badge && (
                <Badge 
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 text-xs"
                  variant={industry.badge === "Most Popular" ? "default" : "secondary"}
                >
                  {industry.badge}
                </Badge>
              )}
              <CardHeader className="p-4 sm:p-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-construction-orange/10 rounded-xl flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-construction-orange/20 transition-colors">
                  <industry.icon className="h-6 w-6 sm:h-8 sm:w-8 text-construction-orange" />
                </div>
                <CardTitle className="text-lg sm:text-xl text-construction-dark group-hover:text-construction-orange transition-colors leading-tight">
                  {industry.title}
                </CardTitle>
                <CardDescription className="text-sm sm:text-base leading-relaxed">
                  {industry.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-6">
                <div className="space-y-2.5 sm:space-y-3">
                  {industry.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start gap-2.5 sm:gap-3">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-construction-orange shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm text-construction-dark leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end pt-3 sm:pt-4 border-t">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-construction-blue hover:text-construction-orange text-xs sm:text-sm"
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