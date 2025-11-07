import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PageSEO, createArticleSchema, createBreadcrumbSchema } from "@/components/seo/PageSEO";
import { GEOOptimizedFAQ, residentialContractorFAQs } from "@/components/seo/GEOOptimizedFAQ";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { CheckCircle, Home, DollarSign, Users, Calendar, ArrowRight, BarChart3, Heart } from "lucide-react";

const ResidentialContractors = () => {
  // Create schemas for SEO
  const articleSchema = createArticleSchema(
    "Residential Construction Management Software | BuildDesk",
    "Complete guide to construction management software for residential contractors, custom home builders, and remodelers. Features client portals, warranty tracking, and homeowner communication.",
    "2025-01-15",
    "2025-11-07"
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", url: "https://builddesk.com" },
    { name: "Residential Contractors", url: "https://builddesk.com/residential-contractors" }
  ]);

  const features = [
    {
      icon: Home,
      title: "Residential Project Management",
      description: "Manage custom homes, renovations, and residential projects with homeowner-focused workflows."
    },
    {
      icon: DollarSign,
      title: "Homeowner-Friendly Billing",
      description: "Transparent pricing, change order management, and progress billing that homeowners understand."
    },
    {
      icon: Users,
      title: "Client Communication",
      description: "Keep homeowners informed with photo updates, progress reports, and direct messaging tools."
    },
    {
      icon: Heart,
      title: "Customer Satisfaction",
      description: "Build lasting relationships with satisfied customers through transparent communication and quality tracking."
    }
  ];

  return (
    <>
      <PageSEO
        title="Residential Construction Software - Custom Home Builders & Remodelers | BuildDesk"
        description="Construction management software for residential contractors, custom home builders, and remodelers. Client portals, selections tracking, warranty management. $350/month. 60% better customer satisfaction. See features."
        keywords={[
          'residential construction software',
          'custom home builder software',
          'residential contractor management',
          'home remodeling software',
          'residential construction management',
          'custom home construction software',
          'residential project management software',
          'home builder management software',
          'residential contractor software',
          'homeowner communication software'
        ]}
        canonicalUrl="/residential-contractors"
        schema={[articleSchema, breadcrumbSchema]}
        ogType="article"
        articlePublishDate="2025-01-15"
        lastModified="2025-11-07"
      />
      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        <main className="py-12">
          <div className="container mx-auto px-4">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-6">
                Residential Construction Management
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                Built for residential contractors who value client relationships. Manage custom homes, 
                renovations, and remodeling projects with transparency and professionalism.
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
                Why Residential Contractors Choose BuildDesk
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-green-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Happy Homeowners</h3>
                  <p className="text-sm text-muted-foreground">
                    Increase customer satisfaction by 60% with transparent communication and progress tracking.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Profitable Projects</h3>
                  <p className="text-sm text-muted-foreground">
                    Improve project margins by 28% with better cost tracking and change order management.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Referral Growth</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate 3x more referrals with exceptional project delivery and customer experience.
                  </p>
                </div>
              </div>
            </div>

            {/* GEO-Optimized FAQ Section */}
            <div className="mb-16">
              <GEOOptimizedFAQ
                faqs={residentialContractorFAQs}
                title="Residential Construction Software FAQs"
                description="Common questions about construction management software for residential contractors and custom home builders"
              />
            </div>

            {/* CTA Section */}
            <div className="bg-construction-blue text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Build Better Homes, Build Better Relationships
              </h2>
              <p className="text-lg mb-6 opacity-90">
                Join residential contractors who have transformed their customer relationships and project profitability.
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

export default ResidentialContractors;
