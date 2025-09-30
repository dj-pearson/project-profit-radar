import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { QuickAnswerSnippet, LastUpdated, QuickFacts } from "@/components/seo/QuickAnswerSnippet";
import { HowToSchema } from "@/components/seo/EnhancedSchemaMarkup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, AlertTriangle, Clock, CheckCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";

const ConstructionBudgetingGuide = () => {
  const budgetingSteps = [
    {
      name: "Project Scope Analysis",
      text: "Break down the project into detailed work packages. Include materials, labor, equipment, and subcontractor costs for each phase."
    },
    {
      name: "Historical Data Review",
      text: "Analyze similar past projects to establish baseline costs and identify potential cost drivers or savings opportunities."
    },
    {
      name: "Market Research",
      text: "Get current material prices, labor rates, and subcontractor quotes. Account for seasonal fluctuations and supply chain factors."
    },
    {
      name: "Contingency Planning",
      text: "Add 10-15% contingency for residential projects, 15-20% for commercial. Include separate allowances for weather delays and change orders."
    },
    {
      name: "Regular Monitoring",
      text: "Track actual costs weekly against budget. Use construction management software to identify variances early and adjust proactively."
    }
  ];

  const budgetingFacts = [
    "70% of construction projects exceed their original budget",
    "Poor budgeting is the #1 cause of contractor business failure",
    "Real-time job costing can reduce budget overruns by 40%",
    "Change orders account for 15-25% of project cost increases",
    "Contractors using digital budgeting tools improve profit margins by 18%"
  ];

  const commonMistakes = [
    {
      mistake: "Underestimating Labor Costs",
      solution: "Track actual labor hours on similar projects. Include productivity factors and learning curves for new crew members.",
      impact: "Can cause 20-30% budget overruns"
    },
    {
      mistake: "Ignoring Indirect Costs",
      solution: "Include permits, insurance, utilities, site preparation, and administrative overhead in every budget.",
      impact: "Often forgotten costs representing 10-15% of total budget"
    },
    {
      mistake: "Static Material Pricing",
      solution: "Update material costs regularly and lock in prices with suppliers when possible. Build in inflation allowances.",
      impact: "Material price volatility can add 5-20% to project costs"
    },
    {
      mistake: "No Contingency Buffer",
      solution: "Always include contingency funds. Use historical data to determine appropriate percentages for different project types.",
      impact: "Unexpected costs with no buffer lead to project losses"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title="Construction Budgeting Guide: Cost Control for Small Contractors | BuildDesk"
        description="Complete construction budgeting guide for small contractors. Learn job costing, cost control, change order management, and profit margin improvement strategies."
        keywords={[
          'construction budgeting guide',
          'construction job costing',
          'construction cost control',
          'construction project budgeting',
          'contractor budgeting best practices',
          'construction budget template',
          'construction cost tracking'
        ]}
        canonicalUrl="/resources/construction-budgeting-guide"
      />
      
      <HowToSchema
        name="How to Create a Construction Project Budget"
        description="Step-by-step guide to creating accurate construction budgets that prevent cost overruns"
        steps={budgetingSteps}
      />
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <BreadcrumbsNavigation />
        
        {/* Hero Section */}
        <div className="mb-12">
          <Badge className="mb-4">Construction Management Guide</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Construction Budgeting Guide: Master Cost Control in 2025
          </h1>
          <LastUpdated date="September 2025" />
          <p className="text-xl text-muted-foreground max-w-4xl mb-6">
            Learn how successful contractors create accurate budgets, control costs, and protect profit margins. 
            Includes templates, checklists, and real-world examples from small contractor case studies.
          </p>
        </div>
        
        <QuickAnswerSnippet
          question="How do construction contractors create accurate project budgets?"
          answer="Successful contractors use detailed scope analysis, historical data review, current market pricing, 15-20% contingency planning, and weekly cost tracking with construction management software. This systematic approach prevents the 70% of projects that exceed budgets."
        />
        
        <QuickFacts
          title="Construction Budgeting Statistics"
          facts={budgetingFacts}
        />

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2 space-y-8">
            
            {/* Why Budgeting Matters */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">Why Construction Budgeting Is Critical</h2>
              <div className="prose max-w-none">
                <p className="text-muted-foreground mb-4">
                  Construction budgeting isn't just about estimating costs—it's about business survival. With material costs fluctuating 
                  20-40% annually and labor shortages driving up wages, contractors need bulletproof budgeting processes to stay profitable.
                </p>
                <p className="text-muted-foreground mb-6">
                  The consequences of poor budgeting are severe: cash flow problems, client disputes, reduced profitability, 
                  and in worst cases, business closure. But contractors who master budgeting see average profit margin 
                  improvements of 15-25%.
                </p>
              </div>
            </section>

            {/* Step-by-Step Process */}
            <section>
              <h2 className="text-2xl font-semibold mb-6">5-Step Construction Budgeting Process</h2>
              <div className="space-y-6">
                {budgetingSteps.map((step, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold">
                          {index + 1}
                        </div>
                        <CardTitle className="text-lg">{step.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{step.text}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Common Budgeting Mistakes */}
            <section>
              <h2 className="text-2xl font-semibold mb-6">4 Costly Budgeting Mistakes to Avoid</h2>
              <div className="space-y-6">
                {commonMistakes.map((item, index) => (
                  <Card key={index} className="border-red-200">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <CardTitle className="text-lg text-red-800">{item.mistake}</CardTitle>
                      </div>
                      <Badge variant="destructive" className="w-fit">{item.impact}</Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-3">
                        <strong>Solution:</strong> {item.solution}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Technology Solutions */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">Construction Budgeting Software Solutions</h2>
              <div className="prose max-w-none text-muted-foreground">
                <p className="mb-4">
                  Modern construction management software transforms budgeting from a static spreadsheet exercise 
                  into a dynamic, real-time process. Key features to look for include:
                </p>
                <ul className="list-disc pl-6 space-y-2 mb-6">
                  <li>Real-time job costing with mobile time tracking</li>
                  <li>Integration with accounting software (QuickBooks, etc.)</li>
                  <li>Change order management with automatic budget updates</li>
                  <li>Material cost tracking and vendor price management</li>
                  <li>Profit margin analysis and forecasting tools</li>
                  <li>Historical project data for better future estimates</li>
                </ul>
                <p>
                  Contractors using digital budgeting tools report 40% fewer cost overruns and 18% improved profit margins 
                  compared to those relying on spreadsheets alone.
                </p>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Tools */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Budgeting Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild variant="outline" className="w-full">
                  <Link to="/tools/budget-calculator">
                    Budget Calculator <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/templates/budget-template">
                    Budget Template <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/resources/cost-tracking-checklist">
                    Cost Tracking Checklist <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Related Resources */}
            <Card>
              <CardHeader>
                <CardTitle>Related Guides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/resources/job-costing-guide" className="block p-3 border rounded hover:bg-muted transition-colors">
                  <h4 className="font-medium">Job Costing Best Practices</h4>
                  <p className="text-sm text-muted-foreground">Track project costs accurately</p>
                </Link>
                <Link to="/resources/change-order-management" className="block p-3 border rounded hover:bg-muted transition-colors">
                  <h4 className="font-medium">Change Order Management</h4>
                  <p className="text-sm text-muted-foreground">Handle scope changes profitably</p>
                </Link>
                <Link to="/resources/cash-flow-management" className="block p-3 border rounded hover:bg-muted transition-colors">
                  <h4 className="font-medium">Cash Flow Management</h4>
                  <p className="text-sm text-muted-foreground">Maintain healthy project finances</p>
                </Link>
              </CardContent>
            </Card>

            {/* CTA */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Ready to Improve Your Budgeting?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  See how BuildDesk's real-time job costing helps contractors stay on budget.
                </p>
                <Button asChild className="w-full">
                  <Link to="/auth">Start Free Trial</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="bg-primary/5 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">
            Master Construction Budgeting with BuildDesk
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Stop losing money on projects. BuildDesk's real-time job costing and budget tracking 
            help small contractors improve profit margins by an average of 18%.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/auth">Start Free Trial</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/features">
                View Features <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ConstructionBudgetingGuide;