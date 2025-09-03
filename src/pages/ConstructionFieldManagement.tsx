import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { CheckCircle, Smartphone, DollarSign, Users, Clock, ArrowRight, Camera, MapPin } from "lucide-react";

const ConstructionFieldManagement = () => {
  const features = [
    {
      icon: Smartphone,
      title: "Mobile-First Design",
      description: "Native mobile apps that work offline and sync when connected, designed specifically for field use."
    },
    {
      icon: Camera,
      title: "Photo Documentation",
      description: "Capture progress photos, safety issues, and quality control with GPS tagging and automatic organization."
    },
    {
      icon: Clock,
      title: "Real-Time Time Tracking",
      description: "Track crew time, equipment usage, and project progress with GPS verification and automatic reporting."
    },
    {
      icon: MapPin,
      title: "GPS Job Site Tracking",
      description: "Verify crew locations, track equipment, and ensure accurate time reporting with GPS integration."
    }
  ];

  return (
    <>
      <SEOMetaTags
        title="Construction Field Management Software - Mobile Crew Management | BuildDesk"
        description="Powerful field management software for construction crews. Mobile time tracking, photo documentation, GPS verification, and offline capabilities. Designed for the field."
        keywords={['construction field management', 'mobile construction software', 'field crew management', 'construction time tracking', 'mobile project management', 'construction field apps']}
        canonicalUrl="/construction-field-management"
      />
      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        <main className="py-12">
          <div className="container mx-auto px-4">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-6">
                Construction Field Management
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                Empower your field crews with mobile-first tools designed for the job site. 
                Track time, document progress, and stay connected even without internet.
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
                Field Management That Actually Works
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-green-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Works Offline</h3>
                  <p className="text-sm text-muted-foreground">
                    Continue working even without cell service. Data syncs automatically when connection is restored.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Reduce Paperwork</h3>
                  <p className="text-sm text-muted-foreground">
                    Eliminate 90% of field paperwork with digital forms, photos, and automatic report generation.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Improve Accountability</h3>
                  <p className="text-sm text-muted-foreground">
                    GPS verification and photo documentation ensure accurate time tracking and work verification.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-construction-blue text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Modernize Your Field Operations
              </h2>
              <p className="text-lg mb-6 opacity-90">
                Give your field crews the tools they need to work efficiently and stay connected to the office.
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

export default ConstructionFieldManagement;
export { ConstructionFieldManagement as OSHAComplianceSoftware };
