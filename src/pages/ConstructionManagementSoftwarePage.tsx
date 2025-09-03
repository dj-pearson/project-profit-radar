import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { CheckCircle, Building2, DollarSign, Users, Calendar, ArrowRight, BarChart3, Shield } from "lucide-react";

const ConstructionManagementSoftwarePage = () => {
  const features = [
    {
      icon: Building2,
      title: "Complete Project Control",
      description: "Manage every aspect of your construction projects from initial planning through final closeout and warranty."
    },
    {
      icon: DollarSign,
      title: "Integrated Financial Management",
      description: "Job costing, budget tracking, invoicing, and financial reporting designed specifically for construction."
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Keep office staff, field crews, subcontractors, and clients connected with real-time updates."
    },
    {
      icon: Calendar,
      title: "Advanced Scheduling",
      description: "Optimize resource allocation, crew scheduling, and project timelines with intelligent planning tools."
    },
    {
      icon: Shield,
      title: "Safety & Compliance",
      description: "Built-in OSHA compliance tools, safety checklists, and incident reporting to protect your business."
    },
    {
      icon: BarChart3,
      title: "Business Intelligence",
      description: "Make data-driven decisions with comprehensive analytics and performance dashboards."
    }
  ];

  return (
    <>
      <SEOMetaTags
        title="Construction Management Software - Complete Business Solution | BuildDesk"
        description="All-in-one construction management software for contractors. Project management, job costing, scheduling, safety compliance, and team collaboration in one platform."
        keywords={['construction management software', 'construction project management software', 'contractor business software', 'construction ERP', 'construction platform', 'contractor management system']}
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
                The complete business management platform built specifically for construction contractors. 
                Streamline operations, increase profitability, and grow your business with confidence.
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {features.map((feature, index) => (
                <Card key={index} className="border-construction-blue/20 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-construction-blue/10 rounded-lg">
                        <feature.icon className="h-6 w-6 text-construction-blue" />
                      </div>
                      <CardTitle className="text-construction-dark text-lg">{feature.title}</CardTitle>
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
                Transform Your Construction Business
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-green-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Reduce Project Delays</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete projects 15% faster with better planning, communication, and resource management.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Increase Profitability</h3>
                  <p className="text-sm text-muted-foreground">
                    Boost project margins by 23% with real-time cost tracking and variance alerts.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Improve Team Productivity</h3>
                  <p className="text-sm text-muted-foreground">
                    Eliminate paperwork and reduce administrative tasks by 40% with digital workflows.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-construction-blue text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Ready to Modernize Your Construction Management?
              </h2>
              <p className="text-lg mb-6 opacity-90">
                Join the growing number of contractors who have transformed their business operations with BuildDesk.
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

export default ConstructionManagementSoftwarePage;
