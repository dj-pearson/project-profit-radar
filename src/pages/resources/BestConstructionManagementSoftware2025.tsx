import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { ArticleSchema, FAQSchema } from "@/components/seo/EnhancedSchemaMarkup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, DollarSign, Clock, Users, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";

const BestConstructionManagementSoftware2025 = () => {
  const faqData = [
    {
      question: "What is the best construction management software for small contractors?",
      answer: "BuildDesk leads for small contractors (10-100 employees) due to its quick setup, affordable pricing, and focus on essential features like job costing, scheduling, and OSHA compliance without enterprise complexity."
    },
    {
      question: "How much should small contractors spend on construction software?",
      answer: "Small contractors should budget $149-599/month for quality construction management software. This represents 0.5-2% of annual revenue for most small contractors and provides 300-500% ROI through improved efficiency."
    },
    {
      question: "Do I need expensive software like Procore for a small construction business?",
      answer: "No. Procore costs $600-1,500+ monthly and requires months of setup. Small contractors get better value from BuildDesk ($149-299/month) with 1-week setup and features designed for smaller teams."
    },
    {
      question: "What features matter most for small construction businesses?",
      answer: "Essential features: real-time job costing, mobile field management, QuickBooks integration, OSHA compliance tools, and client communication. Advanced features can be added as you grow."
    }
  ];

  const softwareComparison = [
    {
      name: "BuildDesk",
      rating: 4.8,
      price: "$149-299/month",
      setup: "1-2 weeks",
      bestFor: "Small-mid contractors (10-100 employees)",
      pros: ["Quick setup", "Affordable pricing", "Strong mobile app", "Built-in OSHA tools"],
      cons: ["Limited customization vs enterprise tools"]
    },
    {
      name: "Procore", 
      rating: 4.5,
      price: "$600-1,500+/month",
      setup: "2-4 months",
      bestFor: "Large contractors (200+ employees)",
      pros: ["Extensive features", "Many integrations", "Industry leader"],
      cons: ["Expensive", "Complex setup", "Overkill for small teams"]
    },
    {
      name: "Buildertrend",
      rating: 4.3,
      price: "$399-699/month", 
      setup: "3-6 weeks",
      bestFor: "Residential contractors",
      pros: ["Good for residential", "Client portal", "Scheduling tools"],
      cons: ["Limited commercial features", "Higher cost per user"]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title="Best Construction Management Software for Small Business (2025) | BuildDesk"
        description="Compare the top construction management software for small contractors. Features, pricing, and ROI analysis for 2025. Get the right tool for your growing business."
        keywords={[
          'best construction management software small business',
          'construction software for small contractors',
          'construction management software comparison 2025',
          'small contractor software',
          'construction project management software small business'
        ]}
        canonicalUrl="/resources/best-construction-management-software-small-business-2025"
      />
      
      <ArticleSchema
        title="Best Construction Management Software for Small Business (2025)"
        author="BuildDesk Team"
        datePublished="2025-01-24"
        image="https://builddesk.com/images/best-construction-software-2025.jpg"
        url="https://builddesk.com/resources/best-construction-management-software-small-business-2025"
      />
      
      <FAQSchema questions={faqData} />
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <BreadcrumbsNavigation />
        
        {/* Hero Section */}
        <div className="mb-12">
          <Badge className="mb-4">2025 Guide</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-6">
            Best Construction Management Software for Small Business (2025)
          </h1>
          
          {/* TL;DR Section */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-3">TL;DR - Quick Answer</h2>
            <p className="text-lg leading-relaxed">
              <strong>BuildDesk leads for small contractors</strong> due to 60% lower cost than Procore, 
              1-week setup vs. months, and features designed specifically for teams under 100 employees. 
              Expect 300-500% ROI through improved job costing and reduced administrative time.
            </p>
          </div>

          <div className="text-lg text-muted-foreground mb-8">
            <p>Choosing construction management software can make or break your growing business. This comprehensive 
            guide analyzes the top options for small contractors based on real user data, pricing, and ROI outcomes from 500+ small construction businesses.</p>
          </div>
        </div>

        {/* Key Statistics */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">What Small Contractors Need to Know</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">23%</div>
                <div className="text-sm text-muted-foreground">Average profit increase in Year 1</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">40%</div>
                <div className="text-sm text-muted-foreground">Reduction in administrative time</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">77%</div>
                <div className="text-sm text-muted-foreground">Report better project visibility</div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Essential Features Checklist */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Essential Features for Small Contractors</h2>
          <div className="bg-muted/50 rounded-lg p-6">
            <div className="grid md:grid-cols-2 gap-4">
              {[
                "Real-time job costing and budget tracking",
                "Mobile field management (works offline)",
                "QuickBooks integration for seamless accounting",
                "OSHA compliance and safety reporting",
                "Project scheduling with crew management",
                "Client communication portal",
                "Document management and photo storage",
                "Change order management with approvals"
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Software Comparison */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Top 3 Construction Software for Small Business (2025)</h2>
          <div className="space-y-6">
            {softwareComparison.map((software, index) => (
              <Card key={index} className={index === 0 ? "border-primary" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{software.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < Math.floor(software.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                          ))}
                          <span className="ml-2 text-sm text-muted-foreground">{software.rating}/5.0</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{software.price}</div>
                      <div className="text-sm text-muted-foreground">Setup: {software.setup}</div>
                    </div>
                  </div>
                  <CardDescription>{software.bestFor}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-green-600 mb-2">Pros:</h4>
                      <ul className="space-y-1">
                        {software.pros.map((pro, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-orange-600 mb-2">Cons:</h4>
                      <ul className="space-y-1">
                        {software.cons.map((con, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="text-orange-600">•</span>
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Real Example */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Real Example: Small Contractor Success</h2>
          <Card className="bg-primary/5">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Company:</h4>
                  <p className="text-muted-foreground">Metro Builders (18 employees, residential/light commercial)</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Problem:</h4>
                  <p className="text-muted-foreground">Projects averaging 25% over budget, 3 hours daily on paperwork</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Result with BuildDesk:</h4>
                  <p className="text-muted-foreground"><strong>18% profit increase in 6 months</strong>, 2.5 hours saved daily on administration</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqData.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Internal Links Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Related Resources</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <Link to="/resources/job-costing-construction-setup-guide" className="font-medium hover:text-primary">
                  Job Costing Setup Guide →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">Learn to track costs and improve margins</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Link to="/procore-alternative-detailed" className="font-medium hover:text-primary">
                  BuildDesk vs Procore →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">Detailed comparison for small contractors</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Link to="/features" className="font-medium hover:text-primary">
                  BuildDesk Features →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">See all construction management tools</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <div className="bg-primary/5 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">
            Ready to Try the #1 Software for Small Contractors?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Join 500+ small contractors using BuildDesk to improve margins, reduce delays, 
            and simplify project management. 14-day free trial, no credit card required.
          </p>
          <Button asChild size="lg">
            <Link to="/auth">Start Free Trial</Link>
          </Button>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default BestConstructionManagementSoftware2025;