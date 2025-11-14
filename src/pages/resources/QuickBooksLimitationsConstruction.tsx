import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PageSEO, createArticleSchema, createFAQSchema } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle, ArrowRight, BarChart3, Clock, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";
import { GEOOptimizedFAQ } from "@/components/seo/GEOOptimizedFAQ";

const QuickBooksLimitationsConstruction = () => {
  const faqs = [
    {
      question: "Is QuickBooks good for construction companies?",
      answer: "QuickBooks is excellent for general business accounting but wasn't designed for construction's unique needs. It handles invoicing, expenses, and payroll well, but struggles with real-time job costing, project-level profitability tracking, and field cost capture. Most successful contractors use QuickBooks for accounting PLUS construction-specific software like BuildDesk for project management and real-time financial tracking."
    },
    {
      question: "What can't QuickBooks do for construction?",
      answer: "QuickBooks can't: capture field costs in real-time (requires manual entry), provide live project profitability (updates monthly), break down costs by detailed cost codes automatically, track budget vs actual at the cost code level, alert you to budget overruns as they happen, manage change orders with financial impact, or integrate time tracking with GPS verification for field crews."
    },
    {
      question: "Should I stop using QuickBooks for construction?",
      answer: "No! Keep QuickBooks for accounting, tax preparation, and financial statements. But add BuildDesk for real-time job costing, project management, and field operations. BuildDesk integrates with QuickBooks, syncing costs and invoices automatically so you maintain proper books while getting construction-specific insights QuickBooks can't provide."
    },
    {
      question: "How much does QuickBooks cost for construction?",
      answer: "QuickBooks Online Plus (needed for job costing) costs $65-$90/month for one user. But you'll still need separate tools for time tracking ($10-$20/user/month), project management ($20-$50/user/month), and field operations. BuildDesk includes all these features for $350/month with unlimited users, often cheaper than piecing together multiple tools."
    },
    {
      question: "Can QuickBooks track construction project costs in real-time?",
      answer: "No. QuickBooks only shows costs after they're manually entered and categorized, which typically happens weekly or monthly. It can't capture labor hours worked today, materials purchased this morning, or equipment used this week until someone enters that data. Real-time tracking requires construction-specific software that integrates with QuickBooks."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title="Why QuickBooks Alone Isn't Enough for Construction Companies"
        description="QuickBooks is great for accounting but wasn't built for construction. Learn what it can't do for job costing, project profitability, and field operations—and how to fill the gaps."
        keywords={[
          'quickbooks for construction',
          'quickbooks limitations construction',
          'quickbooks alternative contractors',
          'construction accounting software',
          'quickbooks vs construction software',
          'construction job costing software',
          'quickbooks construction problems'
        ]}
        canonicalUrl="https://builddesk.com/resources/quickbooks-limitations-construction"
        schema={[
          createArticleSchema(
            "Why QuickBooks Alone Isn't Enough for Construction Companies",
            "What QuickBooks can't do for construction and how to fill the gaps with construction-specific tools",
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
              { label: "Why QuickBooks Isn't Enough" }
            ]}
          />

          {/* Hero / Answer-First Section */}
          <div className="max-w-4xl mx-auto mt-8 mb-12">
            <Badge className="mb-4">Financial Intelligence</Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-6">
              Why QuickBooks Alone Isn't Enough for Construction Companies
            </h1>

            {/* Answer-first paragraph for GEO optimization */}
            <Card className="bg-construction-orange/10 border-construction-orange/20 mb-8">
              <CardContent className="pt-6">
                <p className="text-lg leading-relaxed">
                  <strong>QuickBooks is excellent for general business accounting</strong> but wasn't designed for
                  construction's unique needs. It handles invoicing, expenses, and payroll well, but can't provide
                  <span className="font-bold text-construction-orange"> real-time job costing</span>, project-level
                  profitability tracking, or field cost capture. Most successful contractors use QuickBooks for accounting
                  (taxes, financial statements) PLUS construction-specific software like BuildDesk for project management
                  and real-time financial tracking. The two integrate seamlessly.
                </p>
              </CardContent>
            </Card>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
              <span>By BuildDesk Team</span>
              <span>•</span>
              <span>November 14, 2025</span>
              <span>•</span>
              <span>9 min read</span>
            </div>
          </div>

          {/* What QuickBooks Does Well */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-construction-dark mb-6">
              What QuickBooks DOES Do Well
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Let's start with what QuickBooks excels at—because you should keep using it for these functions:
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CardHeader>
                  <CheckCircle className="h-10 w-10 text-green-600 mb-2" />
                  <CardTitle>Excellent for Accounting</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      <span><strong>General ledger management</strong> - Proper double-entry bookkeeping</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      <span><strong>Accounts payable/receivable</strong> - Track what you owe and what's owed to you</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      <span><strong>Invoicing & payments</strong> - Professional invoices and payment processing</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      <span><strong>Bank reconciliation</strong> - Match transactions to bank statements</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      <span><strong>Tax preparation</strong> - Reports your CPA needs at year-end</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      <span><strong>Financial statements</strong> - P&L, balance sheet, cash flow statement</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CheckCircle className="h-10 w-10 text-blue-600 mb-2" />
                  <CardTitle>Good for Basic Operations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">✓</span>
                      <span><strong>Expense tracking</strong> - Categorize business expenses</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">✓</span>
                      <span><strong>Mileage tracking</strong> - For tax deductions</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">✓</span>
                      <span><strong>Receipt capture</strong> - Mobile app for scanning receipts</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">✓</span>
                      <span><strong>Payroll processing</strong> - Through QuickBooks Payroll add-on</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">✓</span>
                      <span><strong>CPA collaboration</strong> - Accountants know QuickBooks well</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">✓</span>
                      <span><strong>Third-party integrations</strong> - Huge app ecosystem</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6 bg-muted/50">
              <CardContent className="pt-6">
                <p className="text-center">
                  <strong>Bottom line:</strong> QuickBooks is perfect for what it was designed for—<strong>general business accounting</strong>.
                  You should absolutely keep using it for these core accounting functions.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* What QuickBooks CAN'T Do */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-construction-dark mb-6">
              What QuickBooks CAN'T Do for Construction
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Here's where QuickBooks falls short for construction companies:
            </p>

            <div className="space-y-6">
              <Card className="border-destructive/20">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <XCircle className="h-10 w-10 text-destructive" />
                    <CardTitle>Can't Track Costs in Real-Time</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    QuickBooks only shows costs <strong>after they're manually entered</strong>. It can't capture
                    labor hours worked today, materials purchased this morning, or equipment used this week until
                    someone sits at a computer and enters that data.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-muted p-4 rounded">
                      <p className="font-semibold text-sm mb-2 text-destructive">QuickBooks Flow:</p>
                      <ul className="text-sm space-y-1">
                        <li>1. Costs incurred in the field</li>
                        <li>2. Paper timesheets collected</li>
                        <li>3. Office staff enters data weekly</li>
                        <li>4. Costs appear in QuickBooks</li>
                        <li className="font-bold text-destructive">Result: 5-7 day lag minimum</li>
                      </ul>
                    </div>
                    <div className="bg-construction-orange/10 p-4 rounded border border-construction-orange/20">
                      <p className="font-semibold text-sm mb-2 text-construction-orange">BuildDesk + QuickBooks:</p>
                      <ul className="text-sm space-y-1">
                        <li>1. Crew logs time via mobile app</li>
                        <li>2. Costs allocated to project instantly</li>
                        <li>3. QuickBooks syncs automatically</li>
                        <li>4. Books stay current</li>
                        <li className="font-bold text-construction-orange">Result: Real-time + proper accounting</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/20">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-10 w-10 text-destructive" />
                    <CardTitle>Can't Show Project Profitability Live</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    QuickBooks can generate job cost reports, but only <strong>after month-end close</strong>. You
                    discover budget overruns 30-45 days after they start, when it's too late to prevent major losses.
                  </p>
                  <div className="bg-destructive/10 p-4 rounded border border-destructive/20">
                    <p className="font-semibold mb-2">Real-World Example:</p>
                    <p className="text-sm mb-3">
                      A $100,000 project goes 10% over budget on labor. With QuickBooks alone:
                    </p>
                    <ul className="text-sm space-y-2">
                      <li>• <strong>Day 1-5:</strong> Labor inefficiency begins (you don't know)</li>
                      <li>• <strong>Day 6-30:</strong> Overrun compounds daily (you still don't know)</li>
                      <li>• <strong>Day 31-45:</strong> Month-end close happens</li>
                      <li>• <strong>Day 46:</strong> You discover you're $7,000-$10,000 over budget</li>
                      <li className="text-destructive font-bold pt-2">• <strong>Impact:</strong> Too late to recover. Entire project profit wiped out.</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/20">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Clock className="h-10 w-10 text-destructive" />
                    <CardTitle>Can't Alert You to Budget Overruns</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    QuickBooks has no automated budget variance alerts. You must manually run reports to discover
                    overruns. Most contractors are too busy to check daily, missing early warning signs.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-muted p-3 rounded">
                      <strong>Without Alerts:</strong>
                      <ul className="mt-2 space-y-1">
                        <li>• Check reports weekly (if you remember)</li>
                        <li>• Discover 8-12% variance</li>
                        <li>• Already overspent $4,000-$6,000</li>
                        <li>• Harder to recover profit</li>
                      </ul>
                    </div>
                    <div className="bg-construction-orange/10 p-3 rounded border border-construction-orange/20">
                      <strong className="text-construction-orange">With BuildDesk Alerts:</strong>
                      <ul className="mt-2 space-y-1">
                        <li>• Automatic notification at 5% variance</li>
                        <li>• Discover variance within 24 hours</li>
                        <li>• Only overspent $500-$1,000</li>
                        <li>• Easy to course-correct</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/20">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-10 w-10 text-destructive" />
                    <CardTitle>Can't Handle Construction-Specific Workflows</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Construction has unique needs QuickBooks wasn't built to handle:
                  </p>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <strong className="text-destructive">QuickBooks Can't:</strong>
                      <ul className="mt-2 space-y-1">
                        <li>✗ Manage change orders with budget impact</li>
                        <li>✗ Track time with GPS verification</li>
                        <li>✗ Break down costs by detailed cost codes</li>
                        <li>✗ Generate daily progress reports</li>
                        <li>✗ Track equipment usage by project</li>
                        <li>✗ Manage subcontractor compliance</li>
                        <li>✗ Create project schedules/Gantt charts</li>
                        <li>✗ Handle RFIs and submittals</li>
                        <li>✗ Mobile-first field operations</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-construction-orange">BuildDesk Includes:</strong>
                      <ul className="mt-2 space-y-1">
                        <li>✓ Change order workflow + budget updates</li>
                        <li>✓ GPS-verified time tracking</li>
                        <li>✓ Unlimited cost code breakdown</li>
                        <li>✓ Automated daily reports</li>
                        <li>✓ Equipment tracking by project</li>
                        <li>✓ Sub compliance management</li>
                        <li>✓ Integrated scheduling</li>
                        <li>✓ RFI & submittal tracking</li>
                        <li>✓ Mobile apps for field crews</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* The Right Solution */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-construction-dark mb-6">
              The Right Solution: QuickBooks + BuildDesk
            </h2>

            <Card className="bg-gradient-to-br from-construction-orange/10 to-construction-orange/5 mb-6">
              <CardContent className="pt-6">
                <p className="text-lg mb-4">
                  <strong>Don't replace QuickBooks—complement it.</strong> Use QuickBooks for what it does best
                  (accounting, taxes, financial statements) and BuildDesk for what construction needs (real-time
                  job costing, project management, field operations).
                </p>
                <p className="text-lg">
                  The two integrate seamlessly, syncing costs and invoices automatically. You get construction-specific
                  insights in BuildDesk while maintaining proper books in QuickBooks.
                </p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader className="bg-muted">
                  <CardTitle>Use QuickBooks For:</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>General ledger & accounting</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Tax preparation & filing</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Financial statements (P&L, balance sheet)</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Bank reconciliation</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Accounts payable/receivable</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>CPA collaboration</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="bg-construction-orange/10">
                  <CardTitle>Use BuildDesk For:</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span>Real-time job costing & profitability</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span>Budget vs actual tracking (live)</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span>Mobile time tracking (GPS verified)</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span>Project management & scheduling</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span>Change order management</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span>Field operations & daily reports</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-construction-orange text-white border-0">
              <CardContent className="pt-6 text-center">
                <h3 className="text-2xl font-bold mb-4">
                  Best of Both Worlds
                </h3>
                <p className="text-lg mb-6 opacity-90">
                  Keep QuickBooks for accounting. Add BuildDesk for construction. Get real-time project insights
                  while maintaining proper books. They sync automatically.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button variant="secondary" size="lg" asChild>
                    <Link to="/auth">
                      Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" className="bg-transparent text-white border-white hover:bg-white/10" asChild>
                    <Link to="/resources/quickbooks-integration-guide">
                      QuickBooks Integration Guide
                    </Link>
                  </Button>
                </div>
                <p className="text-sm mt-6 opacity-75">
                  $350/month • Unlimited users • QuickBooks integration included
                </p>
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
                    <Link to="/features/financial-management" className="hover:text-construction-orange">
                      Construction Financial Management Software
                    </Link>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">See how BuildDesk complements QuickBooks</p>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    <Link to="/resources/real-cost-delayed-job-costing" className="hover:text-construction-orange">
                      The Real Cost of Delayed Job Costing
                    </Link>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Why real-time tracking saves $50,000+ annually</p>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    <Link to="/resources/quickbooks-integration-guide" className="hover:text-construction-orange">
                      QuickBooks Integration Guide
                    </Link>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">How BuildDesk syncs with QuickBooks</p>
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

export default QuickBooksLimitationsConstruction;
