import { CheckCircle, X, DollarSign, Clock, Users, Star, ArrowRight, Download, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageSEO, createArticleSchema, createBreadcrumbSchema } from '@/components/seo/PageSEO';
import { GEOOptimizedFAQ, procoreAlternativeFAQs } from '@/components/seo/GEOOptimizedFAQ';
import AISearchOptimization from '@/components/AISearchOptimization';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const ProcoreAlternativeDetailed = () => {
  // FAQ data for schema markup and AI optimization
  const faqData = [
    {
      question: "Why are contractors switching from Procore to Brikly?",
      answer: "Contractors switch to Brikly because it costs 60% less than Procore ($149/month vs $375+/month), implements 10x faster (1-2 days vs 3-6 months), and provides better mobile experience for field teams. Brikly is designed specifically for small-medium contractors without the enterprise complexity that makes Procore overwhelming."
    },
    {
      question: "How does Brikly compare to Procore in terms of features?",
      answer: "Brikly includes all essential features that small-medium contractors need: real-time job costing, project scheduling, mobile field management, OSHA compliance, QuickBooks integration, and client portals. Unlike Procore, Brikly doesn't include unnecessary enterprise features that most contractors never use, making it simpler and more affordable."
    },
    {
      question: "Can Brikly handle the same project size as Procore?",
      answer: "Yes, Brikly can handle projects of any size, but it's optimized for small-medium contractors (1-50 employees) managing projects from $10K to $10M. While Procore targets large enterprises with $50M+ projects, Brikly focuses on the 95% of contractors who need powerful features without enterprise complexity."
    },
    {
      question: "How long does it take to migrate from Procore to Brikly?",
      answer: "Most contractors complete their migration from Procore to Brikly in 1-2 weeks. Brikly provides free data migration assistance, dedicated onboarding support, and can import your existing project data, contacts, and documents. The process is much faster than Procore's initial implementation."
    },
    {
      question: "Does Brikly integrate with QuickBooks like Procore?",
      answer: "Yes, Brikly has native QuickBooks integration that syncs job costs, invoices, and financial data in real-time. Many contractors find Brikly's QuickBooks integration simpler and more reliable than Procore's, with automatic synchronization that eliminates double data entry."
    }
  ];

  // Comparison data
  const featureComparison = [
    {
      feature: "Monthly Cost",
      brikly: "$149/month",
      procore: "$375+/month",
      advantage: "brikly"
    },
    {
      feature: "Setup Time",
      brikly: "1-2 days",
      procore: "3-6 months",
      advantage: "brikly"
    },
    {
      feature: "Mobile App Rating",
      brikly: "4.8/5 stars",
      procore: "3.2/5 stars",
      advantage: "brikly"
    },
    {
      feature: "QuickBooks Integration",
      brikly: "Native, real-time",
      procore: "Third-party, complex",
      advantage: "brikly"
    },
    {
      feature: "Customer Support",
      brikly: "Live chat, phone, email",
      procore: "Email, limited phone",
      advantage: "brikly"
    },
    {
      feature: "Contract Management",
      brikly: "✓ Included",
      procore: "✓ Additional cost",
      advantage: "brikly"
    },
    {
      feature: "Project Scheduling",
      brikly: "✓ Gantt charts, timeline",
      procore: "✓ Advanced scheduling",
      advantage: "tie"
    },
    {
      feature: "Document Management",
      brikly: "✓ Unlimited storage",
      procore: "✓ Storage limits",
      advantage: "brikly"
    }
  ];

  // Create schemas for SEO
  const articleSchema = createArticleSchema(
    "Procore Alternative: How Brikly Compares for Small Contractors",
    "Side-by-side comparison of Brikly and Procore for construction management: pricing, features, implementation time, and mobile support.",
    "2025-01-12",
    "2025-11-07"
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", url: "https://brikly.net" },
    { name: "Procore Alternative", url: "https://brikly.net/procore-alternative" }
  ]);

  return (
    <>
      {/* Enhanced SEO with PageSEO Component */}
      <PageSEO
        title="Procore Alternative for Small Contractors - Save 50% | Brikly"
        description="Brikly compared with Procore for small contractors: flat $350/month against Procore's per-user pricing, faster setup, and mobile access for field crews."
        keywords={[
          'procore alternative',
          'procore alternative for small contractors',
          'construction management software',
          'procore vs brikly',
          'procore competitor',
          'affordable procore alternative',
          'small contractor construction software',
          'procore replacement',
          'best procore alternative 2025',
          'construction software for small business'
        ]}
        canonicalUrl="/procore-alternative"
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
              Procore Alternative
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-6">
              Why Small Contractors Choose Brikly Over Procore
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Save 60% on costs, implement 10x faster, and get better mobile functionality designed specifically for small-medium contractors. Join the contractors who switched from Procore to Brikly.
            </p>
            
            {/* Trust Signals */}
            <div className="flex flex-wrap justify-center items-center gap-8 mb-8">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-construction-blue" />
                <span className="font-semibold">Built for small contractors</span>
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
              Brikly vs Procore: At a Glance
            </h2>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-semibold">Feature</th>
                        <th className="text-center p-4 font-semibold text-construction-blue">Brikly</th>
                        <th className="text-center p-4 font-semibold text-gray-600">Procore</th>
                      </tr>
                    </thead>
                    <tbody>
                      {featureComparison.map((item, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-medium">{item.feature}</td>
                          <td className={`text-center p-4 ${item.advantage === 'brikly' ? 'text-construction-blue font-semibold' : ''}`}>
                            {item.brikly}
                            {item.advantage === 'brikly' && <CheckCircle className="inline ml-2 h-4 w-4 text-green-600" />}
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
                    <li>• Starting at $375/month per user (vs Brikly's $149/month flat rate)</li>
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

          {/* Brikly Advantages */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark mb-8">
              Why Brikly Is the Smart Choice
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

          {/* Migration Process */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark text-center mb-8">
              Migration Made Easy: From Procore to Brikly
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
                    Start managing projects with Brikly while we provide ongoing support
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
                  See how much you could save by switching from Procore to Brikly
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

          {/* GEO-Optimized FAQ Section */}
          <div className="max-w-4xl mx-auto mb-16">
            <GEOOptimizedFAQ
              faqs={procoreAlternativeFAQs}
              title="Procore vs Brikly: Frequently Asked Questions"
              description="Get answers to common questions about switching from Procore to Brikly"
            />
          </div>

          {/* Final CTA Section */}
          <div className="max-w-4xl mx-auto text-center">
            <Card className="bg-construction-light border-construction-blue">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold text-construction-dark mb-4">
                  Ready to Make the Switch?
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Switch from Procore to Brikly. 
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
