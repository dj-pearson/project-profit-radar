import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { CheckCircle, Thermometer, DollarSign, Clock, Users, ArrowRight } from "lucide-react";

const HVACContractorSoftware = () => {
  const features = [
    {
      icon: Thermometer,
      title: "HVAC System Management",
      description: "Track installations, maintenance schedules, and system performance with specialized HVAC workflows."
    },
    {
      icon: DollarSign,
      title: "HVAC Job Costing",
      description: "Monitor equipment, labor, and material costs for heating, cooling, and ventilation projects with precision."
    },
    {
      icon: Clock,
      title: "Preventive Maintenance",
      description: "Schedule and track routine HVAC maintenance with automated customer reminders and service history."
    },
    {
      icon: Users,
      title: "Certified Technician Tracking",
      description: "Manage HVAC technician certifications, training records, and specialized skill assignments."
    }
  ];

  return (
    <>
      <SEOMetaTags
        title="HVAC Contractor Software - Heating & Cooling Business Management | BuildDesk"
        description="Complete HVAC contractor management software. Installation tracking, preventive maintenance scheduling, job costing, and technician management. 14-day free trial."
        keywords={['HVAC contractor software', 'HVAC business management', 'heating cooling software', 'HVAC job scheduling', 'HVAC service software', 'HVAC maintenance tracking']}
        canonicalUrl="/hvac-contractor-software"
      />
      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        <main className="py-12">
          <div className="container mx-auto px-4">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-6">
                HVAC Contractor Software
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                Specialized management tools for heating, ventilation, and air conditioning contractors. 
                From installation to maintenance, manage your entire HVAC operation efficiently.
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
                Why HVAC Contractors Choose BuildDesk
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-green-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Seasonal Planning</h3>
                  <p className="text-sm text-muted-foreground">
                    Plan maintenance schedules around peak heating and cooling seasons for maximum efficiency.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Equipment ROI Tracking</h3>
                  <p className="text-sm text-muted-foreground">
                    Monitor the profitability of different HVAC systems and optimize your service offerings.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Certification Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Keep track of EPA certifications, training requirements, and technician specializations.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-construction-blue text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Transform Your HVAC Business Operations
              </h2>
              <p className="text-lg mb-6 opacity-90">
                Join HVAC contractors who have increased their efficiency by 35% and customer satisfaction by 50%.
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

export default HVACContractorSoftware;
