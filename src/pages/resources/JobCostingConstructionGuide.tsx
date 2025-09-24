import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { ArticleSchema, FAQSchema } from "@/components/seo/EnhancedSchemaMarkup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, AlertTriangle, DollarSign, TrendingUp, Calculator } from "lucide-react";
import { Link } from "react-router-dom";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";

const JobCostingConstructionGuide = () => {
  const faqData = [
    {
      question: "What is job costing in construction?",
      answer: "Job costing tracks all expenses (labor, materials, equipment) against each specific project to determine actual profitability. It compares estimated costs to actual costs in real-time."
    },
    {
      question: "Why do most construction companies struggle with job costing?",
      answer: "Common issues: using spreadsheets instead of software, not tracking costs in real-time, missing indirect costs like equipment usage, and poor cost code organization."
    },
    {
      question: "How often should I update job costs?",
      answer: "Daily is ideal. Weekly at minimum. Real-time job costing prevents cost overruns and allows quick project corrections when issues arise."
    },
    {
      question: "What's the biggest job costing mistake small contractors make?",
      answer: "Not including all indirect costs like equipment depreciation, insurance allocation, and administrative overhead. This leads to false profit calculations."
    }
  ];

  const commonMistakes = [
    {
      mistake: "Using spreadsheets for job costing",
      impact: "15-20% profit loss",
      solution: "Use construction-specific software with real-time tracking"
    },
    {
      mistake: "Not tracking equipment costs properly", 
      impact: "8-12% margin erosion",
      solution: "Include depreciation, fuel, maintenance in job costs"
    },
    {
      mistake: "Poor cost code organization",
      impact: "Inaccurate bidding on future jobs",
      solution: "Use industry-standard CSI divisions and consistent codes"
    },
    {
      mistake: "Missing change order tracking",
      impact: "Lost revenue on approved changes",
      solution: "Digital change order workflow with automatic cost updates"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title="Job Costing in Construction: Complete Setup Guide & Common Mistakes | BuildDesk"
        description="Master construction job costing with our step-by-step guide. Learn to track costs, improve margins, and avoid costly mistakes that hurt profitability."
        keywords={[
          'job costing construction',
          'construction job costing guide',
          'job costing software construction',
          'construction cost tracking',
          'construction project costing'
        ]}
        canonicalUrl="/resources/job-costing-construction-setup-guide"
      />
      
      <ArticleSchema
        title="Job Costing in Construction: Setup Guide & Common Mistakes"
        author="BuildDesk Team"
        datePublished="2025-01-24"
        image="https://builddesk.com/images/job-costing-guide.jpg"
        url="https://builddesk.com/resources/job-costing-construction-setup-guide"
      />
      
      <FAQSchema questions={faqData} />
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <BreadcrumbsNavigation />
        
        {/* Hero Section */}
        <div className="mb-12">
          <Badge className="mb-4">Essential Guide</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-6">
            Job Costing in Construction: Setup Guide & Common Mistakes
          </h1>
          
          {/* TL;DR Section */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-3">TL;DR - Quick Answer</h2>
            <p className="text-lg leading-relaxed">
              <strong>Job costing tracks all project expenses against revenue in real-time.</strong> 
              Essential for profitable bidding and avoiding the 23% average cost overruns that plague small contractors. 
              Use software, not spreadsheets, and track daily for best results.
            </p>
          </div>

          <div className="text-lg text-muted-foreground mb-8">
            <p>Job costing is the difference between profitable contractors and those struggling with cash flow. 
            This guide covers setup, best practices, and the costly mistakes that can sink your margins.</p>
          </div>
        </div>

        {/* Key Benefits */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Why Job Costing Matters for Small Contractors</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">15-25%</div>
                <div className="text-sm text-muted-foreground">Profit improvement with proper job costing</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Calculator className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">90%</div>
                <div className="text-sm text-muted-foreground">More accurate future bids</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <DollarSign className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">Real-time</div>
                <div className="text-sm text-muted-foreground">Project profitability visibility</div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Setup Steps */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Job Costing Setup: Step-by-Step Process</h2>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 1: Organize Your Cost Codes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Use consistent, industry-standard cost codes for every project:</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Direct Costs:</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• Labor (by trade/crew)</li>
                      <li>• Materials (by category)</li>
                      <li>• Equipment rental/usage</li>
                      <li>• Subcontractor costs</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Indirect Costs:</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• Overhead allocation</li>
                      <li>• Insurance allocation</li>
                      <li>• Equipment depreciation</li>
                      <li>• Administrative time</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 2: Set Up Real-Time Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Manual tracking fails. Use construction software that integrates with:</p>
                <div className="flex flex-wrap gap-2">
                  {["Time tracking apps", "QuickBooks", "Equipment management", "Material purchasing", "Subcontractor invoicing"].map((item, i) => (
                    <Badge key={i} variant="secondary">{item}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 3: Create Budget Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Build reusable budget templates for common project types:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span>Residential renovation (per sq ft)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span>Commercial tenant improvement (per sq ft)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span>Site work and excavation (per cu yd)</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Common Mistakes */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Costly Job Costing Mistakes to Avoid</h2>
          <div className="space-y-4">
            {commonMistakes.map((mistake, index) => (
              <Card key={index} className="border-orange-200">
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-3 gap-4 items-start">
                    <div>
                      <div className="flex items-start gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <h4 className="font-semibold text-orange-800">{mistake.mistake}</h4>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Financial Impact:</div>
                      <div className="font-medium text-red-600">{mistake.impact}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Solution:</div>
                      <div className="text-sm">{mistake.solution}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Real Example */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Real Example: Job Costing Success Story</h2>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Company:</h4>
                  <p className="text-muted-foreground">Summit Contractors (12 employees, residential/commercial)</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Before BuildDesk:</h4>
                  <p className="text-muted-foreground">Using spreadsheets, 23% cost overruns, bidding based on guesswork</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">After 6 months:</h4>
                  <p className="text-muted-foreground"><strong>18% profit increase</strong>, accurate real-time costs, confident bidding</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Job Costing FAQ</h2>
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

        {/* Internal Links */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Related Resources</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <Link to="/resources/best-construction-management-software-small-business-2025" className="font-medium hover:text-primary">
                  Best Construction Software Guide →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">Choose the right software for job costing</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Link to="/job-costing-software" className="font-medium hover:text-primary">
                  Job Costing Software Features →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">See BuildDesk's job costing tools</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Link to="/resources/procore-vs-builddesk-small-contractors" className="font-medium hover:text-primary">
                  Procore vs BuildDesk →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">Compare job costing features</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <div className="bg-primary/5 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">
            Ready to Master Job Costing?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Stop guessing at project profitability. BuildDesk's real-time job costing 
            helps small contractors improve margins by 15-25% in the first year.
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

export default JobCostingConstructionGuide;