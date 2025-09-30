import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { QuickAnswerSnippet, LastUpdated } from "@/components/seo/QuickAnswerSnippet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, Building, Wrench, Users, ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";

const Solutions = () => {
  const solutions = [
    {
      icon: <Home className="h-8 w-8 text-blue-600" />,
      title: "Residential Contractors",
      description: "Perfect for home builders, remodelers, and custom home contractors managing 5-50 projects annually.",
      features: [
        "Homeowner communication portal",
        "Change order management",
        "Photo documentation",
        "Permit tracking",
        "Subcontractor coordination"
      ],
      caseStudy: "ABC Custom Homes reduced project delays by 30% and improved client satisfaction scores by 40%.",
      slug: "residential-contractors"
    },
    {
      icon: <Building className="h-8 w-8 text-green-600" />,
      title: "Commercial Contractors", 
      description: "Streamlined tools for office fit-outs, retail construction, and light commercial projects.",
      features: [
        "Multi-phase project tracking",
        "Compliance documentation",
        "Resource scheduling",
        "Budget vs actual reporting",
        "Team collaboration tools"
      ],
      caseStudy: "Metro Build Group improved profit margins by 18% using real-time job costing.",
      slug: "commercial-contractors"
    },
    {
      icon: <Wrench className="h-8 w-8 text-orange-600" />,
      title: "Specialty Trade Contractors",
      description: "Built for electrical, plumbing, HVAC, and other specialty trades managing multiple concurrent jobs.",
      features: [
        "Trade-specific templates",
        "Material cost tracking",
        "Crew scheduling",
        "Service call management",
        "Equipment tracking"
      ],
      caseStudy: "Elite Electric increased crew utilization by 25% with better scheduling tools.",
      slug: "specialty-contractors"
    },
    {
      icon: <Users className="h-8 w-8 text-purple-600" />,
      title: "Small General Contractors",
      description: "Complete project management for GCs with 10-50 employees managing diverse project types.",
      features: [
        "Project pipeline management",
        "Subcontractor management",
        "Financial reporting",
        "Safety compliance",
        "Document management"
      ],
      caseStudy: "Reliable Construction reduced administrative time by 40% and improved cash flow.",
      slug: "small-general-contractors"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title="Construction Management Solutions by Contractor Type | BuildDesk"
        description="Specialized construction management solutions for residential contractors, commercial builders, specialty trades, and small GCs. See how BuildDesk fits your business."
        keywords={[
          'construction management solutions',
          'residential contractor software',
          'commercial contractor software', 
          'specialty trade contractor software',
          'small general contractor software',
          'construction project management by industry'
        ]}
        canonicalUrl="/solutions"
      />
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <BreadcrumbsNavigation />
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Construction Management Solutions by Industry
          </h1>
          <LastUpdated date="September 2025" />
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
            Specialized tools and workflows designed for different types of contractors. 
            Find the solution that fits your specific business needs.
          </p>
        </div>
        
        <QuickAnswerSnippet
          question="What construction management solution is best for my contractor type?"
          answer="BuildDesk offers specialized workflows for residential contractors (homeowner portals, change orders), commercial contractors (multi-phase tracking, compliance), specialty trades (service calls, material tracking), and small GCs (subcontractor management, financial reporting)."
        />

        {/* Solutions Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {solutions.map((solution, index) => (
            <Card key={index} className="h-full flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  {solution.icon}
                  <Badge variant="secondary">{solution.slug.replace('-', ' ')}</Badge>
                </div>
                <CardTitle className="text-xl">{solution.title}</CardTitle>
                <CardDescription className="text-base">
                  {solution.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="mb-6">
                  <h4 className="font-semibold mb-3">Key Features:</h4>
                  <ul className="space-y-2">
                    {solution.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-primary/5 rounded-lg p-4 mb-6">
                  <h5 className="font-medium text-sm mb-2">Success Story:</h5>
                  <p className="text-sm text-muted-foreground italic">"{solution.caseStudy}"</p>
                </div>

                <div className="mt-auto">
                  <Button asChild className="w-full">
                    <Link to={`/solutions/${solution.slug}`}>
                      Learn More <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Common Benefits Section */}
        <section className="bg-muted/50 rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-semibold text-center mb-8">
            Benefits Across All Industries
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Faster Setup</h3>
              <p className="text-sm text-muted-foreground">
                Get productive in 1-2 weeks, not months. Industry-specific templates included.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Better Margins</h3>
              <p className="text-sm text-muted-foreground">
                Real-time job costing and expense tracking improve project profitability.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Mobile First</h3>
              <p className="text-sm text-muted-foreground">
                Full-featured mobile apps keep field teams connected and productive.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <div className="bg-primary/5 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">
            Ready to See BuildDesk in Action?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Schedule a personalized demo to see how BuildDesk works for your specific 
            type of construction business. No generic presentations – just your workflows.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/auth">Start Free Trial</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/pricing">
                View Pricing <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Solutions;