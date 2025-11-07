import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PageSEO, createArticleSchema, createBreadcrumbSchema } from "@/components/seo/PageSEO";
import { GEOOptimizedFAQ } from "@/components/seo/GEOOptimizedFAQ";
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

  const electricalFAQs = [
    {
      question: "What is electrical contractor software?",
      answer: "Electrical contractor software is specialized construction management software designed for electrical contractors. It manages electrical projects (residential, commercial, industrial), tracks material costs (wire, conduit, fixtures, panels), monitors electrician licenses and certifications, ensures NEC code compliance, schedules electrical crews, and provides job costing specific to electrical work. BuildDesk includes all electrical features at $350/month.",
      category: "Definition"
    },
    {
      question: "How does electrical contractor software track material costs?",
      answer: "Electrical contractor software tracks specific electrical materials including wire/cable by gauge and type, conduit and fittings, electrical panels and breakers, switches and outlets, lighting fixtures, and specialized electrical equipment. BuildDesk provides real-time material cost tracking, inventory management, vendor pricing comparison, and automatic job costing for accurate electrical project profitability.",
      category: "Features"
    },
    {
      question: "Can electrical contractor software manage electrician licenses?",
      answer: "Yes, electrical contractor software tracks master electrician licenses, journeyman electrician licenses, apprentice electrician hours and training, specialized electrical certifications (low voltage, solar, industrial), license renewal dates with automated reminders, and continuing education requirements. BuildDesk ensures your electrical crew maintains proper licensing and compliance.",
      category: "Licensing"
    },
    {
      question: "Does electrical contractor software help with code compliance?",
      answer: "Yes, electrical contractor software includes NEC (National Electrical Code) compliance checklists, electrical inspection preparation and documentation, code violation tracking and resolution, electrical safety protocols and procedures, and permit management for electrical work. BuildDesk helps electrical contractors pass inspections consistently and maintain code compliance on all projects.",
      category: "Compliance"
    }
  ];

  const articleSchema = createArticleSchema(
    "Electrical Contractor Software - Complete Management for Electrical Businesses",
    "Comprehensive electrical contractor management software for residential, commercial, and industrial electrical projects. Project management, safety compliance, job costing, and electrician license tracking.",
    "https://build-desk.com/electrical-contractor-software",
    ["electrical contractor software", "electrical business management", "electrical project management"]
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", url: "https://build-desk.com" },
    { name: "Solutions", url: "https://build-desk.com/solutions" },
    { name: "Electrical Contractor Software", url: "https://build-desk.com/electrical-contractor-software" }
  ]);

  return (
    <>
      <PageSEO
        title="Electrical Contractor Software - Job Costing, Code Compliance & License Tracking | BuildDesk"
        description="Electrical contractor management software for residential, commercial, and industrial electricians. Track wire/material costs, manage electrician licenses, NEC code compliance, electrical project scheduling. $350/month vs $500+ competitors. 45% fewer delays. Free trial."
        keywords={[
          'electrical contractor software',
          'electrical business management',
          'electrical project management',
          'electrician scheduling software',
          'electrical safety compliance',
          'electrical job costing software',
          'electrician license tracking',
          'NEC compliance software'
        ]}
        canonicalUrl="https://build-desk.com/electrical-contractor-software"
        schema={[articleSchema, breadcrumbSchema]}
        ogType="article"
        lastModified="2025-11-07"
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

            {/* GEO-Optimized FAQ Section */}
            <div className="mt-16">
              <GEOOptimizedFAQ
                faqs={electricalFAQs}
                title="Electrical Contractor Software FAQs"
                description="Get answers about electrical contractor management software and features"
              />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ElectricalContractorSoftware;
