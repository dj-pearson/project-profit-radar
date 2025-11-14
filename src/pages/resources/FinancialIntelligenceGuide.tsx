import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PageSEO, createArticleSchema, createFAQSchema } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, AlertTriangle, BarChart3, Clock, CheckCircle, ArrowRight, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";
import { GEOOptimizedFAQ } from "@/components/seo/GEOOptimizedFAQ";

const FinancialIntelligenceGuide = () => {
  const faqs = [
    {
      question: "What is financial intelligence in construction?",
      answer: "Financial intelligence in construction means having real-time visibility into project profitability, cash flow, and costs. Instead of waiting 30 days for accounting reports, you know exactly where every project stands financially at any moment, enabling data-driven decisions that protect profit margins."
    },
    {
      question: "How is financial intelligence different from traditional construction accounting?",
      answer: "Traditional accounting tells you what happened last month through monthly reports and reconciliation. Financial intelligence tells you what's happening right now through real-time job costing, live budget tracking, and predictive analytics. It's the difference between looking in the rearview mirror and having GPS navigation for your finances."
    },
    {
      question: "Why do small contractors need financial intelligence?",
      answer: "Small contractors operate on thin margins (typically 5-15%) where a single project overrun can wipe out quarterly profits. Financial intelligence catches budget problems within 24 hours instead of 30 days, limiting losses from $5,000-$10,000 to just $500-$1,000. For contractors with $5M revenue, this typically adds $400,000-$600,000 to annual profit."
    },
    {
      question: "Can I get financial intelligence without expensive enterprise software?",
      answer: "Yes. BuildDesk brings enterprise-level financial intelligence to small contractors for $350/month with unlimited users. Traditional enterprise tools like Procore charge $500+ per user per month, making them unaffordable for most small contractors. BuildDesk is purpose-built for the $1M-$50M revenue segment."
    },
    {
      question: "How long does it take to implement financial intelligence?",
      answer: "Most contractors see their first real-time profitability reports within 2-3 days of starting with BuildDesk. Full implementation (QuickBooks integration, crew onboarding, historical data migration) typically takes 7-14 days. You'll start catching budget overruns earlier immediately."
    }
  ];

  const supportingArticles = [
    {
      title: "The Real Cost of Delayed Job Costing (And How to Fix It)",
      description: "Why waiting 30 days for job cost reports costs contractors $50,000+ annually",
      icon: DollarSign,
      link: "/resources/real-cost-delayed-job-costing",
      readTime: "8 min"
    },
    {
      title: "Construction Budget vs Actual: Complete Tracking Guide",
      description: "Step-by-step system for tracking budget vs actual in real-time",
      icon: BarChart3,
      link: "/resources/budget-vs-actual-tracking-guide",
      readTime: "12 min"
    },
    {
      title: "How to Calculate True Construction Project Profitability",
      description: "Stop missing indirect costs that eat 8-12% of your margins",
      icon: Calculator,
      link: "/resources/calculate-project-profitability",
      readTime: "10 min"
    },
    {
      title: "Construction Cash Flow Management for Small Contractors",
      description: "Forecast cash 90 days out and eliminate cash crunches",
      icon: TrendingUp,
      link: "/resources/cash-flow-management-guide",
      readTime: "15 min"
    },
    {
      title: "Reading Construction Financial Statements: A Contractor's Guide",
      description: "Understand WIP schedules, job cost reports, and P&L by project",
      icon: BookOpen,
      link: "/resources/reading-financial-statements",
      readTime: "11 min"
    },
    {
      title: "Why QuickBooks Alone Isn't Enough for Construction",
      description: "What QuickBooks can't do and why you need construction-specific tools",
      icon: AlertTriangle,
      link: "/resources/quickbooks-limitations-construction",
      readTime: "9 min"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title="Financial Intelligence for Construction Contractors: Complete Guide"
        description="Master financial intelligence for construction. Learn real-time job costing, cash flow forecasting, and profitability tracking. Stop waiting 30 days for reports. Improve margins by 8-12%."
        keywords={[
          'construction financial intelligence',
          'real-time job costing',
          'construction profitability',
          'construction financial management',
          'contractor financial control',
          'construction budget tracking',
          'cash flow forecasting construction'
        ]}
        canonicalUrl="https://builddesk.com/resources/financial-intelligence-guide"
        schema={[
          createArticleSchema(
            "Financial Intelligence for Construction Contractors: Complete Guide",
            "Comprehensive guide to implementing real-time financial intelligence in your construction business",
            "2025-11-14",
            "2025-11-14",
            "BuildDesk Team"
          ),
          createFAQSchema(faqs)
        ]}
      />

      <Header />

      <main className="py-12">
        <div className="container mx-auto px-4">
          <BreadcrumbsNavigation
            items={[
              { label: "Home", href: "/" },
              { label: "Resources", href: "/resources" },
              { label: "Financial Intelligence Guide" }
            ]}
          />

          {/* Hero Section */}
          <div className="max-w-4xl mx-auto mt-8 mb-12">
            <Badge className="mb-4">Pillar Guide</Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-6">
              Financial Intelligence for Construction Contractors
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Stop waiting 30 days for financial reports. Learn how to implement real-time financial
              intelligence that catches budget overruns within 24 hours and improves profit margins by 8-12%.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button variant="default" size="lg" asChild>
                <Link to="/auth">
                  Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/features/financial-management">
                  See Financial Features
                </Link>
              </Button>
            </div>
          </div>

          {/* Introduction */}
          <div className="max-w-4xl mx-auto mb-16">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">What is Financial Intelligence in Construction?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  <strong>Financial intelligence</strong> is the ability to know your true financial position
                  in real-time, not 30 days later. For construction contractors, this means:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-construction-orange mr-3 mt-0.5 flex-shrink-0" />
                    <span><strong>Real-time job costing</strong> that tracks costs as they occur, not weeks later</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-construction-orange mr-3 mt-0.5 flex-shrink-0" />
                    <span><strong>Live profitability</strong> showing which projects are making or losing money today</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-construction-orange mr-3 mt-0.5 flex-shrink-0" />
                    <span><strong>Cash flow forecasting</strong> that predicts your cash position 30-90 days out</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-construction-orange mr-3 mt-0.5 flex-shrink-0" />
                    <span><strong>Budget alerts</strong> that notify you when projects trend over budget</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-construction-orange mr-3 mt-0.5 flex-shrink-0" />
                    <span><strong>Financial dashboards</strong> showing KPIs across all projects at a glance</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* The Problem */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark mb-6">
              Why Most Contractors Operate Financially Blind
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-destructive/20">
                <CardHeader>
                  <AlertTriangle className="h-10 w-10 text-destructive mb-2" />
                  <CardTitle>30-Day Reporting Lag</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Traditional monthly accounting means you discover budget overruns 30-45 days after they start.
                    By the time you get the report, you've already overspent $5,000-$10,000.
                  </p>
                  <div className="bg-muted p-3 rounded text-sm">
                    <strong>Example:</strong> A $100K project goes 10% over budget. With monthly reporting,
                    you discover it at day 30 after overspending $7,000. With real-time intelligence, you catch
                    it at day 5 after overspending only $1,000.
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/20">
                <CardHeader>
                  <Clock className="h-10 w-10 text-destructive mb-2" />
                  <CardTitle>3-Day Month-End Close</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Contractors waste 10-15 hours per week chasing receipts, reconciling timesheets,
                    and waiting for job cost reports. Month-end close takes 3-5 days of accounting time.
                  </p>
                  <div className="bg-muted p-3 rounded text-sm">
                    <strong>The Cost:</strong> At $75/hour for accounting, that's $900-$1,250 per month
                    in accounting fees just for data cleanup and reconciliation. Plus the opportunity cost
                    of not knowing your numbers while waiting.
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6 bg-construction-orange/10 border-construction-orange/20">
              <CardContent className="pt-6">
                <p className="text-center text-lg">
                  <strong>According to CFMA research:</strong> Contractors with real-time financial intelligence
                  have <span className="text-construction-orange font-bold text-2xl">8-12% higher profit margins</span> compared
                  to those using traditional monthly accounting cycles.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* The Solution */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark mb-6">
              The BuildDesk Approach to Financial Intelligence
            </h2>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-construction-orange text-white flex items-center justify-center font-bold">1</div>
                    <CardTitle>Instant Cost Capture</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Field crews log time via mobile app with GPS verification. Scan receipts with your phone.
                    Forward vendor emails. Costs are automatically allocated to projects as they're incurred.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-muted/50 p-3 rounded text-center">
                      <strong className="text-construction-orange">Labor</strong>
                      <p className="text-xs mt-1">Mobile time tracking</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded text-center">
                      <strong className="text-construction-orange">Materials</strong>
                      <p className="text-xs mt-1">Receipt scanning</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded text-center">
                      <strong className="text-construction-orange">Equipment</strong>
                      <p className="text-xs mt-1">Usage tracking</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded text-center">
                      <strong className="text-construction-orange">Subs</strong>
                      <p className="text-xs mt-1">Invoice processing</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-construction-orange text-white flex items-center justify-center font-bold">2</div>
                    <CardTitle>Real-Time Analytics</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Your financial dashboard updates throughout the day as costs are captured. See profit margins,
                    budget performance, and cash flow in real-time across all projects.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Budget vs actual by project and cost code</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Profit margin tracking with trend analysis</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Cash flow forecast 30-90 days out</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2">•</span>
                      <span>Automated overrun alerts and notifications</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-construction-orange text-white flex items-center justify-center font-bold">3</div>
                    <CardTitle>5-Minute Month-End Close</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Because costs are captured in real-time all month, month-end is just generating reports.
                    No more 3-day reconciliation marathons. Your accountant focuses on tax planning and strategy
                    instead of data cleanup.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Supporting Articles */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark mb-6">
              Deep Dive Articles
            </h2>
            <p className="text-muted-foreground mb-8">
              Explore our comprehensive guides on each aspect of construction financial intelligence.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {supportingArticles.map((article, index) => (
                <Card key={index} className="hover:border-construction-orange/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <article.icon className="h-8 w-8 text-construction-orange flex-shrink-0" />
                      <Badge variant="outline">{article.readTime}</Badge>
                    </div>
                    <CardTitle className="text-lg mt-3">
                      <Link to={article.link} className="hover:text-construction-orange transition-colors">
                        {article.title}
                      </Link>
                    </CardTitle>
                    <CardDescription>{article.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={article.link}>
                        Read Article <ArrowRight className="ml-2 h-3 w-3" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="max-w-4xl mx-auto mb-16">
            <Card className="bg-gradient-to-br from-construction-orange/10 to-construction-orange/5">
              <CardHeader>
                <CardTitle className="text-3xl text-center">The ROI of Financial Intelligence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6 text-center mb-8">
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
                <div className="text-center p-6 bg-background rounded-lg">
                  <p className="text-lg mb-4">
                    <strong>Average contractor with $5M revenue:</strong> Financial intelligence adds
                    <span className="text-construction-orange font-bold text-2xl mx-2">$400,000-$600,000</span>
                    to annual profit
                  </p>
                  <Button size="lg" asChild>
                    <Link to="/calculator">Calculate Your ROI</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark mb-8">
              Frequently Asked Questions
            </h2>
            <GEOOptimizedFAQ faqs={faqs} />
          </div>

          {/* CTA */}
          <div className="max-w-4xl mx-auto">
            <Card className="bg-construction-orange text-white border-0">
              <CardContent className="pt-6 text-center">
                <h2 className="text-3xl font-bold mb-4">
                  Ready to Implement Financial Intelligence?
                </h2>
                <p className="text-xl mb-6 opacity-90">
                  See real-time profitability reports within 2-3 days. Start your 14-day free trial today.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button variant="secondary" size="lg" asChild>
                    <Link to="/auth">
                      Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" className="bg-transparent text-white border-white hover:bg-white/10" asChild>
                    <Link to="/features/financial-management">
                      Explore Features
                    </Link>
                  </Button>
                </div>
                <p className="text-sm mt-6 opacity-75">
                  $350/month • Unlimited users • QuickBooks integration included
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FinancialIntelligenceGuide;
