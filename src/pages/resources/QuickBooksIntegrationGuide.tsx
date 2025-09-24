import React from 'react';
import { SEOMetaTags } from '../../components/SEOMetaTags';
import { HowToSchema } from '../../components/seo/HowToSchema';
import { BreadcrumbsNavigation } from '../../components/BreadcrumbsNavigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { CheckCircle2, DollarSign, FileText, Settings, Zap, Clock } from 'lucide-react';

const QuickBooksIntegrationGuide = () => {
  const howToSteps = [
    {
      name: "Install BuildDesk Integration",
      text: "Navigate to your BuildDesk dashboard and click on 'Integrations' in the settings menu. Select QuickBooks and click 'Connect Account'."
    },
    {
      name: "Authorize QuickBooks Access", 
      text: "You'll be redirected to QuickBooks where you'll log in and authorize BuildDesk to access your accounting data. This creates a secure connection."
    },
    {
      name: "Map Chart of Accounts",
      text: "Configure how your construction cost codes map to your QuickBooks chart of accounts. BuildDesk provides intelligent suggestions based on your account structure."
    },
    {
      name: "Configure Sync Settings",
      text: "Set up automatic sync preferences for invoices, expenses, and job costs. Choose real-time or scheduled sync based on your workflow needs."
    },
    {
      name: "Test Integration",
      text: "Create a test project and invoice to verify data flows correctly between BuildDesk and QuickBooks. Check that costs appear in the right accounts."
    },
    {
      name: "Train Your Team",
      text: "Ensure your team understands the new workflow. BuildDesk data now automatically appears in QuickBooks, eliminating double entry."
    }
  ];

  const benefits = [
    {
      icon: <DollarSign className="h-6 w-6 text-primary" />,
      title: "Eliminate Double Entry",
      description: "Job costs, invoices, and expenses automatically sync between systems"
    },
    {
      icon: <Clock className="h-6 w-6 text-primary" />,
      title: "Real-Time Financial Data",
      description: "See up-to-date project profitability in both platforms instantly"
    },
    {
      icon: <FileText className="h-6 w-6 text-primary" />,
      title: "Accurate Reporting",
      description: "Generate precise financial reports with synchronized construction data"
    },
    {
      icon: <Settings className="h-6 w-6 text-primary" />,
      title: "Flexible Mapping",
      description: "Map construction cost codes to any QuickBooks account structure"
    },
    {
      icon: <Zap className="h-6 w-6 text-primary" />,
      title: "Automated Workflows",
      description: "Set up rules for automatic categorization and account assignment"
    },
    {
      icon: <CheckCircle2 className="h-6 w-6 text-primary" />,
      title: "Data Validation",
      description: "Built-in checks ensure data integrity across both systems"
    }
  ];

  const troubleshooting = [
    {
      issue: "Sync Not Working",
      solution: "Check your QuickBooks connection status in BuildDesk settings. Re-authorize if needed."
    },
    {
      issue: "Wrong Account Mapping",
      solution: "Review your chart of accounts mapping in the integration settings and update as needed."
    },
    {
      issue: "Missing Transactions",
      solution: "Verify sync settings are configured for the transaction types you want to sync."
    },
    {
      issue: "Duplicate Entries",
      solution: "Check that you haven't manually entered transactions that are set to auto-sync."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title="QuickBooks Integration Guide for Construction Companies | BuildDesk"
        description="Step-by-step guide to integrate QuickBooks with construction management software. Eliminate double entry, sync job costs automatically, and streamline your accounting workflow."
        keywords={[
          'quickbooks construction integration',
          'construction accounting software',
          'job cost accounting',
          'quickbooks sync',
          'construction financial management',
          'automated bookkeeping',
          'construction cost tracking',
          'quickbooks for contractors'
        ]}
        canonicalUrl="https://builddesk.com/resources/quickbooks-integration-guide"
      />
      
      <HowToSchema
        name="How to Integrate QuickBooks with Construction Management Software"
        description="Complete guide to connecting QuickBooks with BuildDesk for automated construction accounting and job cost tracking."
        totalTime="PT30M"
        estimatedCost={{
          currency: "USD",
          value: "0"
        }}
        supply={["QuickBooks Account", "BuildDesk Account", "Internet Connection"]}
        tool={["Computer", "Web Browser"]}
        steps={howToSteps}
        url="https://builddesk.com/resources/quickbooks-integration-guide"
      />

      <div className="container mx-auto px-4 py-8">
        <BreadcrumbsNavigation />
        
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Badge variant="secondary" className="mb-4">Integration Guide</Badge>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              QuickBooks Integration Guide for Construction Companies
            </h1>
            <p className="text-xl text-muted-foreground">
              Connect BuildDesk with QuickBooks to eliminate double entry, automate job costing, 
              and get real-time financial visibility across your construction projects.
            </p>
          </div>

          {/* Benefits Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Why Integrate QuickBooks with BuildDesk?</CardTitle>
              <CardDescription>
                Streamline your construction accounting and eliminate manual data entry
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    {benefit.icon}
                    <div>
                      <h3 className="font-semibold text-foreground">{benefit.title}</h3>
                      <p className="text-muted-foreground text-sm">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Step-by-Step Guide */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Step-by-Step Integration Process</CardTitle>
              <CardDescription>
                Follow these steps to connect QuickBooks with BuildDesk
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {howToSteps.map((step, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">{index + 1}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">{step.name}</h3>
                      <p className="text-muted-foreground">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Troubleshooting */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Common Issues & Solutions</CardTitle>
              <CardDescription>
                Quick fixes for the most common integration problems
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {troubleshooting.map((item, index) => (
                  <div key={index} className="border-l-4 border-primary/20 pl-4">
                    <h3 className="font-semibold text-foreground mb-1">{item.issue}</h3>
                    <p className="text-muted-foreground">{item.solution}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Ready to Get Started?</CardTitle>
              <CardDescription>
                See how BuildDesk's QuickBooks integration can transform your construction accounting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-lg font-semibold">
                  Start Free Trial
                </button>
                <button className="flex-1 border border-border hover:bg-accent text-foreground px-6 py-3 rounded-lg font-semibold">
                  Schedule Demo
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default QuickBooksIntegrationGuide;