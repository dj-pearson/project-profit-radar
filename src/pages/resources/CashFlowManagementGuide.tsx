import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PageSEO, createArticleSchema, createFAQSchema, createHowToSchema } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, AlertTriangle, Calendar, DollarSign, CheckCircle, ArrowRight, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";
import { GEOOptimizedFAQ } from "@/components/seo/GEOOptimizedFAQ";

const CashFlowManagementGuide = () => {
  const faqs = [
    {
      question: "What is construction cash flow management?",
      answer: "Construction cash flow management is the process of tracking, forecasting, and optimizing the timing of money coming in (customer payments, draws) versus money going out (payroll, materials, subs, equipment). The goal is ensuring you always have enough cash to pay bills even when profitable projects haven't been paid yet."
    },
    {
      question: "Why do profitable construction companies run out of cash?",
      answer: "The construction payment cycle creates a timing gap: you pay crews weekly, vendors in 30 days, but customers pay in 30-90 days (or longer with retainage). Even highly profitable projects can create cash flow problems if you don't forecast when money actually moves. A $500K profitable project with 60-day payment terms can still cause payroll shortfalls."
    },
    {
      question: "How far ahead should I forecast cash flow?",
      answer: "Best practice is 30-90 days. Look at 30 days for immediate payroll and vendor obligations, 60 days for upcoming project starts (equipment deposits, material orders), and 90 days for strategic decisions (can you afford that new truck, should you take on another project). BuildDesk provides 30/60/90 day cash flow forecasts automatically."
    },
    {
      question: "What's the difference between profit and cash flow?",
      answer: "Profit is revenue minus expenses on paper. Cash flow is actual money in your bank account. You can be profitable on paper but broke in reality if customers pay slowly, you have high retainage, or you're growing fast and funding new projects before old ones pay out. Construction companies fail from cash flow problems, not profit problems."
    },
    {
      question: "How can I improve construction cash flow?",
      answer: "Five proven strategies: 1) Invoice immediately and follow up on late payments, 2) Negotiate better payment terms (progress billing, shorter payment windows), 3) Require deposits on new projects (10-20%), 4) Delay vendor payments strategically (without hurting relationships), 5) Use cash flow forecasting to spot problems 30+ days early so you can adjust."
    }
  ];

  const howToSteps = [
    {
      name: "Track all incoming and outgoing cash",
      text: "Set up a system to capture every cash movement: customer payments received, invoices sent (but not yet paid), payroll obligations, vendor bills due, subcontractor payments, equipment purchases, loan payments. This is your cash flow baseline."
    },
    {
      name: "Forecast 30/60/90 days ahead",
      text: "Based on your project schedules, payment terms, and historical patterns, forecast when cash will actually move. Include upcoming invoice dates, expected customer payment dates (considering their typical delays), payroll dates, and vendor payment deadlines."
    },
    {
      name: "Identify cash flow gaps",
      text: "Look for weeks where outgoing cash exceeds incoming cash. These are danger zones where you might not have enough to cover obligations. Flag any gap larger than your available cash reserves."
    },
    {
      name: "Take action to close gaps",
      text: "When you spot a gap 30+ days ahead, you have time to fix it: speed up collections, delay non-critical purchases, negotiate payment terms with vendors, arrange a line of credit, or adjust project timelines to smooth cash flow."
    },
    {
      name: "Monitor and adjust weekly",
      text: "Update your forecast weekly as actual payments come in and new projects start. Real-time data (like BuildDesk provides) makes this automatic instead of requiring hours of spreadsheet work."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title="Construction Cash Flow Management: Complete Guide for Small Contractors"
        description="Master cash flow forecasting for construction. Learn to predict cash 30-90 days ahead, avoid cash crunches, and keep profitable projects from draining your bank account."
        keywords={[
          'construction cash flow management',
          'contractor cash flow',
          'construction cash flow forecasting',
          'contractor cash flow problems',
          'construction working capital',
          'construction payment cycle',
          'contractor cash flow solutions'
        ]}
        canonicalUrl="https://builddesk.com/resources/cash-flow-management-guide"
        schema={[
          createArticleSchema(
            "Construction Cash Flow Management: Complete Guide for Small Contractors",
            "How to forecast cash flow 30-90 days ahead and avoid cash crunches in construction",
            "2025-11-14",
            "2025-11-14",
            "BuildDesk Team"
          ),
          createHowToSchema("Manage Construction Cash Flow Effectively", howToSteps),
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
              { label: "Cash Flow Management Guide" }
            ]}
          />

          {/* Hero / Answer-First Section */}
          <div className="max-w-4xl mx-auto mt-8 mb-12">
            <Badge className="mb-4">Financial Intelligence</Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-6">
              Construction Cash Flow Management: Complete Guide for Small Contractors
            </h1>

            {/* Answer-first paragraph for GEO optimization */}
            <Card className="bg-construction-orange/10 border-construction-orange/20 mb-8">
              <CardContent className="pt-6">
                <p className="text-lg leading-relaxed">
                  <strong>Construction cash flow management</strong> is tracking and forecasting the timing of money
                  in (customer payments) versus money out (payroll, vendors, subs). The challenge: you pay crews weekly
                  and vendors in 30 days, but customers pay in <span className="font-bold text-construction-orange">30-90 days</span> (or
                  longer with retainage). This timing gap causes profitable companies to run out of cash. Best practice
                  is forecasting 30-90 days ahead to spot problems early and take corrective action before cash crunches occur.
                </p>
              </CardContent>
            </Card>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
              <span>By BuildDesk Team</span>
              <span>•</span>
              <span>November 14, 2025</span>
              <span>•</span>
              <span>15 min read</span>
            </div>
          </div>

          {/* The Problem */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-construction-dark mb-6">
              Why Profitable Construction Companies Run Out of Cash
            </h2>

            <p className="text-lg text-muted-foreground mb-6">
              It's the paradox every contractor faces: your P&L shows profit, but your bank account is empty.
              Here's why:
            </p>

            <div className="space-y-6">
              <Card className="border-destructive/20">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-10 w-10 text-destructive" />
                    <CardTitle>The Construction Payment Cycle Gap</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Construction has a built-in timing mismatch between when you pay and when you get paid:
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-destructive/10 p-4 rounded border border-destructive/20">
                      <p className="font-semibold text-sm mb-3">Money Going Out (Fast):</p>
                      <ul className="text-sm space-y-2">
                        <li className="flex items-start">
                          <Clock className="h-4 w-4 text-destructive mr-2 mt-0.5 flex-shrink-0" />
                          <span><strong>Payroll:</strong> Weekly (every 7 days)</span>
                        </li>
                        <li className="flex items-start">
                          <Clock className="h-4 w-4 text-destructive mr-2 mt-0.5 flex-shrink-0" />
                          <span><strong>Materials:</strong> Net 30 or COD (30 days max)</span>
                        </li>
                        <li className="flex items-start">
                          <Clock className="h-4 w-4 text-destructive mr-2 mt-0.5 flex-shrink-0" />
                          <span><strong>Subcontractors:</strong> Net 30 (30 days)</span>
                        </li>
                        <li className="flex items-start">
                          <Clock className="h-4 w-4 text-destructive mr-2 mt-0.5 flex-shrink-0" />
                          <span><strong>Equipment:</strong> Immediate or monthly lease</span>
                        </li>
                      </ul>
                    </div>
                    <div className="bg-muted p-4 rounded">
                      <p className="font-semibold text-sm mb-3">Money Coming In (Slow):</p>
                      <ul className="text-sm space-y-2">
                        <li className="flex items-start">
                          <Clock className="h-4 w-4 text-muted-foreground mr-2 mt-0.5 flex-shrink-0" />
                          <span><strong>Progress billing:</strong> Monthly at best (30+ days)</span>
                        </li>
                        <li className="flex items-start">
                          <Clock className="h-4 w-4 text-muted-foreground mr-2 mt-0.5 flex-shrink-0" />
                          <span><strong>Payment processing:</strong> 30-60 days typical</span>
                        </li>
                        <li className="flex items-start">
                          <Clock className="h-4 w-4 text-muted-foreground mr-2 mt-0.5 flex-shrink-0" />
                          <span><strong>Slow payers:</strong> 60-90 days (or never)</span>
                        </li>
                        <li className="flex items-start">
                          <Clock className="h-4 w-4 text-muted-foreground mr-2 mt-0.5 flex-shrink-0" />
                          <span><strong>Retainage:</strong> Held until project completion</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-background rounded border border-destructive/20">
                    <p className="text-sm font-semibold mb-2">Real-World Example:</p>
                    <p className="text-sm">
                      $100K project, 20% profit margin. You pay $30K in labor over 4 weeks (weekly payroll),
                      $40K in materials (Net 30), $10K to subs (Net 30). Total: $80K out in 30 days.
                      Customer pays Net 60 (60 days later). You're cash-negative $80K for 30+ days even though
                      the project is profitable.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/20">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-10 w-10 text-destructive" />
                    <CardTitle>Growth Compounds the Problem</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Ironically, success makes cash flow worse. Each new project requires upfront cash (payroll,
                    materials) before you get paid. The faster you grow, the more cash you need.
                  </p>
                  <div className="bg-muted p-4 rounded">
                    <p className="font-semibold mb-2">The Growth Cash Crunch:</p>
                    <ul className="text-sm space-y-2">
                      <li>• Month 1: Start Project A, spend $80K, nothing collected yet</li>
                      <li>• Month 2: Start Project B, spend $80K more, Project A billed but not paid</li>
                      <li>• Month 3: Start Project C, spend $80K more, Projects A & B billed but not paid</li>
                      <li className="font-bold text-destructive pt-2">• Total cash needed: $240K before first payment comes in</li>
                    </ul>
                    <p className="text-sm mt-3 text-muted-foreground">
                      All three projects are profitable, but you need a $240K line of credit just to fund growth.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/20">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-10 w-10 text-destructive" />
                    <CardTitle>No Forecasting = Constant Crisis</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Without cash flow forecasting, you discover problems when you can't make payroll. With forecasting,
                    you see problems 30-60 days ahead and have time to fix them.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-muted p-3 rounded">
                      <strong>Without Forecasting:</strong>
                      <ul className="mt-2 space-y-1">
                        <li>• "Where did all the money go?"</li>
                        <li>• Can't make Friday payroll</li>
                        <li>• Emergency line of credit at high rates</li>
                        <li>• Constantly stressed about cash</li>
                        <li>• Turn down profitable work (can't fund it)</li>
                      </ul>
                    </div>
                    <div className="bg-construction-orange/10 p-3 rounded border border-construction-orange/20">
                      <strong className="text-construction-orange">With 90-Day Forecasting:</strong>
                      <ul className="mt-2 space-y-1">
                        <li>✓ See cash gaps 30-60 days ahead</li>
                        <li>✓ Speed up collections proactively</li>
                        <li>✓ Negotiate better payment terms</li>
                        <li>✓ Plan growth strategically</li>
                        <li>✓ Know exactly how much work you can take</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* How to Manage Cash Flow */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-construction-dark mb-6">
              How to Manage Construction Cash Flow Effectively
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

          {/* 5 Proven Strategies */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-construction-dark mb-6">
              5 Proven Strategies to Improve Construction Cash Flow
            </h2>

            <div className="space-y-6">
              <Card className="bg-construction-orange/5 border-construction-orange/20">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-10 w-10 text-construction-orange" />
                    <CardTitle>Strategy #1: Speed Up Customer Collections</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    The fastest way to improve cash flow is getting paid faster:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Invoice immediately:</strong> Bill as soon as milestones complete, not at month-end</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Follow up on overdue invoices:</strong> Call 5 days after due date, every 5 days after</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Offer payment incentives:</strong> 2% discount for payment within 10 days</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Accept credit cards:</strong> Despite fees, immediate payment beats 60-day wait</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Use automated reminders:</strong> BuildDesk sends automatic payment reminders</span>
                    </li>
                  </ul>
                  <div className="mt-4 p-3 bg-background rounded text-sm">
                    <strong>Impact:</strong> Reducing average collection time from 60 days to 45 days frees up
                    25% of your receivables immediately. For a $2M contractor, that's $80K+ back in your account.
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-construction-orange/5 border-construction-orange/20">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-10 w-10 text-construction-orange" />
                    <CardTitle>Strategy #2: Negotiate Better Payment Terms</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Your standard contract terms determine your cash flow health:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Progress billing:</strong> Invoice weekly or bi-weekly, not monthly</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Shorter payment windows:</strong> Net 15 instead of Net 30 when possible</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Lower retainage:</strong> Negotiate 5% instead of standard 10%</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Require deposits:</strong> 10-20% upfront on new projects</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Material allowances:</strong> Have client pay suppliers directly for big purchases</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-construction-orange/5 border-construction-orange/20">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Wallet className="h-10 w-10 text-construction-orange" />
                    <CardTitle>Strategy #3: Strategic Vendor Payment Timing</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Optimize when you pay vendors without damaging relationships:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Use full payment terms:</strong> If Net 30, pay on day 29, not day 7</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Negotiate Net 45 or Net 60:</strong> With vendors you pay consistently</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Batch payments weekly:</strong> Instead of daily, to better predict cash needs</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Use credit cards strategically:</strong> 30-day float on purchases</span>
                    </li>
                  </ul>
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950 rounded text-sm border border-yellow-200 dark:border-yellow-800">
                    <strong>Warning:</strong> Never delay payments past agreed terms without communication.
                    Damaged vendor relationships cost more than the short-term cash benefit.
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-construction-orange/5 border-construction-orange/20">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-10 w-10 text-construction-orange" />
                    <CardTitle>Strategy #4: Maintain Cash Reserves</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Target: 2-3 months of operating expenses in reserve
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Calculate your "burn rate":</strong> Monthly payroll + overhead + average vendor bills</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Build gradually:</strong> Set aside 10% of profit each month until you hit target</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Separate account:</strong> Keep reserves separate from operating cash</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Line of credit backup:</strong> Establish before you need it (banks don't lend in crisis)</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-construction-orange/5 border-construction-orange/20">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-10 w-10 text-construction-orange" />
                    <CardTitle>Strategy #5: Use Real-Time Cash Flow Forecasting</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    BuildDesk automatically forecasts your cash position 30/60/90 days out:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Upcoming invoices:</strong> Based on project schedules and milestones</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Expected payments:</strong> Historical payment patterns per customer</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Payroll obligations:</strong> Scheduled crew hours across all projects</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Vendor bills due:</strong> Purchase orders and recurring expenses</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-construction-orange mr-2 mt-0.5 flex-shrink-0" />
                      <span><strong>Automatic alerts:</strong> Warns when cash will drop below threshold</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* BuildDesk Solution */}
          <div className="max-w-4xl mx-auto mb-12">
            <Card className="bg-gradient-to-br from-construction-orange/10 to-construction-orange/5">
              <CardHeader>
                <CardTitle className="text-3xl text-center">How BuildDesk Automates Cash Flow Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6 mb-8 text-center">
                  <div>
                    <div className="text-4xl font-bold text-construction-orange mb-2">30/60/90</div>
                    <div className="text-sm text-muted-foreground mb-3">Day forecasts</div>
                    <p className="text-xs">
                      See exactly when cash will come in and go out for the next 3 months
                    </p>
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-construction-orange mb-2">Auto</div>
                    <div className="text-sm text-muted-foreground mb-3">Updated daily</div>
                    <p className="text-xs">
                      No spreadsheets. Forecast updates automatically as projects progress
                    </p>
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-construction-orange mb-2">Alerts</div>
                    <div className="text-sm text-muted-foreground mb-3">Before crisis hits</div>
                    <p className="text-xs">
                      Get notified 30+ days before potential cash shortfalls
                    </p>
                  </div>
                </div>

                <div className="text-center p-6 bg-background rounded-lg">
                  <p className="text-lg mb-4">
                    Stop being surprised by cash crunches. See your cash position 90 days ahead and take
                    action before problems occur.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button size="lg" asChild>
                      <Link to="/auth">
                        Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="lg" asChild>
                      <Link to="/features/financial-management">
                        See Cash Flow Features
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
                    <Link to="/resources/budget-vs-actual-tracking-guide" className="hover:text-construction-orange">
                      Budget vs Actual Tracking Guide
                    </Link>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Keep projects on budget with real-time monitoring</p>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    <Link to="/features/financial-management" className="hover:text-construction-orange">
                      Construction Financial Management Software
                    </Link>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Complete financial command center for contractors</p>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    <Link to="/resources/quickbooks-limitations-construction" className="hover:text-construction-orange">
                      Why QuickBooks Isn't Enough for Construction
                    </Link>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">What QuickBooks can't do for cash flow forecasting</p>
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

export default CashFlowManagementGuide;
