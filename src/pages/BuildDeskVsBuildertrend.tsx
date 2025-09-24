import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { FAQSchema } from "@/components/seo/EnhancedSchemaMarkup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Star, DollarSign, Clock, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";

const BuildDeskVsBuildertrend = () => {
  const faqData = [
    {
      question: "Is BuildDesk a good alternative to Buildertrend?",
      answer: "Yes, especially for small-mid contractors who need essential features without complexity. BuildDesk costs 50-60% less than Buildertrend while offering better mobile apps and faster setup for teams under 100 employees."
    },
    {
      question: "Which is better for residential contractors: BuildDesk or Buildertrend?",
      answer: "Both work well for residential, but BuildDesk offers better value with unlimited users, stronger job costing, and faster implementation. Buildertrend has more residential-specific templates but costs significantly more per user."
    },
    {
      question: "How do the mobile apps compare?",
      answer: "BuildDesk's mobile app works fully offline and syncs when connectivity returns. Buildertrend requires internet connection for most features. BuildDesk also includes more field management tools like GPS time tracking and safety forms."
    },
    {
      question: "Can I switch from Buildertrend to BuildDesk easily?",
      answer: "Yes. BuildDesk's migration team helps import your data from Buildertrend at no extra cost. Most contractors complete the switch within 2-3 weeks with full training included."
    }
  ];

  const featureComparison = [
    {
      feature: "Monthly Cost (15 users)",
      builddesk: "$299 (unlimited users)",
      buildertrend: "$599-899+",
      winner: "builddesk"
    },
    {
      feature: "Setup Time",
      builddesk: "1-2 weeks",
      buildertrend: "4-8 weeks", 
      winner: "builddesk"
    },
    {
      feature: "Mobile Offline Access",
      builddesk: "Full featured offline",
      buildertrend: "Limited offline",
      winner: "builddesk"
    },
    {
      feature: "Job Costing",
      builddesk: "Real-time with QuickBooks sync",
      buildertrend: "Basic costing",
      winner: "builddesk"
    },
    {
      feature: "Client Portal",
      builddesk: "Included",
      buildertrend: "Included",
      winner: "tie"
    },
    {
      feature: "Scheduling",
      builddesk: "Gantt charts + resource optimization",
      buildertrend: "Calendar + basic scheduling",
      winner: "builddesk"
    },
    {
      feature: "OSHA Compliance",
      builddesk: "Built-in forms and tracking",
      buildertrend: "Add-on module",
      winner: "builddesk"
    },
    {
      feature: "Learning Curve",
      builddesk: "Simple (hours to learn)",
      buildertrend: "Moderate (days to weeks)",
      winner: "builddesk"
    }
  ];

  const pros = {
    builddesk: [
      "60% lower cost with unlimited users",
      "Faster setup and training (1-2 weeks)",
      "Superior mobile offline functionality",
      "Advanced job costing with real-time updates",
      "Built-in OSHA compliance tools",
      "Better resource scheduling optimization",
      "Simpler interface, shorter learning curve",
      "No per-user fees as you grow"
    ],
    buildertrend: [
      "More residential-specific templates",
      "Larger user base and market presence", 
      "More third-party integrations",
      "Established brand recognition"
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title="BuildDesk vs Buildertrend: Feature & Pricing Comparison 2025 | Construction Software"
        description="Honest comparison of BuildDesk and Buildertrend for residential and commercial contractors. Features, pricing, and ease of use compared side-by-side."
        keywords={[
          'builddesk vs buildertrend',
          'buildertrend alternative',
          'construction management software comparison',
          'residential contractor software',
          'builddesk buildertrend comparison'
        ]}
        canonicalUrl="/builddesk-vs-buildertrend-comparison"
      />
      
      <FAQSchema questions={faqData} />
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <BreadcrumbsNavigation />
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <Badge className="mb-4">Software Comparison</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            BuildDesk vs Buildertrend: Which is Better for Your Business?
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Detailed comparison of features, pricing, and ease of use for residential 
            and commercial contractors. Make the right choice for your growing business.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="border-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">BuildDesk</CardTitle>
                <Badge className="bg-green-100 text-green-800">Recommended</Badge>
              </div>
              <CardDescription>Best for small-mid contractors seeking value and efficiency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold">$299/mo</div>
                  <div className="text-sm text-muted-foreground">Unlimited users</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">1-2 weeks</div>
                  <div className="text-sm text-muted-foreground">Setup time</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <span className="text-sm">4.8/5.0 (500+ reviews)</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Buildertrend</CardTitle>
              <CardDescription>Established platform with residential focus</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold">$599-899+</div>
                  <div className="text-sm text-muted-foreground">Per month (15 users)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">4-8 weeks</div>
                  <div className="text-sm text-muted-foreground">Setup time</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(4)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                  ))}
                  <Star className="h-4 w-4 text-gray-300" />
                </div>
                <span className="text-sm">4.2/5.0 (various sites)</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Comparison Table */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            Feature-by-Feature Comparison
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-semibold">Feature</th>
                      <th className="text-center p-4 font-semibold">BuildDesk</th>
                      <th className="text-center p-4 font-semibold">Buildertrend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {featureComparison.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-4 font-medium">{item.feature}</td>
                        <td className="p-4 text-center">
                          <div className={`flex items-center justify-center gap-2 ${item.winner === 'builddesk' ? 'text-green-700 font-semibold' : ''}`}>
                            {item.winner === 'builddesk' && <Check className="h-4 w-4" />}
                            <span>{item.builddesk}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className={`flex items-center justify-center gap-2 ${item.winner === 'buildertrend' ? 'text-green-700 font-semibold' : ''}`}>
                            {item.winner === 'buildertrend' && <Check className="h-4 w-4" />}
                            {item.winner === 'builddesk' && <X className="h-4 w-4 text-red-500" />}
                            <span>{item.buildertrend}</span>
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

        {/* Pros and Cons */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Detailed Pros & Cons</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-xl text-green-800">BuildDesk Advantages</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {pros.builddesk.map((pro, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="text-xl text-blue-800">Buildertrend Advantages</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {pros.buildertrend.map((pro, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Who Should Choose Each */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Which Should You Choose?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-xl">Choose BuildDesk if you:</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {[
                    "Want to save 50-60% on software costs",
                    "Need to be productive within 1-2 weeks",
                    "Have teams that work in areas with poor connectivity",
                    "Want advanced job costing and financial controls",
                    "Need built-in OSHA compliance tools",
                    "Prefer unlimited users as you grow",
                    "Value simplicity and ease of use"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Choose Buildertrend if you:</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {[
                    "Focus primarily on residential projects",
                    "Need extensive third-party integrations",
                    "Have budget for $600-900+ monthly software",
                    "Can invest 4-8 weeks in setup and training",
                    "Want established brand recognition"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Cost Analysis */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">5-Year Cost Comparison</h2>
          <Card>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <h4 className="font-semibold mb-2">Team Size: 15 Users</h4>
                  <div className="space-y-2">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">BuildDesk (5 years)</div>
                      <div className="text-2xl font-bold text-green-700">$17,940</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Buildertrend (5 years)</div>
                      <div className="text-2xl font-bold text-red-700">$35,940+</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <DollarSign className="h-12 w-12 text-green-600 mx-auto mb-2" />
                    <div className="text-xl font-bold text-green-600">Save $18,000+</div>
                    <div className="text-sm text-muted-foreground">Over 5 years</div>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <Clock className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                    <div className="text-xl font-bold text-blue-600">6-7 weeks</div>
                    <div className="text-sm text-muted-foreground">Faster implementation</div>
                  </div>
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

        {/* CTA Section */}
        <div className="bg-primary/5 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">
            Ready to Make the Switch to BuildDesk?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Join 300+ contractors who switched from Buildertrend to BuildDesk and saved 
            thousands annually while improving their project management efficiency.
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

export default BuildDeskVsBuildertrend;