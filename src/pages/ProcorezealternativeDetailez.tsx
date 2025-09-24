import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { FAQSchema } from "@/components/seo/EnhancedSchemaMarkup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, ArrowRight, Users, DollarSign, Clock, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";

const ProcoreAlternativeDetailed = () => {
  const comparisonData = [
    {
      feature: "Setup Time",
      procore: "2-4 months",
      builddesk: "1-2 weeks",
      procoreIcon: <X className="h-4 w-4 text-destructive" />,
      builddeskIcon: <Check className="h-4 w-4 text-green-600" />
    },
    {
      feature: "Monthly Cost (10 users)",
      procore: "$600-900+",
      builddesk: "$149-299",
      procoreIcon: <X className="h-4 w-4 text-destructive" />,
      builddeskIcon: <Check className="h-4 w-4 text-green-600" />
    },
    {
      feature: "Learning Curve",
      procore: "Steep (weeks)",
      builddesk: "Simple (hours)",
      procoreIcon: <X className="h-4 w-4 text-destructive" />,
      builddeskIcon: <Check className="h-4 w-4 text-green-600" />
    },
    {
      feature: "Mobile Offline Access",
      procore: "Limited",
      builddesk: "Full featured",
      procoreIcon: <X className="h-4 w-4 text-destructive" />,
      builddeskIcon: <Check className="h-4 w-4 text-green-600" />
    }
  ];

  const faqData = [
    {
      question: "Is BuildDesk a good alternative to Procore for small contractors?",
      answer: "Yes. BuildDesk is specifically designed for small to mid-size contractors (10-100 employees) who need job costing, scheduling, daily logs, and OSHA reporting without the complexity and high cost of enterprise solutions like Procore."
    },
    {
      question: "How much can I save switching from Procore to BuildDesk?",
      answer: "Small contractors typically save 60-70% on software costs. For a 15-person team, that's $400-600+ monthly savings, or $4,800-7,200 per year."
    },
    {
      question: "Is BuildDesk easier to use than Procore?",
      answer: "Yes. BuildDesk focuses on simplicity with guided setup, intuitive mobile apps, and features designed specifically for small contractor workflows. Most teams are productive within hours, not weeks."
    },
    {
      question: "Does BuildDesk integrate with QuickBooks like Procore?",
      answer: "Yes. BuildDesk has native QuickBooks integration that syncs job costs, invoices, and financial data automatically. The integration is simpler to set up than Procore's."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title="Procore Alternative for Small Contractors | BuildDesk vs Procore 2025"
        description="Why small contractors choose BuildDesk over Procore: 60% lower cost, 1-week setup, simple mobile tools. Compare features, pricing, and ease of use."
        keywords={[
          'procore alternative',
          'procore alternative small contractors',
          'builddesk vs procore',
          'procore too expensive',
          'construction management software small business',
          'cheaper than procore',
          'procore competitor'
        ]}
        canonicalUrl="/procore-alternative-detailed"
      />
      
      <FAQSchema questions={faqData} />
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <BreadcrumbsNavigation />
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <Badge className="mb-4">Procore Alternative</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            BuildDesk vs Procore: Better Choice for Small Contractors
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            <strong>TL;DR:</strong> BuildDesk offers the same core features as Procore 
            at 60% lower cost, with simpler setup and better mobile experience for teams under 100.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card>
            <CardContent className="p-6 text-center">
              <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">60%</div>
              <div className="text-sm text-muted-foreground">Lower Cost</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">1-2 weeks</div>
              <div className="text-sm text-muted-foreground">Setup Time</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">Unlimited</div>
              <div className="text-sm text-muted-foreground">Users</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Shield className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">Built-in</div>
              <div className="text-sm text-muted-foreground">OSHA Tools</div>
            </CardContent>
          </Card>
        </div>

        {/* Side-by-Side Comparison */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-8 text-center">
            Side-by-Side Comparison: What Matters for Small Contractors
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-4 font-semibold">Feature</th>
                      <th className="text-center p-4 font-semibold">Procore</th>
                      <th className="text-center p-4 font-semibold">BuildDesk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-4 font-medium">{item.feature}</td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {item.procoreIcon}
                            <span>{item.procore}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {item.builddeskIcon}
                            <span className="font-semibold">{item.builddesk}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* When to Choose Each */}
        <section className="mb-12">
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Choose Procore if you:</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Have 200+ employees and complex workflows</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Need extensive customization and integrations</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Have dedicated IT staff for implementation</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Budget $800-1,500+ monthly for software</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-xl">Choose BuildDesk if you:</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Have 10-100 employees and straightforward needs</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Want to be productive within days, not months</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Need strong mobile tools for field teams</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Want to save $400-600+ monthly on software costs</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-8">Frequently Asked Questions</h2>
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

        {/* CTA Section */}
        <div className="bg-primary/5 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">
            Ready to Switch from Procore?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Join 500+ small contractors who switched to BuildDesk and saved 
            thousands annually while improving their project management.
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

export default ProcoreAlternativeDetailed;