import React from 'react';
import { SEOMetaTags } from '../components/SEOMetaTags';
import { BreadcrumbsNavigation } from '../components/BreadcrumbsNavigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Check, X, Star, DollarSign, Users, Smartphone } from 'lucide-react';

const BuildDeskVsCoConstruct = () => {
  const comparison = [
    {
      feature: "Pricing (Monthly)",
      builddesk: "$149-$599",
      coconstruct: "$399-$899",
      winner: "builddesk"
    },
    {
      feature: "Unlimited Users",
      builddesk: true,
      coconstruct: false,
      winner: "builddesk"
    },
    {
      feature: "Mobile App Quality",
      builddesk: "Excellent",
      coconstruct: "Good", 
      winner: "builddesk"
    },
    {
      feature: "QuickBooks Integration",
      builddesk: "Two-way sync",
      coconstruct: "One-way sync",
      winner: "builddesk"
    },
    {
      feature: "Learning Curve",
      builddesk: "Easy",
      coconstruct: "Moderate",
      winner: "builddesk"
    },
    {
      feature: "Customer Support",
      builddesk: "24/7 Live Chat",
      coconstruct: "Business Hours",
      winner: "builddesk"
    },
    {
      feature: "Client Portal",
      builddesk: true,
      coconstruct: true,
      winner: "tie"
    },
    {
      feature: "Change Orders",
      builddesk: "Digital Approvals",
      coconstruct: "Digital Approvals",
      winner: "tie"
    },
    {
      feature: "Time Tracking",
      builddesk: "GPS Verification",
      coconstruct: "Basic Tracking",
      winner: "builddesk"
    },
    {
      feature: "Safety Management",
      builddesk: "OSHA Compliance",
      coconstruct: "Basic Safety",
      winner: "builddesk"
    }
  ];

  const buildDeskPros = [
    "50% lower cost than CoConstruct",
    "Unlimited users at no extra cost",
    "Superior mobile app with offline capability",
    "Two-way QuickBooks synchronization",
    "Built-in OSHA compliance tools",
    "24/7 customer support",
    "Faster implementation (30 days vs 60+ days)",
    "More intuitive user interface"
  ];

  const coConstructPros = [
    "Longer market presence (established 2004)",
    "Strong residential focus",
    "Advanced estimating features",
    "Robust client communication tools"
  ];

  const buildDeskCons = [
    "Newer company (less market history)",
    "Smaller customer base"
  ];

  const coConstructCons = [
    "Significantly more expensive",
    "Per-user pricing gets costly quickly", 
    "Steeper learning curve",
    "Limited mobile functionality",
    "One-way QuickBooks integration only",
    "Support only during business hours"
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title="BuildDesk vs CoConstruct 2025: Which is Better for Your Construction Business?"
        description="Compare BuildDesk and CoConstruct construction management software. See pricing, features, pros and cons to choose the best solution for your construction company."
        keywords={[
          'builddesk vs coconstruct',
          'coconstruct alternative',
          'construction management software comparison',
          'builddesk coconstruct',
          'residential construction software',
          'construction project management',
          'contractor software comparison',
          'construction management platform'
        ]}
        canonicalUrl="https://builddesk.com/builddesk-vs-coconstruct"
      />

      <div className="container mx-auto px-4 py-8">
        <BreadcrumbsNavigation />
        
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 text-center">
            <Badge variant="secondary" className="mb-4">Software Comparison</Badge>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              BuildDesk vs CoConstruct: 2025 Comparison
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Compare two leading construction management platforms. See pricing, features, 
              and find out which solution offers better value for your construction business.
            </p>
          </div>

          {/* Quick Comparison Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">BuildDesk</CardTitle>
                  <Badge className="bg-green-100 text-green-800">Best Value</Badge>
                </div>
                <CardDescription>Construction management built for growing teams</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span className="font-semibold">$149-$599/month</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span>Unlimited users included</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Smartphone className="h-5 w-5 text-primary" />
                    <span>Superior mobile app</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-primary" />
                    <span>4.8/5 customer rating</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">CoConstruct</CardTitle>
                <CardDescription>Established residential construction platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">$399-$899/month</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span>Per-user pricing</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <span>Basic mobile features</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-muted-foreground" />
                    <span>4.3/5 customer rating</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Comparison Table */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Feature-by-Feature Comparison</CardTitle>
              <CardDescription>
                Side-by-side comparison of key features and capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-4 font-semibold">Feature</th>
                      <th className="text-center py-4 font-semibold text-primary">BuildDesk</th>
                      <th className="text-center py-4 font-semibold">CoConstruct</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-4 font-medium">{item.feature}</td>
                        <td className="py-4 text-center">
                          <div className={`${item.winner === 'builddesk' ? 'text-green-600 font-semibold' : ''}`}>
                            {typeof item.builddesk === 'boolean' ? (
                              item.builddesk ? <Check className="h-5 w-5 mx-auto text-green-600" /> : <X className="h-5 w-5 mx-auto text-red-500" />
                            ) : (
                              item.builddesk
                            )}
                          </div>
                        </td>
                        <td className="py-4 text-center">
                          <div className={`${item.winner === 'coconstruct' ? 'text-green-600 font-semibold' : ''}`}>
                            {typeof item.coconstruct === 'boolean' ? (
                              item.coconstruct ? <Check className="h-5 w-5 mx-auto text-green-600" /> : <X className="h-5 w-5 mx-auto text-red-500" />
                            ) : (
                              item.coconstruct
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pros and Cons */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-primary">BuildDesk Advantages</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {buildDeskPros.map((pro, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{pro}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CoConstruct Advantages</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {coConstructPros.map((pro, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{pro}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Line */}
          <Card>
            <CardHeader>
              <CardTitle>The Bottom Line</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="text-muted-foreground mb-4">
                  <strong>BuildDesk wins this comparison</strong> for most construction companies, especially those looking for:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-6">
                  <li>Better value for money (50% less expensive)</li>
                  <li>Modern, user-friendly interface</li>
                  <li>Superior mobile capabilities</li>
                  <li>Unlimited user licensing</li>
                  <li>Better customer support</li>
                </ul>
                <p className="text-muted-foreground mb-6">
                  <strong>Choose CoConstruct if:</strong> You specifically need advanced estimating features 
                  and don't mind paying significantly more for an older, more complex platform.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-lg font-semibold">
                    Try BuildDesk Free
                  </button>
                  <button className="flex-1 border border-border hover:bg-accent text-foreground px-6 py-3 rounded-lg font-semibold">
                    Schedule Comparison Demo
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BuildDeskVsCoConstruct;