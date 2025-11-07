import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PageSEO, createArticleSchema, createBreadcrumbSchema } from "@/components/seo/PageSEO";
import { GEOOptimizedFAQ } from "@/components/seo/GEOOptimizedFAQ";
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

  const plumbingFAQs = [
    {
      question: "What is plumbing contractor software?",
      answer: "Plumbing contractor software is specialized business management software for plumbing companies. It handles service call dispatch, emergency plumbing requests, preventive maintenance scheduling, plumbing installation projects, technician scheduling and GPS tracking, plumbing material inventory, job costing for plumbing work, and customer communication. BuildDesk includes all plumbing features at $350/month.",
      category: "Definition"
    },
    {
      question: "How does plumbing software help with emergency calls?",
      answer: "Plumbing software improves emergency response with GPS-enabled technician dispatch showing nearest available plumber, priority routing for urgent calls (burst pipes, sewer backups), automated customer notifications with ETA updates, mobile access for technicians to receive emergency details, and real-time job status tracking. BuildDesk reduces emergency response time by 40% with intelligent dispatch.",
      category: "Features"
    },
    {
      question: "Can plumbing contractor software track service history?",
      answer: "Yes, plumbing contractor software tracks complete customer service history including past plumbing repairs and installations, equipment service records (water heaters, sump pumps, etc.), warranty information and expiration dates, recurring maintenance schedules, customer preferences and notes, and invoice and payment history. BuildDesk provides instant access to customer history for better service.",
      category: "Service History"
    },
    {
      question: "Does plumbing software help manage plumber licenses?",
      answer: "Yes, plumbing contractor software tracks master plumber licenses and certifications, journeyman plumber licenses, apprentice plumber training hours, backflow prevention certifications, medical gas certifications, license renewal dates with automated reminders, and continuing education requirements. BuildDesk ensures your plumbing crew maintains proper licensing and compliance.",
      category: "Licensing"
    }
  ];

  const articleSchema = createArticleSchema(
    "Plumbing Contractor Software - Complete Service Call & Job Management",
    "Specialized plumbing contractor management software for service calls, emergency dispatch, installations, and maintenance. GPS dispatch, job costing, and technician management for plumbing businesses.",
    "https://build-desk.com/plumbing-contractor-software",
    ["plumbing contractor software", "plumbing business management", "plumbing service software"]
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", url: "https://build-desk.com" },
    { name: "Solutions", url: "https://build-desk.com/solutions" },
    { name: "Plumbing Contractor Software", url: "https://build-desk.com/plumbing-contractor-software" }
  ]);

  return (
    <>
      <PageSEO
        title="Plumbing Contractor Software - Service Call Dispatch & Job Costing | BuildDesk"
        description="Plumbing contractor management software for service calls, emergency dispatch, and installations. GPS technician tracking, job costing, plumber license management, customer service history. $350/month vs $500+ competitors. 40% faster emergency response. Free trial."
        keywords={[
          'plumbing contractor software',
          'plumbing business management',
          'plumbing job scheduling',
          'plumbing service software',
          'plumbing dispatch software',
          'plumber management system',
          'plumbing service call software',
          'plumbing job costing'
        ]}
        canonicalUrl="https://build-desk.com/plumbing-contractor-software"
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

            {/* GEO-Optimized FAQ Section */}
            <div className="mt-16">
              <GEOOptimizedFAQ
                faqs={plumbingFAQs}
                title="Plumbing Contractor Software FAQs"
                description="Get answers about plumbing contractor management software and service call features"
              />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default PlumbingContractorSoftware;
