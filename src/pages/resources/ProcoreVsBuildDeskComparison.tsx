import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { ArticleSchema, FAQSchema } from "@/components/seo/EnhancedSchemaMarkup";
import { QuickAnswerSnippet, LastUpdated } from "@/components/seo/QuickAnswerSnippet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Star, DollarSign, Clock, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";

const ProcoreVsBuildDeskComparison = () => {
  const faqData = [
    {
      question: "Which is better for small contractors: Procore or BuildDesk?",
      answer: "BuildDesk is specifically designed for small contractors (10-100 employees) with faster setup, lower costs, and simpler workflows. Procore is built for large enterprises and can be overwhelming for small teams."
    },
    {
      question: "How much money can I save switching from Procore to BuildDesk?",
      answer: "Small contractors typically save 60-70% on software costs. For a 20-person team, that's $500-700+ monthly savings, or $6,000-8,400 per year while getting better functionality for their needs."
    },
    {
      question: "Is BuildDesk missing any essential features compared to Procore?",
      answer: "BuildDesk includes all essential features small contractors need: job costing, scheduling, mobile field management, OSHA compliance, and QuickBooks integration. What it doesn't have is enterprise complexity most small contractors don't need."
    },
    {
      question: "How long does it take to switch from Procore to BuildDesk?",
      answer: "Most contractors complete the switch in 2-3 weeks. BuildDesk's migration team helps import your data at no extra cost, and the simpler interface means faster team adoption."
    }
  ];

  const detailedComparison = [
    {
      feature: "Monthly Cost (20 users)",
      procore: "$800-1,200+",
      builddesk: "$299 (unlimited users)",
      winner: "builddesk",
      notes: "BuildDesk saves $500-900+ monthly"
    },
    {
      feature: "Setup & Training Time", 
      procore: "2-4 months",
      builddesk: "1-2 weeks",
      winner: "builddesk", 
      notes: "6-14x faster implementation"
    },
    {
      feature: "Learning Curve",
      procore: "Steep (weeks to months)",
      builddesk: "Gentle (hours to days)",
      winner: "builddesk",
      notes: "Less complexity = faster adoption"
    },
    {
      feature: "Mobile Offline Access",
      procore: "Limited functionality",
      builddesk: "Full featured offline",
      winner: "builddesk",
      notes: "Critical for poor connectivity sites"
    },
    {
      feature: "Job Costing Depth",
      procore: "Advanced enterprise features",
      builddesk: "Real-time with QuickBooks sync",
      winner: "builddesk",
      notes: "Better for small contractor needs"
    },
    {
      feature: "Customer Support",
      procore: "Tiered support levels",
      builddesk: "Direct access to experts",
      winner: "builddesk", 
      notes: "Personal support, not call centers"
    },
    {
      feature: "Customization Options",
      procore: "Extensive but complex",
      builddesk: "Streamlined essentials",
      winner: "builddesk",
      notes: "Right level for small contractors"
    },
    {
      feature: "Integration Ecosystem",
      procore: "600+ integrations",
      builddesk: "Essential integrations",
      winner: "procore",
      notes: "Procore has more, but most unused"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title="Procore vs BuildDesk: Which is Better for Small GC Teams? | 2025 Comparison"
        description="Honest comparison of Procore and BuildDesk for small contractors. Features, pricing, setup time, and ease of use compared. See why 500+ contractors choose BuildDesk."
        keywords={[
          'procore vs builddesk',
          'procore alternative small contractors',
          'construction software comparison',
          'builddesk procore comparison', 
          'small contractor software'
        ]}
        canonicalUrl="/resources/procore-vs-builddesk-small-contractors"
      />
      
      <ArticleSchema
        title="Procore vs BuildDesk: Which is Better for Small GC Teams?"
        author="BuildDesk Team"
        datePublished="2025-01-24"
        image="https://builddesk.com/images/procore-vs-builddesk-comparison.jpg"
        url="https://builddesk.com/resources/procore-vs-builddesk-small-contractors"
      />
      
      <FAQSchema questions={faqData} />
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <BreadcrumbsNavigation />
        
        {/* Hero Section */}
        <div className="mb-12">
          <Badge className="mb-4">Software Comparison</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-6">
            Procore vs BuildDesk: Which is Better for Small GC Teams?
          </h1>
          
          <LastUpdated date="September 2025" />
          
          <QuickAnswerSnippet
            question="Which construction software is better for small contractors - Procore or BuildDesk?"
            answer="BuildDesk wins for small contractors due to 60% lower cost ($299 vs $800+ monthly), 10x faster setup (2 weeks vs 2-4 months), and features designed specifically for teams under 100 employees. Procore is built for enterprise complexity most small contractors don't need."
          />

          <div className="text-lg text-muted-foreground mb-8">
            <p>This honest comparison covers the real differences between Procore and BuildDesk 
            based on feedback from 500+ small contractors who've used both platforms.</p>
          </div>
        </div>

        {/* Side-by-Side Overview */}
        <section className="mb-12">
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">BuildDesk</CardTitle>
                  <Badge className="bg-green-100 text-green-800">Best for Small Contractors</Badge>
                </div>
                <CardDescription>Built specifically for growing contractors (10-100 employees)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-green-700">$299/mo</div>
                    <div className="text-sm text-muted-foreground">Unlimited users</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-700">1-2 weeks</div>
                    <div className="text-sm text-muted-foreground">Live and productive</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <span className="text-sm">4.8/5.0 (500+ small contractors)</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Procore</CardTitle>
                <CardDescription>Enterprise platform for large construction companies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold">$800-1,200+</div>
                    <div className="text-sm text-muted-foreground">Per month (20 users)</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">2-4 months</div>
                    <div className="text-sm text-muted-foreground">Implementation time</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(4)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                    <Star className="h-4 w-4 text-gray-300" />
                  </div>
                  <span className="text-sm">4.2/5.0 (mixed reviews)</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Detailed Feature Comparison */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Feature-by-Feature Analysis</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-semibold">Feature</th>
                      <th className="text-center p-4 font-semibold">Procore</th>
                      <th className="text-center p-4 font-semibold">BuildDesk</th>
                      <th className="text-left p-4 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailedComparison.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-4 font-medium">{item.feature}</td>
                        <td className="p-4 text-center">
                          <div className={`flex items-center justify-center gap-2 ${item.winner === 'procore' ? 'text-green-700 font-semibold' : ''}`}>
                            {item.winner === 'procore' && <Check className="h-4 w-4" />}
                            {item.winner === 'builddesk' && <X className="h-4 w-4 text-red-500" />}
                            <span>{item.procore}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className={`flex items-center justify-center gap-2 ${item.winner === 'builddesk' ? 'text-green-700 font-semibold' : ''}`}>
                            {item.winner === 'builddesk' && <Check className="h-4 w-4" />}
                            {item.winner === 'procore' && <X className="h-4 w-4 text-red-500" />}
                            <span>{item.builddesk}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{item.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Cost Analysis */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Real Cost Comparison: 3-Year Analysis</h2>
          <Card>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold mb-4">Procore Total Cost (3 years, 20 users)</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Software subscription</span>
                      <span>$28,800 - $43,200</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Implementation & training</span>
                      <span>$15,000 - $25,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Customization & setup</span>
                      <span>$5,000 - $10,000</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold text-red-600">
                      <span>Total 3-Year Cost</span>
                      <span>$48,800 - $78,200</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-4">BuildDesk Total Cost (3 years, unlimited users)</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Software subscription</span>
                      <span>$10,764</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Implementation & training</span>
                      <span>Included</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Setup & customization</span>
                      <span>Included</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold text-green-600">
                      <span>Total 3-Year Cost</span>
                      <span>$10,764</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 text-center">
                <div className="text-2xl font-bold text-green-600">Save $38,000 - $67,400</div>
                <div className="text-sm text-muted-foreground">Over 3 years with BuildDesk</div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Real Customer Examples */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Real Customer Migration Stories</h2>
          <div className="space-y-6">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6">
                <h4 className="font-semibold mb-2">Alpine Construction (28 employees)</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">With Procore:</div>
                    <div>$1,100/month, 3-month setup, team struggled with complexity</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">After switching to BuildDesk:</div>
                    <div>$299/month, 2-week setup, team productive immediately</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Result:</div>
                    <div className="font-semibold text-green-700">$9,612 annual savings + better adoption</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <h4 className="font-semibold mb-2">Metro Builders (42 employees)</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Procore challenges:</div>
                    <div>Overwhelming interface, expensive training, poor mobile experience</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">BuildDesk benefits:</div>
                    <div>Simple interface, immediate productivity, excellent mobile app</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Outcome:</div>
                    <div className="font-semibold text-blue-700">25% increase in field productivity</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* When to Choose Each */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Decision Framework: Which Should You Choose?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-xl text-green-800">Choose BuildDesk if you:</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "Have 10-100 employees",
                    "Want to be productive within weeks, not months", 
                    "Need strong mobile/offline capabilities",
                    "Want to save $500-700+ monthly on software",
                    "Prefer simple, focused tools over complex systems",
                    "Need built-in OSHA compliance and job costing",
                    "Want unlimited users as you grow"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="text-xl text-orange-800">Choose Procore if you:</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "Have 200+ employees and complex workflows",
                    "Can invest 2-4 months in implementation",
                    "Have dedicated IT staff for setup and management",
                    "Need extensive customization and integrations",
                    "Budget $1,000+ monthly for software",
                    "Work on large, complex enterprise projects"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
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

        {/* Internal Links */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Related Resources</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <Link to="/procore-alternative-detailed" className="font-medium hover:text-primary">
                  Complete Procore Alternative Guide →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">Detailed analysis for small contractors</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Link to="/resources/best-construction-management-software-small-business-2025" className="font-medium hover:text-primary">
                  Best Construction Software 2025 →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">Compare all top options for small contractors</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Link to="/pricing" className="font-medium hover:text-primary">
                  BuildDesk Pricing →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">See transparent pricing with no hidden fees</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <div className="bg-primary/5 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">
            Ready to Switch from Procore to BuildDesk?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Join 300+ small contractors who made the switch and now save thousands 
            annually while enjoying better functionality designed for their needs.
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

export default ProcoreVsBuildDeskComparison;