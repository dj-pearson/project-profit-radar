import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { CheckCircle, Zap, DollarSign, Clock, Users, ArrowRight, Shield } from "lucide-react";

const ElectricalContractorSoftware = () => {
  const features = [
    {
      icon: Zap,
      title: "Electrical Project Management",
      description: "Manage wiring, panel installations, and electrical system upgrades with specialized electrical workflows."
    },
    {
      icon: DollarSign,
      title: "Electrical Job Costing",
      description: "Track wire, conduit, fixtures, and labor costs with real-time profitability analysis for electrical projects."
    },
    {
      icon: Shield,
      title: "Safety & Compliance",
      description: "Ensure electrical safety standards and code compliance with built-in checklists and documentation."
    },
    {
      icon: Users,
      title: "Licensed Electrician Management",
      description: "Track electrician licenses, certifications, and specialized skills across your electrical crew."
    }
  ];

  return (
    <>
      <SEOMetaTags
        title="Electrical Contractor Software - Project Management & Safety | BuildDesk"
        description="Comprehensive electrical contractor management software. Project tracking, safety compliance, job costing, and licensed electrician management. 14-day free trial."
        keywords={['electrical contractor software', 'electrical business management', 'electrical project management', 'electrician scheduling software', 'electrical safety compliance', 'electrical job costing']}
        canonicalUrl="/electrical-contractor-software"
      />
      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        <main className="py-12">
          <div className="container mx-auto px-4">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-6">
                Electrical Contractor Software
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                Complete management solution for electrical contractors. From residential wiring to commercial 
                installations, manage projects safely and profitably.
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
                Why Electrical Contractors Choose BuildDesk
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-green-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Code Compliance</h3>
                  <p className="text-sm text-muted-foreground">
                    Built-in electrical code compliance checks and documentation to pass inspections every time.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Material Cost Control</h3>
                  <p className="text-sm text-muted-foreground">
                    Track expensive electrical materials and optimize inventory to reduce waste and improve margins.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Safety First</h3>
                  <p className="text-sm text-muted-foreground">
                    Electrical safety protocols and incident tracking to protect your crew and maintain insurance rates.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-construction-blue text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Power Up Your Electrical Business
              </h2>
              <p className="text-lg mb-6 opacity-90">
                Join electrical contractors who have reduced project delays by 45% and improved safety compliance.
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

export default ElectricalContractorSoftware;
