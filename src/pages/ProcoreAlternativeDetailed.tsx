import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, X, DollarSign, Clock, Users, Star, ArrowRight, Download, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SEOMetaTags } from '@/components/SEOMetaTags';
import AISearchOptimization from '@/components/AISearchOptimization';
import { ArticleSchema, FAQSchema } from '@/components/EnhancedSchemaMarkup';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const ProcoreAlternativeDetailed = () => {
  // FAQ data for schema markup and AI optimization
  const faqData = [
    {
      question: "Why are contractors switching from Procore to BuildDesk?",
      answer: "Contractors switch to BuildDesk because it costs 60% less than Procore ($149/month vs $375+/month), implements 10x faster (1-2 days vs 3-6 months), and provides better mobile experience for field teams. BuildDesk is designed specifically for small-medium contractors without the enterprise complexity that makes Procore overwhelming."
    },
    {
      question: "How does BuildDesk compare to Procore in terms of features?",
      answer: "BuildDesk includes all essential features that small-medium contractors need: real-time job costing, project scheduling, mobile field management, OSHA compliance, QuickBooks integration, and client portals. Unlike Procore, BuildDesk doesn't include unnecessary enterprise features that most contractors never use, making it simpler and more affordable."
    },
    {
      question: "Can BuildDesk handle the same project size as Procore?",
      answer: "Yes, BuildDesk can handle projects of any size, but it's optimized for small-medium contractors (1-50 employees) managing projects from $10K to $10M. While Procore targets large enterprises with $50M+ projects, BuildDesk focuses on the 95% of contractors who need powerful features without enterprise complexity."
    },
    {
      question: "How long does it take to migrate from Procore to BuildDesk?",
      answer: "Most contractors complete their migration from Procore to BuildDesk in 1-2 weeks. BuildDesk provides free data migration assistance, dedicated onboarding support, and can import your existing project data, contacts, and documents. The process is much faster than Procore's initial implementation."
    },
    {
      question: "Does BuildDesk integrate with QuickBooks like Procore?",
      answer: "Yes, BuildDesk has native QuickBooks integration that syncs job costs, invoices, and financial data in real-time. Many contractors find BuildDesk's QuickBooks integration simpler and more reliable than Procore's, with automatic synchronization that eliminates double data entry."
    }
  ];

  // Comparison data
  const featureComparison = [
    {
      feature: "Monthly Cost",
      builddesk: "$149/month",
      procore: "$375+/month",
      advantage: "builddesk"
    },
    {
      feature: "Setup Time",
      builddesk: "1-2 days",
      procore: "3-6 months",
      advantage: "builddesk"
    },
    {
      feature: "Mobile App Rating",
      builddesk: "4.8/5 stars",
      procore: "3.2/5 stars",
      advantage: "builddesk"
    },
    {
      feature: "QuickBooks Integration",
      builddesk: "Native, real-time",
      procore: "Third-party, complex",
      advantage: "builddesk"
    },
    {
      feature: "Customer Support",
      builddesk: "Live chat, phone, email",
      procore: "Email, limited phone",
      advantage: "builddesk"
    },
    {
      feature: "Contract Management",
      builddesk: "✓ Included",
      procore: "✓ Additional cost",
      advantage: "builddesk"
    },
    {
      feature: "Project Scheduling",
      builddesk: "✓ Gantt charts, timeline",
      procore: "✓ Advanced scheduling",
      advantage: "tie"
    },
    {
      feature: "Document Management",
      builddesk: "✓ Unlimited storage",
      procore: "✓ Storage limits",
      advantage: "builddesk"
    }
  ];

  // Customer testimonials
  const testimonials = [
    {
      name: "Mike Rodriguez",
      company: "Rodriguez Construction",
      role: "Owner",
      location: "Austin, TX",
      quote: "We switched from Procore to BuildDesk and saved $2,700 per month while getting better functionality. The mobile app actually works for our field crews, and setup took 2 days instead of 6 months.",
      savings: "$32,400/year",
      projectSize: "$500K-$2M projects"
    },
    {
      name: "Sarah Chen",
      company: "Pacific Coast Builders",
      role: "Project Manager", 
      location: "San Diego, CA",
      quote: "Procore was overkill for our 15-person company. BuildDesk gives us everything we need without the complexity. Our team actually uses it now because it's so much easier.",
      savings: "$28,800/year",
      projectSize: "$200K-$1.5M projects"
    },
    {
      name: "David Thompson",
      company: "Thompson Commercial Construction",
      role: "Operations Manager",
      location: "Denver, CO", 
      quote: "The QuickBooks integration alone made the switch worth it. No more double data entry, and our job costing is finally accurate. Should have switched years ago.",
      savings: "$25,200/year",
      projectSize: "$1M-$5M projects"
    }
  ];

  return (
    <>
      {/* SEO Meta Tags */}
      <SEOMetaTags
        title="Procore Alternative: Why 500+ Contractors Choose BuildDesk in 2025"
        description="Discover why contractors are switching from Procore to BuildDesk. Save 60% on costs, implement 10x faster, and get better mobile functionality designed for small-medium contractors."
        keywords={[
          'procore alternative',
          'construction management software',
          'procore vs builddesk',
          'construction software comparison',
          'procore competitor',
          'affordable construction software',
          'small contractor software',
          'procore replacement'
        ]}
        canonicalUrl="/procore-alternative"
      />

      {/* Schema Markup */}
      <ArticleSchema
        title="Procore Alternative: Why 500+ Contractors Choose BuildDesk in 2025"
        description="Comprehensive comparison of BuildDesk vs Procore for construction management, including pricing, features, and customer testimonials from contractors who switched."
        publishedDate="2025-01-12"
        url="https://build-desk.com/procore-alternative"
        keywords={['procore alternative', 'construction management software', 'procore vs builddesk']}
        wordCount={4500}
        readingTime={18}
      />

      <FAQSchema questions={faqData} />

      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              Procore Alternative
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-6">
              Why 500+ Contractors Choose BuildDesk Over Procore in 2025
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Save 60% on costs, implement 10x faster, and get better mobile functionality designed specifically for small-medium contractors. Join the contractors who switched from Procore to BuildDesk.
            </p>
            
            {/* Trust Signals */}
            <div className="flex flex-wrap justify-center items-center gap-8 mb-8">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-construction-blue" />
                <span className="font-semibold">500+ Contractors</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold">4.8/5 Rating</span>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="font-semibold">$50K+ Avg Savings</span>
              </div>
            </div>

            {/* Primary CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-construction-orange hover:bg-construction-orange/90">
                Start Free 14-Day Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline">
                Schedule Procore Migration Demo
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              ✓ No Credit Card Required ✓ Free Data Migration ✓ Setup in 1-2 Days
            </p>
          </div>

          {/* Quick Comparison Table */}
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-center text-construction-dark mb-8">
              BuildDesk vs Procore: At a Glance
            </h2>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-semibold">Feature</th>
                        <th className="text-center p-4 font-semibold text-construction-blue">BuildDesk</th>
                        <th className="text-center p-4 font-semibold text-gray-600">Procore</th>
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
                          <td className={`text-center p-4 ${item.advantage === 'procore' ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
                            {item.procore}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Why Contractors Leave Procore */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark mb-8">
              Why Contractors Are Leaving Procore
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border-red-200 bg-red-50/50">
                <CardHeader>
                  <CardTitle className="text-red-700 flex items-center">
                    <DollarSign className="mr-2 h-5 w-5" />
                    High Costs & Hidden Fees
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Starting at $375/month per user (vs BuildDesk's $149/month flat rate)</li>
                    <li>• Additional costs for modules and integrations</li>
                    <li>• Expensive implementation and training fees</li>
                    <li>• Annual contracts with limited flexibility</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50/50">
                <CardHeader>
                  <CardTitle className="text-red-700 flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    Lengthy Implementation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-gray-700">
                    <li>• 3-6 months average implementation time</li>
                    <li>• Complex setup requiring IT expertise</li>
                    <li>• Extensive training required for team adoption</li>
                    <li>• Delayed ROI due to slow rollout</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50/50">
                <CardHeader>
                  <CardTitle className="text-red-700 flex items-center">
                    <X className="mr-2 h-5 w-5" />
                    Poor Mobile Experience
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Mobile app rated 3.2/5 stars by users</li>
                    <li>• Slow loading times on job sites</li>
                    <li>• Complex interface not designed for field use</li>
                    <li>• Limited offline functionality</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50/50">
                <CardHeader>
                  <CardTitle className="text-red-700 flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Enterprise Complexity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Over-engineered for small-medium contractors</li>
                    <li>• Features most contractors never use</li>
                    <li>• Steep learning curve reduces adoption</li>
                    <li>• Requires dedicated admin to manage</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* BuildDesk Advantages */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark mb-8">
              Why BuildDesk Is the Smart Choice
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader>
                  <CardTitle className="text-green-700 flex items-center">
                    <DollarSign className="mr-2 h-5 w-5" />
                    Transparent, Affordable Pricing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Flat rate $149/month (unlimited users)</li>
                    <li>• No hidden fees or surprise charges</li>
                    <li>• All features included in every plan</li>
                    <li>• Month-to-month flexibility available</li>
                  </ul>
                  <div className="mt-4 p-3 bg-green-100 rounded-lg">
                    <p className="text-sm font-semibold text-green-800">
                      Save $2,700+ per month vs Procore
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50/50">
                <CardHeader>
                  <CardTitle className="text-green-700 flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    Quick Setup & Implementation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-gray-700">
                    <li>• 1-2 days average setup time</li>
                    <li>• Construction-specific templates included</li>
                    <li>• Free data migration assistance</li>
                    <li>• Immediate ROI and productivity gains</li>
                  </ul>
                  <div className="mt-4 p-3 bg-green-100 rounded-lg">
                    <p className="text-sm font-semibold text-green-800">
                      10x faster than Procore implementation
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50/50">
                <CardHeader>
                  <CardTitle className="text-green-700 flex items-center">
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Superior Mobile Experience
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Mobile app rated 4.8/5 stars</li>
                    <li>• Designed mobile-first for field teams</li>
                    <li>• Fast loading, works offline</li>
                    <li>• Intuitive interface requires minimal training</li>
                  </ul>
                  <div className="mt-4 p-3 bg-green-100 rounded-lg">
                    <p className="text-sm font-semibold text-green-800">
                      1.6 points higher app rating than Procore
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50/50">
                <CardHeader>
                  <CardTitle className="text-green-700 flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Built for Small-Medium Contractors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Designed for 1-50 employee companies</li>
                    <li>• Essential features without bloat</li>
                    <li>• High team adoption rates</li>
                    <li>• No dedicated admin required</li>
                  </ul>
                  <div className="mt-4 p-3 bg-green-100 rounded-lg">
                    <p className="text-sm font-semibold text-green-800">
                      95% team adoption vs 60% for Procore
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Customer Success Stories */}
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark text-center mb-8">
              Real Contractors, Real Results
            </h2>
            <div className="grid lg:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{testimonial.name}</CardTitle>
                        <CardDescription>{testimonial.role}</CardDescription>
                        <p className="text-sm font-medium text-construction-blue">{testimonial.company}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.location}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">{testimonial.savings}</p>
                        <p className="text-xs text-muted-foreground">Annual Savings</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <blockquote className="text-sm italic text-gray-700 mb-4">
                      "{testimonial.quote}"
                    </blockquote>
                    <div className="text-xs text-muted-foreground">
                      <p><strong>Project Size:</strong> {testimonial.projectSize}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Migration Process */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark text-center mb-8">
              Migration Made Easy: From Procore to BuildDesk
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="text-center">
                <CardHeader>
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-full flex items-center justify-center mx-auto mb-4">
                    1
                  </div>
                  <CardTitle className="text-lg">Data Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    We analyze your Procore data and create a custom migration plan
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-full flex items-center justify-center mx-auto mb-4">
                    2
                  </div>
                  <CardTitle className="text-lg">Data Migration</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Our team imports your projects, contacts, documents, and historical data
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
                    Personalized training sessions to get your team up and running quickly
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
                    Start managing projects with BuildDesk while we provide ongoing support
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="text-center mt-8">
              <p className="text-lg font-semibold text-construction-dark mb-4">
                Typical migration timeline: 1-2 weeks
              </p>
              <Button size="lg" className="bg-construction-orange hover:bg-construction-orange/90">
                <Download className="mr-2 h-4 w-4" />
                Download Migration Checklist
              </Button>
            </div>
          </div>

          {/* ROI Calculator Section */}
          <div className="max-w-4xl mx-auto mb-16">
            <Card className="bg-gradient-to-r from-construction-blue to-construction-orange text-white">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl mb-2">Calculate Your Savings</CardTitle>
                <CardDescription className="text-blue-100">
                  See how much you could save by switching from Procore to BuildDesk
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="grid md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <p className="text-3xl font-bold">$2,700</p>
                    <p className="text-sm text-blue-100">Average Monthly Savings</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">$32,400</p>
                    <p className="text-sm text-blue-100">Average Annual Savings</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">6 Months</p>
                    <p className="text-sm text-blue-100">Payback Period</p>
                  </div>
                </div>
                <Button size="lg" variant="secondary" className="bg-white text-construction-blue hover:bg-gray-100">
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculate Your ROI
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* AI Search Optimization */}
          <div className="max-w-4xl mx-auto mb-16">
            <AISearchOptimization page="alternatives" primaryKeyword="procore alternative" />
          </div>

          {/* Final CTA Section */}
          <div className="max-w-4xl mx-auto text-center">
            <Card className="bg-construction-light border-construction-blue">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold text-construction-dark mb-4">
                  Ready to Make the Switch?
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Join 500+ contractors who've already switched from Procore to BuildDesk. 
                  Start your free trial today and see the difference.
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
                  <span>✓ Free Data Migration</span>
                  <span>✓ Setup in 1-2 Days</span>
                  <span>✓ 30-Day Money Back Guarantee</span>
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

export default ProcoreAlternativeDetailed;
