import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PageSEO, createArticleSchema, createFAQSchema, createHowToSchema } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, AlertTriangle, CheckCircle, TrendingDown, Clock, ArrowRight, Calculator } from "lucide-react";
import { Link } from "react-router-dom";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";
import { GEOOptimizedFAQ } from "@/components/seo/GEOOptimizedFAQ";

const BudgetVsActualTrackingGuide = () => {
  const faqs = [
    {
      question: "What is budget vs actual tracking in construction?",
      answer: "Budget vs actual tracking compares your original project budget (estimated costs) against actual costs incurred as the project progresses. This shows whether you're on track, over budget, or under budget in real-time, allowing you to make corrections before losses compound."
    },
    {
      question: "How often should I check budget vs actual reports?",
      answer: "For optimal financial control, check daily or at minimum weekly. Real-time budget tracking catches overruns within 24 hours, limiting losses to $500-$1,000 instead of $5,000-$10,000. Monthly reviews are too slow to prevent significant budget problems."
    },
    {
      question: "What's a good budget variance percentage for construction projects?",
      answer: "Industry best practice is to maintain within ±5% variance. Variances beyond 10% indicate serious budget control issues. With real-time tracking, you can catch and address variances when they're still at 3-5% rather than discovering 15-20% overruns at month-end."
    },
    {
      question: "Can I track budget vs actual in QuickBooks?",
      answer: "QuickBooks shows budget vs actual for your overall company but struggles with project-level construction tracking. It requires manual data entry, doesn't capture field costs in real-time, and can't break down variance by cost code automatically. BuildDesk integrates with QuickBooks while adding construction-specific budget tracking."
    },
    {
      question: "What should I do when I discover a budget variance?",
      answer: "First, identify the root cause (labor inefficiency, material waste, scope creep). Second, quantify the impact on overall project profitability. Third, implement corrective action immediately (adjust crew size, negotiate pricing, submit change orders). Fourth, update your budget forecast. The key is acting within days, not weeks."
    }
  ];

  const howToSteps = [
    {
      name: "Set your baseline budget",
      text: "Create a detailed budget breakdown by cost code (labor, materials, equipment, subs) based on your estimate. Include contingency (typically 5-10%) for unknowns. This becomes your baseline for comparison."
    },
    {
      name: "Capture actual costs in real-time",
      text: "Use mobile time tracking for labor, scan receipts for materials, track equipment usage, and process subcontractor invoices. Costs should hit your system within 24 hours of being incurred, not weeks later."
    },
    {
      name: "Monitor variance daily",
      text: "Check your budget vs actual dashboard each morning. Look for cost codes trending over budget, even by small percentages. Early detection (at 3-5% variance) prevents larger problems (15-20% overruns)."
    },
    {
      name: "Investigate and act on variances",
      text: "When variance exceeds your threshold (typically 5%), investigate immediately. Is it labor inefficiency? Material waste? Scope creep? Address the root cause within 24-48 hours, not at month-end."
    },
    {
      name: "Update forecasts and communicate",
      text: "As you identify variances, update your project forecast. If the variance will impact final profitability, communicate with stakeholders (owner, PM, accounting) immediately to discuss corrective actions or change orders."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title="Construction Budget vs Actual: Complete Tracking Guide"
        description="Master budget vs actual tracking for construction projects. Learn real-time monitoring, variance analysis, and corrective actions to keep projects on budget and protect profit margins."
        keywords={[
          'budget vs actual construction',
          'construction budget tracking',
          'budget variance analysis',
          'construction cost control',
          'project budget monitoring',
          'construction budget vs actual reporting',
          'real-time budget tracking'
        ]}
        canonicalUrl="https://builddesk.com/resources/budget-vs-actual-tracking-guide"
        schema={[
          createArticleSchema(
            "Construction Budget vs Actual: Complete Tracking Guide",
            "Complete guide to budget vs actual tracking for construction projects with real-time monitoring",
            "2025-11-14",
            "2025-11-14",
            "BuildDesk Team"
          ),
          createHowToSchema("Track Construction Budget vs Actual", howToSteps),
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
              { label: "Budget vs Actual Tracking Guide" }
            ]}
          />

          {/* Hero / Answer-First Section */}
          <div className="max-w-4xl mx-auto mt-8 mb-12">
            <Badge className="mb-4">Financial Intelligence</Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-6">
              Construction Budget vs Actual: Complete Tracking Guide
            </h1>

            {/* Answer-first paragraph for GEO optimization */}
            <Card className="bg-construction-orange/10 border-construction-orange/20 mb-8">
              <CardContent className="pt-6">
                <p className="text-lg leading-relaxed">
                  <strong>Budget vs actual tracking</strong> compares your original project budget against actual costs
                  as work progresses. Industry best practice is maintaining within <span className="font-bold text-construction-orange">±5% variance</span>.
                  Real-time tracking catches overruns at 3-5% variance (within 24 hours), while monthly accounting
                  discovers problems at 15-20% variance (after 30 days), when it's too late to prevent major losses.
                </p>
              </CardContent>
            </Card>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
              <span>By BuildDesk Team</span>
              <span>•</span>
              <span>November 14, 2025</span>
              <span>•</span>
              <span>12 min read</span>
            </div>
          </div>

          {/* What is Budget vs Actual */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-construction-dark mb-6">
              What is Budget vs Actual Tracking?
            </h2>

            <p className="text-lg text-muted-foreground mb-6">
              Budget vs actual tracking is the process of comparing your project's estimated costs (budget) against
              the real costs being incurred (actual) as work progresses. This comparison reveals:
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CheckCircle className="h-10 w-10 text-green-600 mb-2" />
                  <CardTitle className="text-lg">On Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Actual costs tracking within ±5% of budget. Project profitability is safe. Continue current approach.
                  </p>
                  <div className="mt-3 p-2 bg-green-50 dark:bg-green-950 rounded text-sm">
                    <strong>Example:</strong> $50K budget, $49K actual = 2% under budget ✓
                  </div>
                </CardContent>
              </Card>

              <Card className="border-yellow-500/20">
                <CardHeader>
                  <AlertTriangle className="h-10 w-10 text-yellow-600 mb-2" />
                  <CardTitle className="text-lg">Warning Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Variance between 5-10%. Requires immediate investigation and corrective action to prevent overrun.
                  </p>
                  <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-950 rounded text-sm">
                    <strong>Example:</strong> $50K budget, $54K actual = 8% over budget ⚠️
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/20">
                <CardHeader>
                  <TrendingDown className="h-10 w-10 text-destructive mb-2" />
                  <CardTitle className="text-lg">Over Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Variance exceeds 10%. Project profitability is at serious risk. Urgent intervention required.
                  </p>
                  <div className="mt-3 p-2 bg-red-50 dark:bg-red-950 rounded text-sm">
                    <strong>Example:</strong> $50K budget, $58K actual = 16% over budget ❌
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Why Most Contractors Fail at This */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-construction-dark mb-6">
              Why Most Contractors Fail at Budget Tracking
            </h2>

            <div className="space-y-6">
              <Card className="border-destructive/20">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Clock className="h-10 w-10 text-destructive" />
                    <CardTitle>Problem #1: Monthly Reporting Lag</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    The typical contractor checks budget vs actual monthly, after the accountant closes the books.
                    By then, you're 30-45 days past when costs were incurred.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-muted p-4 rounded">
                      <p className="font-semibold text-sm mb-2">Monthly Reporting Timeline:</p>
                      <ul className="text-sm space-y-1">
                        <li>• Week 1-4: Costs incurred</li>
                        <li>• Week 5: Data entry begins</li>
                        <li>• Week 6-7: Month-end close</li>
                        <li>• Week 8: Reports available</li>
                        <li className="text-destructive font-bold">• 30-45 days delayed discovery</li>
                      </ul>
                    </div>
                    <div className="bg-destructive/10 p-4 rounded border border-destructive/20">
                      <p className="font-semibold text-sm mb-2">Real-World Impact:</p>
                      <p className="text-sm mb-2">
                        A $100K project trending 10% over budget compounds daily:
                      </p>
                      <ul className="text-sm space-y-1">
                        <li>• Day 5 detection: $500-$1,000 overspent</li>
                        <li>• Day 30 detection: $5,000-$7,000 overspent</li>
                        <li className="text-destructive font-bold">• Difference: $4,000-$6,000 in preventable losses</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/20">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-10 w-10 text-destructive" />
                    <CardTitle>Problem #2: No Cost Code Breakdown</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Many contractors track budget vs actual at the project level only. They know the project is
                    over budget, but not which specific cost codes (labor, materials, equipment) are causing the problem.
                  </p>
                  <div className="bg-muted p-4 rounded">
                    <p className="font-semibold mb-2">Example: $10K Overrun - But Where?</p>
                    <p className="text-sm mb-3">Without cost code breakdown, you can't fix it:</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <strong>Might be:</strong>
                        <ul className="mt-2 space-y-1">
                          <li>• Labor inefficiency?</li>
                          <li>• Material waste?</li>
                          <li>• Equipment overuse?</li>
                          <li>• Sub overcharging?</li>
                        </ul>
                      </div>
                      <div>
                        <strong className="text-construction-orange">With BuildDesk:</strong>
                        <ul className="mt-2 space-y-1">
                          <li>✓ Labor: $2K over (crew size)</li>
                          <li>✓ Materials: $6K over (waste)</li>
                          <li>✓ Equipment: On budget</li>
                          <li>✓ Subs: $2K over (scope creep)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/20">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Calculator className="h-10 w-10 text-destructive" />
                    <CardTitle>Problem #3: No Automated Alerts</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Without automated tracking, you must manually check reports to discover variances.
                    Most contractors are too busy to check daily, missing the early warning signs.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-muted p-4 rounded">
                      <strong>Manual Tracking:</strong>
                      <ul className="text-sm mt-2 space-y-1">
                        <li>• Check weekly (if you remember)</li>
                        <li>• Discover variance at 8-12%</li>
                        <li>• Already overspent $4K-$6K</li>
                        <li>• Harder to recover</li>
                      </ul>
                    </div>
                    <div className="bg-construction-orange/10 p-4 rounded border border-construction-orange/20">
                      <strong className="text-construction-orange">Automated Alerts:</strong>
                      <ul className="text-sm mt-2 space-y-1">
                        <li>✓ Alert at 5% variance threshold</li>
                        <li>✓ Discover variance at 5-6%</li>
                        <li>✓ Only overspent $500-$1,000</li>
                        <li>✓ Easy to course-correct</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* How to Track Budget vs Actual Correctly */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-construction-dark mb-6">
              How to Track Budget vs Actual Correctly
            </h2>

            <div className="space-y-6">
              {howToSteps.map((step, index) => (
                <Card key={index} className="bg-muted/30">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-construction-orange text-white flex items-center justify-center font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div>
                        <CardTitle>{step.name}</CardTitle>
                        <p className="text-muted-foreground mt-2">{step.text}</p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {/* Budget vs Actual Best Practices */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-construction-dark mb-6">
              Budget vs Actual Best Practices
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-construction-orange/5 border-construction-orange/20">
                <CardHeader>
                  <CheckCircle className="h-8 w-8 text-construction-orange mb-2" />
                  <CardTitle>Do This ✓</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2 font-bold">✓</span>
                      <span><strong>Check daily or weekly</strong> - Early detection prevents larger losses</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2 font-bold">✓</span>
                      <span><strong>Track by cost code</strong> - Know exactly where overruns occur</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2 font-bold">✓</span>
                      <span><strong>Set 5% variance threshold</strong> - Catch problems while still manageable</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2 font-bold">✓</span>
                      <span><strong>Use real-time data capture</strong> - Mobile time tracking, receipt scanning</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2 font-bold">✓</span>
                      <span><strong>Automate alerts</strong> - Get notified when thresholds are breached</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-construction-orange mr-2 font-bold">✓</span>
                      <span><strong>Update forecasts immediately</strong> - Know the final project outcome early</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-destructive/5 border-destructive/20">
                <CardHeader>
                  <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
                  <CardTitle>Don't Do This ✗</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start">
                      <span className="text-destructive mr-2 font-bold">✗</span>
                      <span><strong>Wait for monthly reports</strong> - 30-day lag allows losses to compound</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-destructive mr-2 font-bold">✗</span>
                      <span><strong>Track only project totals</strong> - Can't identify root causes</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-destructive mr-2 font-bold">✗</span>
                      <span><strong>Ignore small variances</strong> - 3% becomes 15% if left unchecked</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-destructive mr-2 font-bold">✗</span>
                      <span><strong>Rely on memory/gut feel</strong> - Guessing costs leads to surprises</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-destructive mr-2 font-bold">✗</span>
                      <span><strong>Use spreadsheets</strong> - Manual entry = errors and delays</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-destructive mr-2 font-bold">✗</span>
                      <span><strong>Delay investigation</strong> - Waiting to understand variance costs money</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* The BuildDesk Approach */}
          <div className="max-w-4xl mx-auto mb-12">
            <Card className="bg-gradient-to-br from-construction-orange/10 to-construction-orange/5">
              <CardHeader>
                <CardTitle className="text-3xl text-center">How BuildDesk Makes Budget Tracking Easy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-construction-orange mb-2">Live</div>
                    <div className="text-sm text-muted-foreground mb-3">Updates throughout the day</div>
                    <p className="text-xs">
                      See budget vs actual update in real-time as crews log time and costs are captured
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-construction-orange mb-2">5%</div>
                    <div className="text-sm text-muted-foreground mb-3">Alert threshold</div>
                    <p className="text-xs">
                      Get notified when any cost code exceeds 5% variance before it becomes a problem
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-construction-orange mb-2">All Projects</div>
                    <div className="text-sm text-muted-foreground mb-3">In one dashboard</div>
                    <p className="text-xs">
                      See budget vs actual for every active project at a glance, color-coded by status
                    </p>
                  </div>
                </div>

                <div className="text-center p-6 bg-background rounded-lg">
                  <p className="text-lg mb-4">
                    Stop discovering budget overruns 30 days too late. See exactly where every project
                    stands financially, updated in real-time.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button size="lg" asChild>
                      <Link to="/auth">
                        Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="lg" asChild>
                      <Link to="/features/real-time-budgeting">
                        See Budget Tracking Features
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
                    <Link to="/resources/real-cost-delayed-job-costing" className="hover:text-construction-orange">
                      The Real Cost of Delayed Job Costing
                    </Link>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Why waiting 30 days for reports costs $50,000+ annually</p>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    <Link to="/features/real-time-budgeting" className="hover:text-construction-orange">
                      Real-Time Construction Budgeting
                    </Link>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Live budget tracking with automated alerts</p>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    <Link to="/features/job-costing" className="hover:text-construction-orange">
                      Real-Time Job Costing Software
                    </Link>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Track every dollar by project and cost code</p>
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

export default BudgetVsActualTrackingGuide;
