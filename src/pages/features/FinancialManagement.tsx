import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, DollarSign, BarChart3, Calculator, TrendingUp, Wallet, FileText } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { PageSEO, createFAQSchema, createHowToSchema } from '@/components/seo/PageSEO';
import { GEOOptimizedFAQ } from '@/components/seo/GEOOptimizedFAQ';

const FinancialManagementPage = () => {
  const faqs = [
    {
      question: "What is construction financial management software?",
      answer: "Construction financial management software helps contractors track project profitability, manage cash flow, monitor budgets, and maintain financial control across all projects. Unlike general accounting software, it's purpose-built for construction's unique needs like job costing, change orders, and project-based profitability."
    },
    {
      question: "How is this different from QuickBooks?",
      answer: "QuickBooks is designed for general business accounting. BuildDesk is built specifically for construction financial management with real-time job costing, project profitability tracking, change order management, and field cost capture. BuildDesk integrates with QuickBooks to give you both real-time project visibility and proper accounting in one system."
    },
    {
      question: "Can I see profitability by project in real-time?",
      answer: "Yes! BuildDesk's financial dashboard shows live profitability for every project. As labor hours are logged and costs are captured, profit margins update in real-time. You can see which projects are profitable, which are losing money, and exactly where costs are trending."
    },
    {
      question: "How does cash flow forecasting work?",
      answer: "BuildDesk analyzes your project schedules, upcoming invoices, vendor payment terms, and historical payment patterns to forecast your cash position 30-90 days out. You'll see exactly when money is coming in vs going out, helping you avoid cash crunches before they happen."
    },
    {
      question: "Do I still need an accountant?",
      answer: "Yes, but you'll need them less. BuildDesk handles day-to-day financial management, job costing, and reporting, reducing your accountant's workload significantly. Your accountant can focus on tax planning and strategic advice instead of data cleanup and reconciliation. Most contractors report reducing accountant hours by 50-70%."
    }
  ];

  const howToSteps = [
    {
      name: "Set up your financial structure",
      text: "Configure your chart of accounts, cost codes, and budget templates. BuildDesk includes construction-specific templates for most trades, or import your existing structure from QuickBooks."
    },
    {
      name: "Connect your financial systems",
      text: "Integrate QuickBooks for accounting, connect your bank for real-time balances, and link Stripe for payment processing. BuildDesk becomes your financial command center."
    },
    {
      name: "Capture costs in real-time",
      text: "Field crews log time, receipts are scanned, vendor invoices are processed - all costs flow automatically into the right projects and cost codes as they're incurred."
    },
    {
      name: "Monitor financial health daily",
      text: "Check your financial dashboard each morning. See project profitability, cash flow forecast, budget performance, and financial KPIs at a glance. Make data-driven decisions with confidence."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title="Construction Financial Management Software - Real-Time Financial Control"
        description="Construction financial management software for small contractors. Track project profitability, manage cash flow, and maintain financial control across all projects. $350/month, unlimited users."
        keywords={[
          'construction financial management',
          'construction financial software',
          'contractor financial management',
          'construction profitability tracking',
          'construction cash flow management',
          'construction financial dashboard',
          'contractor accounting software'
        ]}
        canonicalUrl="https://builddesk.com/features/financial-management"
        schema={[
          createHowToSchema("How to Implement Construction Financial Management", howToSteps),
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
                Construction Financial Management
                <span className="block text-construction-orange mt-2">
                  Complete Financial Control for Small Contractors
                </span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Financial command center built for construction. Track project profitability in real-time,
                forecast cash flow 90 days out, and close your books in 5 minutes instead of 3 days.
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
                ✓ 14-day free trial • ✓ No credit card required • ✓ QuickBooks integration included
              </p>
            </div>
          </div>
        </section>

        {/* The Problem Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                Why Traditional Accounting Fails Construction Contractors
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-background p-6 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-3">❌ Project-Level Blindness</h3>
                  <p className="text-muted-foreground text-sm">
                    General accounting shows company-wide P&L but can't tell you which specific projects
                    are making or losing money until it's too late.
                  </p>
                </div>
                <div className="bg-background p-6 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-3">❌ 30-Day Lag</h3>
                  <p className="text-muted-foreground text-sm">
                    Traditional month-end close takes 3-5 days. By the time you see last month's numbers,
                    you're already deep into this month's problems.
                  </p>
                </div>
                <div className="bg-background p-6 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-3">❌ Cash Flow Surprises</h3>
                  <p className="text-muted-foreground text-sm">
                    Without forecasting tools, you're blindsided by cash crunches. Contractors report
                    "constantly anxious" about making payroll despite profitable projects.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                Complete Financial Management for Construction
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="bg-muted/30 p-6 rounded-lg">
                  <DollarSign className="h-12 w-12 text-construction-orange mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Real-Time Job Costing</h3>
                  <p className="text-muted-foreground mb-4">
                    Track every dollar by project and cost code. See profitability update in real-time
                    as costs are captured in the field.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Labor, materials, equipment tracking</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Budget vs actual by cost code</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Live profit margin updates</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/30 p-6 rounded-lg">
                  <BarChart3 className="h-12 w-12 text-construction-orange mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Financial Dashboard</h3>
                  <p className="text-muted-foreground mb-4">
                    Your financial command center. See all critical metrics at a glance, updated in real-time
                    throughout the day.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Project profitability overview</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Cash flow position</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Budget performance across projects</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/30 p-6 rounded-lg">
                  <Wallet className="h-12 w-12 text-construction-orange mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Cash Flow Forecasting</h3>
                  <p className="text-muted-foreground mb-4">
                    Know your cash position 30-90 days out. See when payments are coming in and bills
                    are going out to avoid surprises.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>30/60/90 day forecasts</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Upcoming invoices & payments</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Cash crunch alerts</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/30 p-6 rounded-lg">
                  <Calculator className="h-12 w-12 text-construction-orange mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Change Order Management</h3>
                  <p className="text-muted-foreground mb-4">
                    Model change orders before approval. See exactly how they impact budget, schedule,
                    and profitability.
                  </p>
                  <ul className="space-y-1 text-sm">
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

                <div className="bg-muted/30 p-6 rounded-lg">
                  <TrendingUp className="h-12 w-12 text-construction-orange mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Financial Analytics</h3>
                  <p className="text-muted-foreground mb-4">
                    Understand trends, identify patterns, and make data-driven decisions with powerful
                    analytics built for construction.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Profit trend analysis</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Cost performance metrics</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Custom financial reports</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/30 p-6 rounded-lg">
                  <FileText className="h-12 w-12 text-construction-orange mb-4" />
                  <h3 className="text-xl font-semibold mb-3">QuickBooks Integration</h3>
                  <p className="text-muted-foreground mb-4">
                    Seamless 2-way sync with QuickBooks Online. Maintain proper books while getting
                    construction-specific insights.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Automatic invoice sync</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Expense categorization</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Project-level GL codes</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section className="py-16 bg-construction-orange/10">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                The Financial Intelligence Advantage
              </h2>
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div className="bg-background p-6 rounded-lg">
                  <div className="text-5xl font-bold text-construction-orange mb-2">5 min</div>
                  <div className="text-sm text-muted-foreground">Month-end close vs 3 days</div>
                  <p className="text-xs mt-3 text-muted-foreground">
                    Real-time data means your books are always current. No more marathon reconciliation sessions.
                  </p>
                </div>
                <div className="bg-background p-6 rounded-lg">
                  <div className="text-5xl font-bold text-construction-orange mb-2">8-12%</div>
                  <div className="text-sm text-muted-foreground">Higher profit margins</div>
                  <p className="text-xs mt-3 text-muted-foreground">
                    CFMA data shows contractors with real-time financial management consistently outperform peers.
                  </p>
                </div>
                <div className="bg-background p-6 rounded-lg">
                  <div className="text-5xl font-bold text-construction-orange mb-2">50-70%</div>
                  <div className="text-sm text-muted-foreground">Less accountant time</div>
                  <p className="text-xs mt-3 text-muted-foreground">
                    Reduce accounting fees significantly while getting better financial visibility.
                  </p>
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
                How to Implement Construction Financial Management
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
                Take Control of Your Construction Finances
              </h2>
              <p className="text-xl mb-8 opacity-90">
                See project profitability in real-time, forecast cash flow 90 days out, and close your
                books in 5 minutes. Start your 14-day free trial today.
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

export default FinancialManagementPage;
