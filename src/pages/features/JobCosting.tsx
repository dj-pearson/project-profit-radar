import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, DollarSign, TrendingUp, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { PageSEO, createHowToSchema, createFAQSchema } from '@/components/seo/PageSEO';
import { GEOOptimizedFAQ } from '@/components/seo/GEOOptimizedFAQ';
import { BreadcrumbsNavigation } from '@/components/BreadcrumbsNavigation';
import { AggregateRatingSchema } from '@/components/seo/AggregateRatingSchema';

const JobCostingPage = () => {
  const faqs = [
    {
      question: "What is real-time job costing?",
      answer: "Real-time job costing tracks construction project costs as they occur, not weeks later. This allows contractors to identify budget overruns within 24 hours instead of 30 days, giving you time to course-correct before losses compound."
    },
    {
      question: "How is real-time job costing different from traditional accounting?",
      answer: "Traditional accounting processes costs monthly through your accountant. Real-time job costing captures labor, materials, and equipment costs instantly as they're incurred in the field, giving you daily visibility into project profitability instead of waiting 30+ days for reports."
    },
    {
      question: "Can I integrate job costing with QuickBooks?",
      answer: "Yes! BuildDesk integrates seamlessly with QuickBooks Online, syncing your job costs, invoices, and expenses automatically. This eliminates duplicate data entry while maintaining your existing accounting workflow."
    },
    {
      question: "How much time does real-time job costing save?",
      answer: "Contractors using BuildDesk report saving 10-15 hours per week on job cost tracking and financial reporting. Month-end close goes from 3 days to 5 minutes, and you eliminate the back-and-forth with your accountant trying to reconcile field costs."
    },
    {
      question: "What size contractor is BuildDesk built for?",
      answer: "BuildDesk is purpose-built for small to mid-size contractors with $1M-$50M in annual revenue. We focus on the financial intelligence you need without the enterprise complexity and per-seat pricing of tools like Procore."
    }
  ];

  const howToSteps = [
    {
      name: "Set up your cost codes",
      text: "Create a simple chart of accounts with cost codes for labor, materials, equipment, and subcontractors. BuildDesk includes templates for most construction trades."
    },
    {
      name: "Track time in the field",
      text: "Field crews log time via mobile app with GPS verification. Time is automatically allocated to the correct project and cost code as it's worked."
    },
    {
      name: "Capture material costs",
      text: "Scan receipts with your phone or forward vendor emails. BuildDesk automatically extracts costs and assigns them to projects using AI."
    },
    {
      name: "Monitor profitability daily",
      text: "View real-time budget vs actual reports on your dashboard. Get automatic alerts when projects are trending over budget before it's too late."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title="Construction Job Costing Software - Real-Time Budget Tracking"
        description="Real-time job costing software for construction contractors. Track labor, materials, and equipment costs as they happen. Know your profit margins daily, not monthly. $350/month, unlimited users."
        keywords={[
          'construction job costing software',
          'real-time job costing',
          'construction cost tracking',
          'job cost accounting',
          'construction budget tracking',
          'contractor job costing',
          'real-time construction budgeting'
        ]}
        canonicalUrl="https://builddesk.com/features/job-costing"
        schema={[
          createHowToSchema("How to Track Construction Job Costs in Real-Time", howToSteps),
          createFAQSchema(faqs)
        ]}
      />

      {/* Enhanced SEO: Aggregate Rating Schema */}
      <AggregateRatingSchema
        schemaType="SoftwareApplication"
        itemName="BuildDesk Job Costing Software"
        itemDescription="Real-time job costing software for construction contractors"
      />

      <Header />

      <main>
        {/* Breadcrumb Navigation */}
        <div className="container mx-auto px-4 pt-4">
          <BreadcrumbsNavigation
            items={[
              { label: 'Home', href: '/' },
              { label: 'Features', href: '/features' },
              { label: 'Job Costing', isActive: true }
            ]}
            includeSchema={true}
          />
        </div>

        {/* Hero Section */}
        <section className="bg-gradient-to-br from-background via-background to-secondary py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-construction-dark mb-6">
                Real-Time Job Costing Software
                <span className="block text-construction-orange mt-2">
                  for Construction Contractors
                </span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Stop waiting 30 days for job cost reports. Track every dollar in real-time and know if your
                project is profitable today, not next month. Catch budget overruns within 24 hours, not 30 days.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="hero" size="lg" className="group" asChild>
                  <Link to="/auth">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/calculator">
                    Calculate ROI
                  </Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-6">
                ✓ 14-day free trial • ✓ No credit card required • ✓ Unlimited users
              </p>
            </div>
          </div>
        </section>

        {/* The Problem Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                The Real Cost of Delayed Job Costing
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-background p-6 rounded-lg border border-destructive/20">
                  <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Budget Overruns Go Undetected</h3>
                  <p className="text-muted-foreground">
                    Traditional monthly accounting means you discover a $10,000 overrun after you've already
                    spent $5,000-$7,000. With real-time costing, you catch it at day 3-5, limiting losses to $500-$1,000.
                  </p>
                </div>
                <div className="bg-background p-6 rounded-lg border border-destructive/20">
                  <Clock className="h-12 w-12 text-destructive mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Month-End Takes 3+ Days</h3>
                  <p className="text-muted-foreground">
                    Contractors waste 10-15 hours per week chasing down receipts, reconciling timesheets,
                    and waiting for job cost reports. Your accountant bills you for hours of cleanup work.
                  </p>
                </div>
                <div className="bg-background p-6 rounded-lg border border-destructive/20">
                  <TrendingUp className="h-12 w-12 text-destructive mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Profit Margins Suffer</h3>
                  <p className="text-muted-foreground">
                    CFMA research shows contractors with real-time job costing have 8-12% higher profit margins
                    compared to those using monthly accounting cycles. The average contractor leaves $50,000+ on the table annually.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Solution Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                How BuildDesk Solves This
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-muted/30 p-6 rounded-lg">
                  <CheckCircle className="h-12 w-12 text-construction-orange mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Instant Cost Capture</h3>
                  <p className="text-muted-foreground mb-4">
                    Field crews log time via mobile app with GPS verification. Scan receipts with your phone.
                    Costs are automatically allocated to projects as they're incurred.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Mobile time tracking with GPS</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Receipt scanning with AI extraction</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Automatic cost code allocation</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/30 p-6 rounded-lg">
                  <DollarSign className="h-12 w-12 text-construction-orange mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Real-Time Profitability</h3>
                  <p className="text-muted-foreground mb-4">
                    View budget vs actual reports updated in real-time. Get automatic alerts when projects
                    trend over budget. See profit margins for every project on your dashboard.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Live budget vs actual tracking</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Automated overrun alerts</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Daily profitability dashboard</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 bg-construction-orange/10 p-8 rounded-lg border border-construction-orange/20">
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-4">The BuildDesk Difference</h3>
                  <div className="grid md:grid-cols-3 gap-6 text-center">
                    <div>
                      <div className="text-4xl font-bold text-construction-orange mb-2">24 hours</div>
                      <div className="text-sm text-muted-foreground">to detect overruns vs 30+ days</div>
                    </div>
                    <div>
                      <div className="text-4xl font-bold text-construction-orange mb-2">5 minutes</div>
                      <div className="text-sm text-muted-foreground">month-end close vs 3 days</div>
                    </div>
                    <div>
                      <div className="text-4xl font-bold text-construction-orange mb-2">8-12%</div>
                      <div className="text-sm text-muted-foreground">higher profit margins</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                How to Track Job Costs in Real-Time
              </h2>
              <div className="space-y-6">
                {howToSteps.map((step, index) => (
                  <div key={index} className="bg-background p-6 rounded-lg border">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-construction-orange text-white flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">{step.name}</h3>
                        <p className="text-muted-foreground">{step.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                Frequently Asked Questions
              </h2>
              <GEOOptimizedFAQ faqs={faqs} />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-construction-orange text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to See Your Real Profit Margins?
              </h2>
              <p className="text-xl mb-8 opacity-90">
                Start your 14-day free trial today. No credit card required.
                See real-time job costing in action from day one.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="secondary" size="lg" className="group" asChild>
                  <Link to="/auth">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="bg-transparent text-white border-white hover:bg-white/10" asChild>
                  <Link to="/pricing">
                    View Pricing
                  </Link>
                </Button>
              </div>
              <p className="text-sm mt-6 opacity-75">
                $350/month • Unlimited users • QuickBooks integration included
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default JobCostingPage;
