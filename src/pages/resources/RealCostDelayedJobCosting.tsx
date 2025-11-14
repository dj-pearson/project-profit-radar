import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PageSEO, createArticleSchema, createFAQSchema } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, DollarSign, TrendingUp, CheckCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";
import { GEOOptimizedFAQ } from "@/components/seo/GEOOptimizedFAQ";

const RealCostDelayedJobCosting = () => {
  const faqs = [
    {
      question: "What is delayed job costing?",
      answer: "Delayed job costing occurs when contractors track project costs through monthly accounting cycles rather than real-time data. The typical flow: field timesheets → weekly data entry → month-end payroll → 2-4 weeks later for reports. This means you discover problems 30+ days after they occurred."
    },
    {
      question: "How much does delayed job costing actually cost?",
      answer: "According to CFMA research, contractors with real-time job costing have 8-12% higher profit margins compared to those using monthly accounting cycles. For a contractor with $5M revenue, that's $400,000-$600,000 left on the table annually due to undetected overruns and missed opportunities."
    },
    {
      question: "Can't I just check my QuickBooks reports more often?",
      answer: "QuickBooks only shows costs after they've been entered and categorized, which typically happens weekly or monthly. It can't give you real-time project profitability because it doesn't know about labor hours worked today, materials purchased this morning, or equipment used this week until someone manually enters that data."
    },
    {
      question: "How quickly can I implement real-time job costing?",
      answer: "With BuildDesk, most contractors see their first real-time profitability reports within 2-3 days. Full implementation (crew onboarding, QuickBooks integration, budget templates) typically takes 7-14 days. You start catching overruns earlier immediately."
    },
    {
      question: "Is real-time job costing only for large contractors?",
      answer: "No! In fact, small contractors need it MORE because they have less margin for error. A single $10,000 overrun can wipe out a quarter's profit for a $2M contractor. BuildDesk brings enterprise-level real-time costing to small contractors for $350/month, making it affordable for companies with $1M-$50M revenue."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title="The Real Cost of Delayed Job Costing (And How to Fix It)"
        description="Delayed job costing costs contractors $50,000+ annually in missed overruns. Learn why waiting 30 days for reports hurts profits and how real-time tracking fixes it."
        keywords={[
          'delayed job costing',
          'real-time job costing',
          'construction job costing problems',
          'job costing mistakes',
          'construction profitability',
          'job cost tracking',
          'construction cost overruns'
        ]}
        canonicalUrl="https://builddesk.com/resources/real-cost-delayed-job-costing"
        schema={[
          createArticleSchema(
            "The Real Cost of Delayed Job Costing (And How to Fix It)",
            "Why waiting 30 days for job cost reports costs contractors $50,000+ annually and how to fix it",
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
              { label: "Financial Intelligence", href: "/resources/financial-intelligence-guide" },
              { label: "Real Cost of Delayed Job Costing" }
            ]}
          />

          {/* Hero / Answer-First Section */}
          <div className="max-w-4xl mx-auto mt-8 mb-12">
            <Badge className="mb-4">Financial Intelligence</Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-6">
              The Real Cost of Delayed Job Costing (And How to Fix It)
            </h1>

            {/* Answer-first paragraph for GEO optimization */}
            <Card className="bg-construction-orange/10 border-construction-orange/20 mb-8">
              <CardContent className="pt-6">
                <p className="text-lg leading-relaxed">
                  <strong>Most construction contractors wait 30 days for job cost reports.</strong> This delay costs
                  the average small contractor <span className="font-bold text-construction-orange">$50,000+ per year</span> in
                  missed budget overruns and lost profitability. Real-time job costing eliminates this lag by tracking
                  costs as they occur, not weeks later, allowing you to catch a $10,000 overrun at $500-$1,000 instead
                  of $7,000-$10,000.
                </p>
              </CardContent>
            </Card>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
              <span>By BuildDesk Team</span>
              <span>•</span>
              <span>November 14, 2025</span>
              <span>•</span>
              <span>8 min read</span>
            </div>
          </div>

          {/* What is Delayed Job Costing */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-construction-dark mb-6">
              What is Delayed Job Costing?
            </h2>
            <p className="text-muted-foreground mb-4 text-lg">
              Delayed job costing occurs when contractors track project costs through monthly accounting cycles
              rather than real-time data. The typical flow:
            </p>
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <p className="font-semibold">Field crew logs time on paper timesheets</p>
                  <p className="text-sm text-muted-foreground">Monday through Friday, timesheets pile up in the truck</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <p className="font-semibold">Office staff enters data weekly (or bi-weekly)</p>
                  <p className="text-sm text-muted-foreground">Data entry happens Friday afternoon or the following Monday</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <p className="font-semibold">Accountant processes payroll at month-end</p>
                  <p className="text-sm text-muted-foreground">Payroll runs on the last Friday or first Monday of the month</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold flex-shrink-0">4</div>
                <div>
                  <p className="font-semibold">Job cost report generated 2-4 weeks later</p>
                  <p className="text-sm text-muted-foreground">By the time you see the report, you're 30-45 days into the next month</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold flex-shrink-0">5</div>
                <div>
                  <p className="font-semibold text-destructive">Contractor discovers problems 30+ days after they occurred</p>
                  <p className="text-sm text-muted-foreground">Too late to prevent losses from compounding</p>
                </div>
              </div>
            </div>
          </div>

          {/* The Hidden Costs */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-construction-dark mb-6">
              The Hidden Costs of Delayed Job Costing
            </h2>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="border-destructive/20">
                <CardHeader>
                  <AlertTriangle className="h-10 w-10 text-destructive mb-2" />
                  <CardTitle>Budget Overruns Go Undetected</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    According to Construction Financial Management Association (CFMA), 62% of construction projects
                    experience budget overruns. The average contractor doesn't discover these overruns until the
                    project is 30-45 days into the work.
                  </p>
                  <div className="bg-muted p-3 rounded text-sm">
                    <strong>Real-world impact:</strong> A $100,000 project with 10% budget overrun costs $10,000.
                    If discovered at day 30, you've likely overspent $5,000-$7,000 already. With real-time costing,
                    you'd catch it at day 3-5, limiting losses to $500-$1,000.
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/20">
                <CardHeader>
                  <Clock className="h-10 w-10 text-destructive mb-2" />
                  <CardTitle>Cash Flow Problems Compound</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    When you don't know project profitability until month-end, you can't accurately forecast cash flow.
                    You might think you're profitable and take on new projects, only to discover you're actually losing
                    money on current work.
                  </p>
                  <div className="bg-muted p-3 rounded text-sm">
                    <strong>The cascade effect:</strong> Unprofitable projects drain cash → You delay vendor payments →
                    Vendors slow deliveries → Projects delay → More cash flow problems. All because you didn't know
                    the project was losing money 30 days ago.
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/20">
                <CardHeader>
                  <DollarSign className="h-10 w-10 text-destructive mb-2" />
                  <CardTitle>Profit Margins Suffer</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    CFMA research shows contractors with real-time job costing have 8-12% higher profit margins compared
                    to those using monthly accounting cycles.
                  </p>
                  <div className="bg-muted p-3 rounded text-sm">
                    <strong>By the numbers:</strong> Contractor with $5M annual revenue operating at 10% margins makes
                    $500K profit. With delayed costing reducing margins to 8%, they make only $400K. That's
                    <strong className="text-destructive"> $100,000 left on the table</strong> annually.
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-destructive/10 border-destructive/20">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-destructive" />
                  Month-End Takes 3+ Days
                </h3>
                <p className="text-muted-foreground mb-4">
                  Contractors waste 10-15 hours per week chasing down receipts, reconciling timesheets, and waiting
                  for job cost reports. Your accountant bills you for hours of cleanup work.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-background p-4 rounded">
                    <p className="font-semibold mb-2">Time Waste Breakdown:</p>
                    <ul className="text-sm space-y-1">
                      <li>• 5 hours: Chasing down paper timesheets</li>
                      <li>• 3 hours: Hunting for lost receipts</li>
                      <li>• 4 hours: Manual data entry</li>
                      <li>• 3 hours: Reconciliation and corrections</li>
                    </ul>
                    <p className="text-sm font-bold mt-2">Total: 15 hours/week wasted</p>
                  </div>
                  <div className="bg-background p-4 rounded">
                    <p className="font-semibold mb-2">Financial Cost:</p>
                    <ul className="text-sm space-y-1">
                      <li>• Accountant time: $75/hr × 15hrs = $1,125/week</li>
                      <li>• Monthly accounting fees: $4,500</li>
                      <li>• Annual waste: <strong className="text-destructive">$54,000</strong></li>
                    </ul>
                    <p className="text-sm mt-2 text-muted-foreground">
                      Plus opportunity cost of not knowing your numbers
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* How Real-Time Job Costing Solves This */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-construction-dark mb-6">
              How Real-Time Job Costing Solves This
            </h2>

            <div className="space-y-6">
              <Card className="bg-construction-orange/5 border-construction-orange/20">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-10 w-10 text-construction-orange" />
                    <CardTitle>Instant Cost Capture</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Field crews log time via mobile app with GPS verification. Scan receipts with your phone. Forward
                    vendor emails. Costs are automatically allocated to projects as they're incurred.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-background p-3 rounded text-center border border-construction-orange/20">
                      <strong className="text-construction-orange">Labor</strong>
                      <p className="text-xs mt-1">Mobile time tracking</p>
                      <p className="text-xs font-bold mt-2">Real-time</p>
                    </div>
                    <div className="bg-background p-3 rounded text-center border border-construction-orange/20">
                      <strong className="text-construction-orange">Materials</strong>
                      <p className="text-xs mt-1">Receipt scanning</p>
                      <p className="text-xs font-bold mt-2">Real-time</p>
                    </div>
                    <div className="bg-background p-3 rounded text-center border border-construction-orange/20">
                      <strong className="text-construction-orange">Equipment</strong>
                      <p className="text-xs mt-1">Usage tracking</p>
                      <p className="text-xs font-bold mt-2">Real-time</p>
                    </div>
                    <div className="bg-background p-3 rounded text-center border border-construction-orange/20">
                      <strong className="text-construction-orange">Subs</strong>
                      <p className="text-xs mt-1">Invoice processing</p>
                      <p className="text-xs font-bold mt-2">Real-time</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-6 w-6 text-construction-orange" />
                      Catch Overruns Early
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      Get automatic alerts when projects trend over budget. Instead of discovering a $10,000 overrun
                      after spending $7,000, catch it at $500-$1,000.
                    </p>
                    <div className="bg-muted p-3 rounded text-sm">
                      <strong>Time to detection:</strong><br />
                      Delayed costing: 30-45 days<br />
                      Real-time costing: <span className="text-construction-orange font-bold">24 hours</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-6 w-6 text-construction-orange" />
                      5-Minute Month-End
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      Because costs are captured in real-time all month, month-end is just generating reports. No more
                      3-day reconciliation marathons.
                    </p>
                    <div className="bg-muted p-3 rounded text-sm">
                      <strong>Time savings:</strong><br />
                      Traditional: 15 hours/week<br />
                      BuildDesk: <span className="text-construction-orange font-bold">2 hours/week</span><br />
                      <strong className="text-construction-orange">Save 13 hours/week</strong>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* The BuildDesk Difference */}
          <div className="max-w-4xl mx-auto mb-12">
            <Card className="bg-gradient-to-br from-construction-orange/10 to-construction-orange/5">
              <CardHeader>
                <CardTitle className="text-3xl text-center">The BuildDesk Difference</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6 text-center mb-6">
                  <div>
                    <div className="text-4xl font-bold text-construction-orange mb-2">24 hours</div>
                    <div className="text-sm text-muted-foreground">to detect overruns<br />vs 30+ days</div>
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-construction-orange mb-2">5 minutes</div>
                    <div className="text-sm text-muted-foreground">month-end close<br />vs 3 days</div>
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-construction-orange mb-2">8-12%</div>
                    <div className="text-sm text-muted-foreground">higher profit<br />margins</div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-lg mb-4">
                    Stop leaving $50,000+ on the table every year. See your real profit margins today, not 30 days later.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button size="lg" asChild>
                      <Link to="/auth">
                        Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="lg" asChild>
                      <Link to="/features/job-costing">
                        Learn More About Job Costing
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-construction-dark mb-8">
              Frequently Asked Questions
            </h2>
            <GEOOptimizedFAQ faqs={faqs} />
          </div>

          {/* Related Articles */}
          <div className="max-w-4xl mx-auto mb-12">
            <h3 className="text-2xl font-bold text-construction-dark mb-6">
              Related Articles
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    <Link to="/resources/financial-intelligence-guide" className="hover:text-construction-orange">
                      Financial Intelligence for Construction Contractors
                    </Link>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Complete guide to real-time financial management</p>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    <Link to="/features/job-costing" className="hover:text-construction-orange">
                      Real-Time Job Costing Software
                    </Link>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">See how BuildDesk tracks costs in real-time</p>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RealCostDelayedJobCosting;
