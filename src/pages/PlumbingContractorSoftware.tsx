import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { CheckCircle, Wrench, DollarSign, Clock, Users, ArrowRight } from "lucide-react";

const PlumbingContractorSoftware = () => {
  const features = [
    {
      icon: Wrench,
      title: "Service Call Management",
      description: "Track emergency calls, routine maintenance, and installation projects with specialized plumbing workflows."
    },
    {
      icon: DollarSign,
      title: "Plumbing Job Costing",
      description: "Track materials, labor, and equipment costs specific to plumbing projects with real-time profitability analysis."
    },
    {
      icon: Clock,
      title: "Emergency Dispatch",
      description: "Prioritize urgent plumbing calls with GPS-enabled technician dispatch and customer communication."
    },
    {
      icon: Users,
      title: "Technician Management",
      description: "Manage plumbing crew schedules, certifications, and performance tracking across multiple job sites."
    }
  ];

  return (
    <>
      <SEOMetaTags
        title="Plumbing Contractor Software - Job Management & Scheduling | BuildDesk"
        description="Specialized construction management software for plumbing contractors. Service call management, emergency dispatch, job costing, and crew scheduling. 14-day free trial."
        keywords={['plumbing contractor software', 'plumbing business management', 'plumbing job scheduling', 'plumbing service software', 'plumbing dispatch software', 'plumber management system']}
        canonicalUrl="/plumbing-contractor-software"
      />
      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        <main className="py-12">
          <div className="container mx-auto px-4">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-6">
                Plumbing Contractor Software
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                Streamline your plumbing business with specialized tools for service calls, emergency dispatch, 
                job costing, and crew management. Built specifically for plumbing contractors.
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
                Why Plumbing Contractors Choose BuildDesk
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-green-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Faster Service Response</h3>
                  <p className="text-sm text-muted-foreground">
                    Reduce emergency response time by 40% with GPS dispatch and mobile crew management.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Increase Profitability</h3>
                  <p className="text-sm text-muted-foreground">
                    Track job costs in real-time and identify profitable service types to grow your revenue.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Better Customer Service</h3>
                  <p className="text-sm text-muted-foreground">
                    Keep customers informed with automated updates and transparent pricing estimates.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-construction-blue text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Ready to Streamline Your Plumbing Business?
              </h2>
              <p className="text-lg mb-6 opacity-90">
                Join hundreds of plumbing contractors who have improved their efficiency and profitability with BuildDesk.
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

export default PlumbingContractorSoftware;
