import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { QuickAnswerSnippet, LastUpdated, QuickFacts } from "@/components/seo/QuickAnswerSnippet";
import { HowToSchema } from "@/components/seo/EnhancedSchemaMarkup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, RefreshCw, AlertCircle, CheckCircle, Settings, Clock, ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";

const QuickBooksIntegrationHub = () => {
  const integrationSteps = [
    {
      name: "Connect Your Accounts",
      text: "Link your BuildDesk account with QuickBooks using secure OAuth authentication. This creates a two-way data connection that keeps both systems synchronized automatically."
    },
    {
      name: "Map Chart of Accounts",
      text: "Configure how BuildDesk job cost categories map to your QuickBooks accounts. Set up proper expense tracking, revenue recognition, and work-in-progress reporting structures."
    },
    {
      name: "Configure Sync Settings",
      text: "Choose which data synchronizes between systems: job costs, invoices, payments, vendor bills, and customer information. Set sync frequency (real-time or scheduled) based on your needs."
    },
    {
      name: "Test with Sample Data",
      text: "Process test transactions to verify data flows correctly between systems. Check job costing accuracy, invoice creation, and payment posting before going live with real projects."
    },
    {
      name: "Train Your Team",
      text: "Educate field crews on mobile time tracking and expense entry. Train office staff on invoice processing and financial reporting workflows to maximize integration benefits."
    }
  ];

  const integrationFacts = [
    "QuickBooks integration reduces double data entry by 85%",
    "Contractors save 8-12 hours weekly on bookkeeping tasks",
    "Real-time job costing improves profit margins by 15-20%",
    "Automated invoice syncing reduces billing errors by 90%",
    "Integrated expense tracking catches 95% more deductible expenses"
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title="QuickBooks Integration Hub for Construction Contractors | BuildDesk"
        description="Complete QuickBooks integration resource center for construction contractors. Setup guides, troubleshooting, job costing integration, and automation best practices."
        keywords={[
          'QuickBooks construction integration',
          'construction accounting software',
          'QuickBooks job costing',
          'construction bookkeeping automation',
          'QuickBooks sync construction',
          'construction financial management',
          'automated construction accounting'
        ]}
        canonicalUrl="/resources/quickbooks-integration-hub"
      />
      
      <HowToSchema
        name="How to Integrate QuickBooks with Construction Management Software"
        description="Step-by-step guide to setting up seamless QuickBooks integration for construction job costing and financial management"
        steps={integrationSteps}
      />
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <BreadcrumbsNavigation />
        
        {/* Hero Section */}
        <div className="mb-12">
          <Badge className="mb-4">Financial Integration Hub</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            QuickBooks Integration Hub for Construction Contractors
          </h1>
          <LastUpdated date="September 2025" />
          <p className="text-xl text-muted-foreground max-w-4xl mb-6">
            Your complete resource center for QuickBooks integration. From initial setup to advanced troubleshooting, 
            everything you need to streamline construction accounting and eliminate double data entry.
          </p>
        </div>
        
        <QuickAnswerSnippet
          question="How does QuickBooks integration benefit construction contractors?"
          answer="QuickBooks integration eliminates 85% of double data entry, saves 8-12 hours weekly on bookkeeping, improves profit margins by 15-20% through real-time job costing, and reduces billing errors by 90%. It provides seamless sync of job costs, invoices, payments, and expenses."
        />
        
        <QuickFacts
          title="QuickBooks Integration Benefits"
          facts={integrationFacts}
        />

        {/* Integration Resources Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          
          {/* Setup Guide */}
          <Card className="h-full">
            <CardHeader>
              <Badge className="w-fit mb-2">Getting Started</Badge>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                Initial Setup Guide
              </CardTitle>
              <CardDescription>
                Step-by-step instructions for connecting BuildDesk with QuickBooks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  OAuth connection setup
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Chart of accounts mapping
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Sync configuration
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Testing procedures
                </li>
              </ul>
              <Button asChild className="w-full">
                <Link to="/resources/quickbooks-setup-guide">
                  View Setup Guide <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Job Costing Integration */}
          <Card className="h-full">
            <CardHeader>
              <Badge className="w-fit mb-2">Job Costing</Badge>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Job Costing Sync
              </CardTitle>
              <CardDescription>
                Real-time job cost tracking and profit analysis integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Labor cost tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Material expense sync
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Subcontractor billing
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Profit margin analysis
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full">
                <Link to="/resources/job-costing-integration">
                  Learn Job Costing <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Invoicing Automation */}
          <Card className="h-full">
            <CardHeader>
              <Badge className="w-fit mb-2">Billing</Badge>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-purple-600" />
                Automated Invoicing
              </CardTitle>
              <CardDescription>
                Streamlined billing processes with automatic invoice creation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Progress billing
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Change order invoicing
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Payment tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Customer statements
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full">
                <Link to="/resources/invoicing-automation">
                  Setup Invoicing <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Troubleshooting */}
          <Card className="h-full">
            <CardHeader>
              <Badge className="w-fit mb-2 bg-orange-100 text-orange-800">Support</Badge>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Troubleshooting Guide
              </CardTitle>
              <CardDescription>
                Common issues and solutions for QuickBooks integration problems
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Duplicate transaction fixes
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Sync error resolution
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Data mapping issues
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Performance optimization
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full">
                <Link to="/resources/integration-troubleshooting">
                  Get Help <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Reporting & Analytics */}
          <Card className="h-full">
            <CardHeader>
              <Badge className="w-fit mb-2 bg-purple-100 text-purple-800">Analytics</Badge>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Financial Reporting
              </CardTitle>
              <CardDescription>
                Advanced reporting and analytics with integrated QuickBooks data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Profit/loss by project
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Cash flow forecasting
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Tax preparation reports
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Performance dashboards
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full">
                <Link to="/resources/financial-reporting">
                  View Reports <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Best Practices */}
          <Card className="h-full">
            <CardHeader>
              <Badge className="w-fit mb-2 bg-green-100 text-green-800">Best Practices</Badge>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-600" />
                Optimization Guide
              </CardTitle>
              <CardDescription>
                Best practices and advanced tips for maximizing integration benefits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Data consistency standards
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Workflow optimization
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Team training procedures
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Maintenance routines
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full">
                <Link to="/resources/integration-best-practices">
                  Learn Best Practices <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ROI Calculator Section */}
        <Card className="mb-12">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Calculate Your Integration ROI</CardTitle>
            <CardDescription>
              See how much time and money you could save with QuickBooks integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">85%</div>
                <div className="text-sm text-muted-foreground">Reduction in double data entry</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">10+ hrs</div>
                <div className="text-sm text-muted-foreground">Weekly time savings</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">$13,000</div>
                <div className="text-sm text-muted-foreground">Average annual savings</div>
              </div>
            </div>
            <div className="text-center mt-8">
              <Button asChild size="lg">
                <Link to="/tools/roi-calculator">
                  Calculate Your Savings <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bottom CTA */}
        <div className="bg-primary/5 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">
            Ready to Streamline Your Construction Accounting?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            BuildDesk's seamless QuickBooks integration eliminates double data entry and provides 
            real-time financial insights that help contractors improve profit margins by 15-20%.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/auth">Start Free Trial</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/features">
                View Integration Features <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default QuickBooksIntegrationHub;