import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, X, DollarSign, Clock, Users, Star, ArrowRight, Download, Calculator, Building2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PageSEO, createArticleSchema, createBreadcrumbSchema } from '@/components/seo/PageSEO';
import { GEOOptimizedFAQ, buildertrendAlternativeFAQs } from '@/components/seo/GEOOptimizedFAQ';
import AISearchOptimization from '@/components/AISearchOptimization';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const BuildertrendAlternativeDetailed = () => {
  // FAQ data for schema markup and AI optimization
  const faqData = [
    {
      question: "Why are contractors switching from Buildertrend to BuildDesk?",
      answer: "Contractors switch to BuildDesk because it offers superior job costing, better multi-trade support, and more affordable pricing ($149/month vs $299+/month). While Buildertrend focuses primarily on residential builders, BuildDesk serves all construction trades with advanced financial management and commercial project capabilities."
    },
    {
      question: "How does BuildDesk compare to Buildertrend for commercial contractors?",
      answer: "BuildDesk is specifically designed for commercial contractors with advanced job costing, subcontractor management, and multi-project dashboards. Buildertrend is primarily built for residential builders and lacks the sophisticated financial tracking and commercial workflow features that BuildDesk provides."
    },
    {
      question: "Does BuildDesk have better QuickBooks integration than Buildertrend?",
      answer: "Yes, BuildDesk has native, real-time QuickBooks integration that automatically syncs job costs, invoices, and financial data. Buildertrend's QuickBooks integration is more limited and often requires manual data entry. BuildDesk eliminates double data entry completely."
    },
    {
      question: "Can BuildDesk handle multiple trades better than Buildertrend?",
      answer: "Absolutely. BuildDesk is designed for general contractors managing multiple trades (plumbing, HVAC, electrical, etc.) with trade-specific workflows, scheduling, and cost tracking. Buildertrend is primarily focused on residential building and lacks the multi-trade coordination features that commercial contractors need."
    },
    {
      question: "How does BuildDesk pricing compare to Buildertrend?",
      answer: "BuildDesk costs $149/month with unlimited users and all features included. Buildertrend starts at $299/month and charges extra for additional users and premium features. Most contractors save $150-300 per month by switching to BuildDesk while getting better functionality."
    }
  ];

  // Comparison data focusing on BuildDesk's strengths vs Buildertrend
  const featureComparison = [
    {
      feature: "Monthly Cost",
      builddesk: "$149/month",
      buildertrend: "$299+/month",
      advantage: "builddesk"
    },
    {
      feature: "User Pricing",
      builddesk: "Unlimited users included",
      buildertrend: "$39/month per additional user",
      advantage: "builddesk"
    },
    {
      feature: "Job Costing",
      builddesk: "Advanced real-time costing",
      buildertrend: "Basic cost tracking",
      advantage: "builddesk"
    },
    {
      feature: "Multi-Trade Support",
      builddesk: "Built for all trades",
      buildertrend: "Residential focus only",
      advantage: "builddesk"
    },
    {
      feature: "QuickBooks Integration",
      builddesk: "Native, real-time sync",
      buildertrend: "Limited, manual entry",
      advantage: "builddesk"
    },
    {
      feature: "Commercial Projects",
      builddesk: "✓ Full commercial support",
      buildertrend: "Limited commercial features",
      advantage: "builddesk"
    },
    {
      feature: "Mobile App Rating",
      builddesk: "4.8/5 stars",
      buildertrend: "4.1/5 stars",
      advantage: "builddesk"
    },
    {
      feature: "Customer Support",
      builddesk: "Live chat, phone, email",
      buildertrend: "Email, limited phone",
      advantage: "builddesk"
    },
    {
      feature: "Setup Time",
      builddesk: "1-2 days",
      buildertrend: "1-2 weeks",
      advantage: "builddesk"
    },
    {
      feature: "Contract Length",
      builddesk: "Month-to-month available",
      buildertrend: "Annual contracts required",
      advantage: "builddesk"
    }
  ];

  // Customer testimonials from contractors who switched
  const testimonials = [
    {
      name: "Carlos Martinez",
      company: "Martinez General Contracting",
      role: "Owner",
      location: "Phoenix, AZ",
      quote: "Buildertrend was great when we only did residential, but as we moved into commercial work, we needed better job costing and multi-trade coordination. BuildDesk handles our $2M commercial projects with ease.",
      savings: "$1,800/month",
      projectTypes: "Commercial & Residential",
      teamSize: "25 employees"
    },
    {
      name: "Jennifer Walsh",
      company: "Walsh Construction Services",
      role: "Project Manager",
      location: "Denver, CO",
      quote: "The QuickBooks integration alone made the switch worth it. No more double data entry between Buildertrend and our accounting. BuildDesk syncs everything automatically and our job costing is finally accurate.",
      savings: "$2,200/month",
      projectTypes: "Multi-family & Commercial",
      teamSize: "18 employees"
    },
    {
      name: "Mark Thompson",
      company: "Thompson Multi-Trade Construction",
      role: "Operations Manager",
      location: "Tampa, FL",
      quote: "We manage plumbing, HVAC, and electrical crews on the same projects. Buildertrend couldn't handle the complexity, but BuildDesk was built for this. Our project coordination improved dramatically.",
      savings: "$1,500/month",
      projectTypes: "Commercial Multi-Trade",
      teamSize: "35 employees"
    }
  ];

  // BuildDesk advantages specifically vs Buildertrend
  const advantages = [
    {
      title: "Superior Job Costing",
      description: "Real-time cost tracking with detailed labor, material, and overhead allocation by trade and phase.",
      icon: Calculator,
      benefits: [
        "Real-time profit/loss tracking by project phase",
        "Automatic cost allocation across multiple trades",
        "Integration with payroll and material suppliers",
        "Variance reporting and budget alerts"
      ]
    },
    {
      title: "Multi-Trade Coordination",
      description: "Built for general contractors managing multiple specialized trades on complex projects.",
      icon: Wrench,
      benefits: [
        "Trade-specific scheduling and workflows",
        "Subcontractor coordination and communication",
        "Cross-trade dependency tracking",
        "Unified project dashboard for all trades"
      ]
    },
    {
      title: "Commercial Project Management",
      description: "Advanced features for commercial contractors that Buildertrend lacks.",
      icon: Building2,
      benefits: [
        "Complex project hierarchy and phases",
        "Advanced change order management",
        "Multi-location project tracking",
        "Commercial compliance and reporting"
      ]
    },
    {
      title: "Better Financial Integration",
      description: "Native QuickBooks integration that eliminates double data entry and ensures accuracy.",
      icon: DollarSign,
      benefits: [
        "Real-time synchronization with QuickBooks",
        "Automatic invoice generation and tracking",
        "Integrated accounts payable/receivable",
        "Financial reporting and cash flow management"
      ]
    }
  ];

  // Create schemas for SEO
  const articleSchema = createArticleSchema(
    "Buildertrend Alternative: Why Commercial Contractors Choose BuildDesk",
    "Comprehensive comparison of BuildDesk vs Buildertrend for construction management, focusing on commercial projects, multi-trade support, and advanced job costing.",
    "2025-01-12",
    "2025-11-07"
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", url: "https://builddesk.com" },
    { name: "Buildertrend Alternative", url: "https://builddesk.com/buildertrend-alternative" }
  ]);

  return (
    <>
      {/* Enhanced SEO with PageSEO Component */}
      <PageSEO
        title="Buildertrend Alternative for Commercial Contractors | BuildDesk"
        description="Why contractors switched from Buildertrend to BuildDesk. Superior job costing, multi-trade support, commercial projects. $350/month vs Buildertrend's $399+. Better QuickBooks integration. See feature comparison."
        keywords={[
          'buildertrend alternative',
          'buildertrend alternative for commercial contractors',
          'construction management software',
          'buildertrend vs builddesk',
          'buildertrend competitor',
          'commercial construction software',
          'multi-trade construction software',
          'buildertrend replacement',
          'best buildertrend alternative 2025',
          'construction software for multiple trades'
        ]}
        canonicalUrl="/buildertrend-alternative"
        schema={[articleSchema, breadcrumbSchema]}
        ogType="article"
        articlePublishDate="2025-01-12"
        lastModified="2025-11-07"
      />

      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              Buildertrend Alternative
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-6">
              Why Commercial Contractors Choose BuildDesk Over Buildertrend
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Move beyond residential-focused software to a platform built for commercial contractors. Better job costing, multi-trade coordination, and advanced project management at 50% lower cost.
            </p>
            
            {/* Trust Signals */}
            <div className="flex flex-wrap justify-center items-center gap-8 mb-8">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-construction-blue" />
                <span className="font-semibold">Commercial Focus</span>
              </div>
              <div className="flex items-center space-x-2">
                <Wrench className="h-5 w-5 text-construction-blue" />
                <span className="font-semibold">Multi-Trade Support</span>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="font-semibold">50% Cost Savings</span>
              </div>
            </div>

            {/* Primary CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-construction-orange hover:bg-construction-orange/90">
                Start Free 14-Day Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline">
                Schedule Buildertrend Migration Demo
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              ✓ No Credit Card Required ✓ Free Data Migration ✓ Commercial Project Templates
            </p>
          </div>

          {/* Quick Comparison Table */}
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-center text-construction-dark mb-8">
              BuildDesk vs Buildertrend: Feature Comparison
            </h2>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-4 font-semibold">Feature</th>
                        <th className="text-center p-4 font-semibold text-construction-blue">BuildDesk</th>
                        <th className="text-center p-4 font-semibold text-gray-600">Buildertrend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {featureComparison.map((item, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-medium">{item.feature}</td>
                          <td className={`text-center p-4 ${item.advantage === 'builddesk' ? 'text-construction-blue font-semibold' : ''}`}>
                            {item.builddesk}
                            {item.advantage === 'builddesk' && <CheckCircle className="inline ml-2 h-4 w-4 text-green-600" />}
                          </td>
                          <td className={`text-center p-4 ${item.advantage === 'buildertrend' ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
                            {item.buildertrend}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Why BuildDesk is Better for Commercial Contractors */}
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark text-center mb-8">
              Why BuildDesk Beats Buildertrend for Commercial Work
            </h2>
            <div className="grid lg:grid-cols-2 gap-8">
              {advantages.map((advantage, index) => {
                const IconComponent = advantage.icon;
                return (
                  <Card key={index} className="h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center text-construction-blue">
                        <IconComponent className="mr-3 h-6 w-6" />
                        {advantage.title}
                      </CardTitle>
                      <CardDescription className="text-base">
                        {advantage.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {advantage.benefits.map((benefit, benefitIndex) => (
                          <li key={benefitIndex} className="flex items-start">
                            <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Buildertrend Limitations */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark mb-8">
              Buildertrend's Limitations for Growing Contractors
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader>
                  <CardTitle className="text-orange-700 flex items-center">
                    <Building2 className="mr-2 h-5 w-5" />
                    Residential-Only Focus
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Built primarily for home builders</li>
                    <li>• Lacks commercial project complexity</li>
                    <li>• Limited multi-trade coordination</li>
                    <li>• No advanced job costing for commercial work</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader>
                  <CardTitle className="text-orange-700 flex items-center">
                    <DollarSign className="mr-2 h-5 w-5" />
                    Expensive User-Based Pricing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-gray-700">
                    <li>• $299/month base cost + $39 per additional user</li>
                    <li>• Costs escalate quickly with team growth</li>
                    <li>• Premium features cost extra</li>
                    <li>• Annual contracts required</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader>
                  <CardTitle className="text-orange-700 flex items-center">
                    <Calculator className="mr-2 h-5 w-5" />
                    Basic Job Costing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Simple cost tracking, not real-time</li>
                    <li>• Limited integration with accounting</li>
                    <li>• No advanced variance reporting</li>
                    <li>• Difficult to track profitability by phase</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader>
                  <CardTitle className="text-orange-700 flex items-center">
                    <Wrench className="mr-2 h-5 w-5" />
                    Limited Multi-Trade Support
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-gray-700">
                    <li>• No trade-specific workflows</li>
                    <li>• Basic subcontractor management</li>
                    <li>• Limited cross-trade coordination</li>
                    <li>• No specialized scheduling for trades</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Customer Success Stories */}
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark text-center mb-8">
              Contractors Who Made the Switch
            </h2>
            <div className="grid lg:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <CardTitle className="text-lg">{testimonial.name}</CardTitle>
                        <CardDescription>{testimonial.role}</CardDescription>
                        <p className="text-sm font-medium text-construction-blue">{testimonial.company}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.location}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">{testimonial.savings}</p>
                        <p className="text-xs text-muted-foreground">Monthly Savings</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{testimonial.projectTypes}</Badge>
                      <Badge variant="outline" className="text-xs">{testimonial.teamSize}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <blockquote className="text-sm italic text-gray-700">
                      "{testimonial.quote}"
                    </blockquote>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Cost Comparison Calculator */}
          <div className="max-w-4xl mx-auto mb-16">
            <Card className="bg-gradient-to-r from-construction-blue to-construction-orange text-white">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl mb-2">Cost Savings Calculator</CardTitle>
                <CardDescription className="text-blue-100">
                  See how much you could save by switching from Buildertrend to BuildDesk
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8 mb-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-4">Buildertrend Cost (10 Users)</h3>
                    <div className="space-y-2">
                      <p className="text-sm">Base Plan: $299/month</p>
                      <p className="text-sm">Additional Users (9 × $39): $351/month</p>
                      <p className="text-2xl font-bold border-t pt-2">$650/month</p>
                      <p className="text-sm text-blue-100">$7,800/year</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-4">BuildDesk Cost (Unlimited Users)</h3>
                    <div className="space-y-2">
                      <p className="text-sm">All Features Included: $149/month</p>
                      <p className="text-sm">Additional Users: $0/month</p>
                      <p className="text-2xl font-bold border-t pt-2">$149/month</p>
                      <p className="text-sm text-blue-100">$1,788/year</p>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-white/10 rounded-lg p-4 mb-6">
                    <p className="text-2xl font-bold">Save $501/month</p>
                    <p className="text-lg">$6,012 annual savings</p>
                  </div>
                  <Button size="lg" variant="secondary" className="bg-white text-construction-blue hover:bg-gray-100">
                    <Calculator className="mr-2 h-4 w-4" />
                    Calculate Your Savings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Migration Process */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark text-center mb-8">
              Easy Migration from Buildertrend to BuildDesk
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="text-center">
                <CardHeader>
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-full flex items-center justify-center mx-auto mb-4">
                    1
                  </div>
                  <CardTitle className="text-lg">Data Export</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    We help you export your projects, contacts, and documents from Buildertrend
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-full flex items-center justify-center mx-auto mb-4">
                    2
                  </div>
                  <CardTitle className="text-lg">Data Import</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Our team imports everything into BuildDesk with proper formatting and organization
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-full flex items-center justify-center mx-auto mb-4">
                    3
                  </div>
                  <CardTitle className="text-lg">Team Training</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Customized training focused on the advanced features you'll gain with BuildDesk
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-full flex items-center justify-center mx-auto mb-4">
                    4
                  </div>
                  <CardTitle className="text-lg">Go Live</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Start managing projects with BuildDesk's advanced commercial features
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="text-center mt-8">
              <p className="text-lg font-semibold text-construction-dark mb-4">
                Typical migration timeline: 3-5 days
              </p>
              <Button size="lg" className="bg-construction-orange hover:bg-construction-orange/90">
                <Download className="mr-2 h-4 w-4" />
                Download Migration Guide
              </Button>
            </div>
          </div>

          {/* AI Search Optimization */}
          <div className="max-w-4xl mx-auto mb-16">
            <AISearchOptimization page="alternatives" primaryKeyword="buildertrend alternative" />
          </div>

          {/* GEO-Optimized FAQ Section */}
          <div className="max-w-4xl mx-auto mb-16">
            <GEOOptimizedFAQ
              faqs={buildertrendAlternativeFAQs}
              title="Buildertrend vs BuildDesk: Frequently Asked Questions"
              description="Get answers to common questions about switching from Buildertrend to BuildDesk"
            />
          </div>

          {/* Final CTA Section */}
          <div className="max-w-4xl mx-auto text-center">
            <Card className="bg-construction-light border-construction-blue">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold text-construction-dark mb-4">
                  Ready to Upgrade from Buildertrend?
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Join commercial contractors who've switched to BuildDesk for better job costing, 
                  multi-trade support, and 50% cost savings. Start your free trial today.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                  <Button size="lg" className="bg-construction-orange hover:bg-construction-orange/90">
                    Start Free 14-Day Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button size="lg" variant="outline">
                    Schedule Migration Demo
                  </Button>
                </div>

                <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-muted-foreground">
                  <span>✓ No Credit Card Required</span>
                  <span>✓ Free Buildertrend Migration</span>
                  <span>✓ Commercial Project Templates</span>
                  <span>✓ Advanced Job Costing</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default BuildertrendAlternativeDetailed;
