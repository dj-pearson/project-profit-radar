import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { CheckCircle, Building, DollarSign, Users, Calendar, ArrowRight, BarChart3, Shield } from "lucide-react";

const CommercialContractors = () => {
  const features = [
    {
      icon: Building,
      title: "Large-Scale Project Management",
      description: "Manage complex commercial projects with multiple phases, subcontractors, and stakeholders."
    },
    {
      icon: DollarSign,
      title: "Advanced Job Costing",
      description: "Track costs across multiple work packages and change orders with detailed variance analysis."
    },
    {
      icon: Users,
      title: "Subcontractor Management",
      description: "Coordinate multiple subcontractors, track their progress, and manage payments efficiently."
    },
    {
      icon: Shield,
      title: "Compliance & Documentation",
      description: "Meet commercial project requirements with comprehensive documentation and compliance tracking."
    }
  ];

  return (
    <>
      <SEOMetaTags
        title="Commercial Construction Management Software | BuildDesk"
        description="Specialized construction management software for commercial contractors. Large-scale project management, subcontractor coordination, and compliance tracking. 14-day free trial."
        keywords={['commercial construction software', 'commercial contractor management', 'large scale construction projects', 'subcontractor management', 'commercial building software']}
        canonicalUrl="/commercial-contractors"
      />
      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        <main className="py-12">
          <div className="container mx-auto px-4">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-6">
                Commercial Construction Management
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                Purpose-built for commercial contractors managing complex projects. Coordinate subcontractors, 
                track compliance, and deliver projects on time and on budget.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth">
                  <Button size="lg" className="bg-construction-blue hover:bg-construction-blue/90">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/roi-calculator">
                  <Button size="lg" variant="outline">
                    Calculate ROI
                  </Button>
                </Link>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              {features.map((feature, index) => (
                <Card key={index} className="border-construction-blue/20 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-construction-blue/10 rounded-lg">
                        <feature.icon className="h-6 w-6 text-construction-blue" />
                      </div>
                      <CardTitle className="text-construction-dark">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-600">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Benefits Section */}
            <div className="bg-white rounded-lg border p-8 mb-16">
              <h2 className="text-3xl font-bold text-construction-dark mb-8 text-center">
                Built for Commercial Project Complexity
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-green-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Multi-Phase Coordination</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage complex project phases with dependencies, critical path analysis, and resource optimization.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Cost Control at Scale</h3>
                  <p className="text-sm text-muted-foreground">
                    Track budgets across multiple work packages with real-time variance alerts and forecasting.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Stakeholder Communication</h3>
                  <p className="text-sm text-muted-foreground">
                    Keep owners, architects, and subcontractors aligned with automated progress reporting.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-construction-blue text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Scale Your Commercial Construction Business
              </h2>
              <p className="text-lg mb-6 opacity-90">
                Join commercial contractors who have improved project delivery times by 25% and reduced cost overruns.
              </p>
              <Link to="/auth">
                <Button size="lg" variant="secondary">
                  Start Your Free Trial Today
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default CommercialContractors;
