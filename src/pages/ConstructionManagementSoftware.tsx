import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { CheckCircle, Building2, DollarSign, Users, Calendar, ArrowRight, BarChart3 } from "lucide-react";

const ConstructionManagementSoftware = () => {
  const features = [
    {
      icon: Building2,
      title: "Project Management",
      description: "Manage multiple construction projects from planning to completion with integrated scheduling and resource allocation."
    },
    {
      icon: DollarSign,
      title: "Financial Management",
      description: "Complete job costing, budget tracking, invoicing, and financial reporting tailored for construction businesses."
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Keep your office staff, field crews, and subcontractors aligned with real-time communication tools."
    },
    {
      icon: Calendar,
      title: "Scheduling & Dispatch",
      description: "Optimize crew schedules, equipment allocation, and project timelines with intelligent scheduling tools."
    }
  ];

  return (
    <>
      <SEOMetaTags
        title="Construction Management Software - Complete Project Control | BuildDesk"
        description="Comprehensive construction management software for contractors. Project management, job costing, scheduling, team collaboration, and financial tracking in one platform."
        keywords={['construction management software', 'construction project management', 'contractor management system', 'construction business software', 'project management tools', 'construction scheduling software']}
        canonicalUrl="/construction-management-software"
      />
      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        <main className="py-12">
          <div className="container mx-auto px-4">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-6">
                Construction Management Software
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                The complete construction management platform designed for small to medium contractors. 
                Manage projects, finances, teams, and compliance from one powerful dashboard.
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
                Why Choose BuildDesk for Construction Management
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-green-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">All-in-One Platform</h3>
                  <p className="text-sm text-muted-foreground">
                    Replace multiple tools with one integrated platform that covers every aspect of construction management.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Increase Efficiency</h3>
                  <p className="text-sm text-muted-foreground">
                    Reduce administrative overhead by 40% with automated workflows and streamlined processes.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Boost Profitability</h3>
                  <p className="text-sm text-muted-foreground">
                    Increase project margins by 23% with better cost control and resource optimization.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-construction-blue text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Ready to Transform Your Construction Management?
              </h2>
              <p className="text-lg mb-6 opacity-90">
                Join 500+ contractors who have streamlined their operations and increased profitability with BuildDesk.
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

export default JobCostingSoftware;
