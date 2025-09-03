import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { CheckCircle, Shield, DollarSign, Users, FileText, ArrowRight, AlertTriangle } from "lucide-react";

const OSHAComplianceSoftware = () => {
  const features = [
    {
      icon: Shield,
      title: "OSHA Compliance Tracking",
      description: "Stay compliant with automated OSHA reporting, safety checklists, and incident documentation."
    },
    {
      icon: FileText,
      title: "Safety Documentation",
      description: "Digital safety forms, training records, and compliance documentation that's always audit-ready."
    },
    {
      icon: AlertTriangle,
      title: "Incident Management",
      description: "Report, track, and analyze safety incidents with comprehensive investigation workflows."
    },
    {
      icon: Users,
      title: "Safety Training Tracking",
      description: "Monitor employee safety training, certifications, and renewal dates with automated reminders."
    }
  ];

  return (
    <>
      <SEOMetaTags
        title="OSHA Compliance Software for Construction - Safety Management | BuildDesk"
        description="Comprehensive OSHA compliance software for construction. Safety tracking, incident management, training records, and automated reporting. Keep your crew safe and compliant."
        keywords={['OSHA compliance software', 'construction safety software', 'safety management system', 'OSHA reporting', 'construction safety tracking', 'workplace safety software']}
        canonicalUrl="/osha-compliance-software"
      />
      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        <main className="py-12">
          <div className="container mx-auto px-4">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-6">
                OSHA Compliance Software
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                Keep your construction crew safe and your business compliant with comprehensive 
                OSHA tracking, incident management, and automated safety reporting.
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
                Protect Your Crew and Your Business
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-green-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Reduce Incidents</h3>
                  <p className="text-sm text-muted-foreground">
                    Prevent 70% of workplace incidents with proactive safety monitoring and training tracking.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Lower Insurance Costs</h3>
                  <p className="text-sm text-muted-foreground">
                    Demonstrate safety commitment to insurers and potentially reduce premiums by 15-25%.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Avoid Penalties</h3>
                  <p className="text-sm text-muted-foreground">
                    Stay audit-ready with comprehensive documentation and automated compliance reporting.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-construction-blue text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Prioritize Safety, Protect Your Business
              </h2>
              <p className="text-lg mb-6 opacity-90">
                Join safety-conscious contractors who have reduced incidents and improved compliance with BuildDesk.
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

export default OSHAComplianceSoftware;
