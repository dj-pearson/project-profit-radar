import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, TrendingDown, LineChart, Shield, Zap } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { PageSEO, createFAQSchema, createHowToSchema } from '@/components/seo/PageSEO';
import { GEOOptimizedFAQ } from '@/components/seo/GEOOptimizedFAQ';

const RealTimeBudgetingPage = () => {
  const faqs = [
    {
      question: "What is real-time construction budgeting?",
      answer: "Real-time budgeting tracks your construction project costs as they happen, not weeks or months later. Instead of waiting for monthly reports, you see live budget vs actual updates throughout the day as labor hours are logged and materials are purchased."
    },
    {
      question: "How do budget alerts work in BuildDesk?",
      answer: "BuildDesk monitors your project spending continuously and sends automatic alerts when costs trend over budget. You can set custom thresholds (like 80% of budget consumed) and get notified via email or push notification before problems become expensive."
    },
    {
      question: "Can I see budget performance across all projects?",
      answer: "Yes! BuildDesk's financial dashboard shows budget vs actual for all active projects in one view. You can quickly identify which projects are on track, trending over, or coming in under budget, helping you prioritize attention where it's needed most."
    },
    {
      question: "How is this different from QuickBooks?",
      answer: "QuickBooks is designed for accounting, not construction project management. It shows you what you spent last month, but can't track costs by project in real-time or alert you to budget overruns as they're happening. BuildDesk integrates with QuickBooks to give you both real-time project visibility and proper accounting."
    },
    {
      question: "Do I need expensive enterprise software for real-time budgeting?",
      answer: "No. BuildDesk brings enterprise-level real-time budgeting to small contractors for $350/month with unlimited users. Tools like Procore charge $500+ per user per month, making them unaffordable for most small contractors."
    }
  ];

  const howToSteps = [
    {
      name: "Create your project budget",
      text: "Set up your budget by cost code (labor, materials, equipment, subs) using BuildDesk's templates or import from your estimating software. Define budget thresholds for alerts."
    },
    {
      name: "Track costs as they occur",
      text: "Field crews log time via mobile app, receipts are scanned and processed, and vendor invoices are captured. All costs are automatically allocated to the correct budget categories."
    },
    {
      name: "Monitor budget performance live",
      text: "View real-time budget vs actual on your dashboard. Charts and graphs update throughout the day as new costs are captured, showing exactly where you stand."
    },
    {
      name: "Get alerted to overruns early",
      text: "Receive automatic notifications when projects trend over budget. Catch problems within days instead of weeks, giving you time to course-correct before losses compound."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title="Real-Time Construction Budgeting Software - Live Budget Tracking"
        description="Real-time construction budgeting software with automated overrun alerts. Track budget vs actual live, not monthly. Catch budget problems within 24 hours. $350/month, unlimited users."
        keywords={[
          'real-time construction budgeting',
          'construction budget tracking',
          'budget vs actual construction',
          'construction budget alerts',
          'live construction budgeting',
          'construction cost overrun alerts',
          'construction budget software'
        ]}
        canonicalUrl="https://builddesk.com/features/real-time-budgeting"
        schema={[
          createHowToSchema("How to Implement Real-Time Construction Budgeting", howToSteps),
          createFAQSchema(faqs)
        ]}
      />

      <Header />

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-background via-background to-secondary py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-construction-dark mb-6">
                Real-Time Construction Budgeting
                <span className="block text-construction-orange mt-2">
                  Stop Budget Surprises Before They Start
                </span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                See live budget vs actual updates throughout the day. Get automatic alerts when projects
                trend over budget. Catch problems within 24 hours instead of waiting 30 days for monthly reports.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="hero" size="lg" className="group" asChild>
                  <Link to="/auth">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/pricing">
                    View Pricing
                  </Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-6">
                ✓ 14-day free trial • ✓ No credit card required • ✓ See live budgets from day one
              </p>
            </div>
          </div>
        </section>

        {/* The Problem Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                Why Monthly Budget Reports Cost You Money
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-background p-6 rounded-lg border border-destructive/20">
                  <TrendingDown className="h-12 w-12 text-destructive mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Discover Problems Too Late</h3>
                  <p className="text-muted-foreground mb-4">
                    Traditional monthly accounting means you discover budget overruns 30-45 days after they start.
                    By the time you get the report, you've already overspent $5,000-$10,000.
                  </p>
                  <div className="bg-muted/50 p-4 rounded text-sm">
                    <strong>Example:</strong> A $100K project goes 10% over budget. With monthly reporting,
                    you discover it at day 30 after overspending $7,000. With real-time budgeting, you catch
                    it at day 5 after overspending only $1,000.
                  </div>
                </div>
                <div className="bg-background p-6 rounded-lg border border-destructive/20">
                  <LineChart className="h-12 w-12 text-destructive mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Flying Blind Between Reports</h3>
                  <p className="text-muted-foreground mb-4">
                    Without real-time visibility, you're guessing at project profitability. You can't answer
                    simple questions like "Are we on budget?" or "Can we afford to add that change order?"
                  </p>
                  <div className="bg-muted/50 p-4 rounded text-sm">
                    <strong>The Cost:</strong> Contractors without real-time budgeting report feeling
                    "constantly anxious" about project finances and making decisions based on gut feel
                    instead of data.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                BuildDesk Real-Time Budgeting Features
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-muted/30 p-6 rounded-lg">
                  <Bell className="h-12 w-12 text-construction-orange mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Automated Budget Alerts</h3>
                  <p className="text-muted-foreground mb-4">
                    Set custom thresholds and get notified when projects trend over budget. No more surprises at month-end.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Email & push notifications</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Custom threshold rules</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Cost code-level alerts</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/30 p-6 rounded-lg">
                  <Zap className="h-12 w-12 text-construction-orange mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Live Budget Dashboard</h3>
                  <p className="text-muted-foreground mb-4">
                    See all your projects at a glance. Charts and graphs update in real-time as costs are captured.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Budget vs actual by project</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Cost trend analysis</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Profit margin tracking</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/30 p-6 rounded-lg">
                  <Shield className="h-12 w-12 text-construction-orange mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Change Order Impact</h3>
                  <p className="text-muted-foreground mb-4">
                    Model change orders before approval. See exactly how they'll impact your budget and profitability.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>What-if scenario modeling</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Automatic budget updates</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Profit impact analysis</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ROI Section */}
        <section className="py-16 bg-construction-orange/10">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
                The ROI of Real-Time Budgeting
              </h2>
              <div className="bg-background p-8 rounded-lg border">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Without Real-Time Budgeting</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <span className="text-destructive mr-2 font-bold">✗</span>
                        <span>Discover overruns 30+ days late</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-destructive mr-2 font-bold">✗</span>
                        <span>Losses compound while you wait for reports</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-destructive mr-2 font-bold">✗</span>
                        <span>Make decisions based on gut feel</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-destructive mr-2 font-bold">✗</span>
                        <span>Constant anxiety about project finances</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-destructive mr-2 font-bold">✗</span>
                        <span>8-12% lower profit margins</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-4">With BuildDesk</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <span className="text-construction-orange mr-2 font-bold">✓</span>
                        <span>Catch overruns within 24 hours</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-construction-orange mr-2 font-bold">✓</span>
                        <span>Course-correct before losses compound</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-construction-orange mr-2 font-bold">✓</span>
                        <span>Data-driven decision making</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-construction-orange mr-2 font-bold">✓</span>
                        <span>Sleep soundly knowing your numbers</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-construction-orange mr-2 font-bold">✓</span>
                        <span>8-12% higher profit margins</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="mt-8 pt-8 border-t text-center">
                  <p className="text-lg mb-4">
                    <strong>Average contractor with $5M revenue:</strong> Real-time budgeting adds
                    <span className="text-construction-orange font-bold text-2xl mx-2">$400,000-$600,000</span>
                    to annual profit
                  </p>
                  <Button variant="default" size="lg" asChild>
                    <Link to="/calculator">Calculate Your ROI</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                How to Implement Real-Time Budgeting
              </h2>
              <div className="space-y-6">
                {howToSteps.map((step, index) => (
                  <div key={index} className="bg-muted/30 p-6 rounded-lg border">
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
        <section className="py-16 bg-muted/30">
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
                Stop Budget Surprises Today
              </h2>
              <p className="text-xl mb-8 opacity-90">
                See live budget vs actual from day one. Get alerted to overruns before they compound.
                Start your 14-day free trial now.
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
                $350/month • Unlimited users • No credit card required for trial
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default RealTimeBudgetingPage;
