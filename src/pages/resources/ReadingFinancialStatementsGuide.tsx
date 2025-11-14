import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  PieChart,
  Calculator,
  Target,
  XCircle,
  ArrowRight,
  Eye,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const ReadingFinancialStatementsGuide = () => {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "How to Read Construction Financial Statements (A Contractor's Guide)",
    "description": "Learn how to read and interpret construction financial statements including P&L, balance sheet, and cash flow. Practical guide for contractors with real examples and red flags to watch for.",
    "author": {
      "@type": "Organization",
      "name": "BuildDesk"
    },
    "publisher": {
      "@type": "Organization",
      "name": "BuildDesk",
      "logo": {
        "@type": "ImageObject",
        "url": "https://builddesk.com/logo.png"
      }
    },
    "datePublished": "2025-01-14",
    "dateModified": "2025-01-14",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://builddesk.com/resources/reading-financial-statements-guide"
    },
    "keywords": "construction financial statements, read construction P&L, construction balance sheet, contractor financial reports, understand construction financials"
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Read Construction Financial Statements",
    "description": "Step-by-step guide for contractors to read and interpret financial statements including profit & loss, balance sheet, and cash flow statements.",
    "step": [
      {
        "@type": "HowToStep",
        "position": 1,
        "name": "Review the Profit & Loss Statement (P&L)",
        "text": "Start with your P&L to understand profitability. Look at revenue (billed and unbilled), cost of goods sold (direct job costs), gross profit, overhead expenses, and net profit. For construction, review this by project AND company-wide to identify which jobs are profitable."
      },
      {
        "@type": "HowToStep",
        "position": 2,
        "name": "Analyze the Balance Sheet",
        "text": "Check your balance sheet to understand financial health. Key areas: cash and accounts receivable (can you pay bills?), work-in-progress and retainage (money owed to you), accounts payable (what you owe), and equity (net worth). Red flag: current liabilities exceeding current assets means cash flow problems."
      },
      {
        "@type": "HowToStep",
        "position": 3,
        "name": "Examine the Cash Flow Statement",
        "text": "Review cash flow to see where money is actually moving. Operating activities shows cash from projects, investing activities shows equipment purchases, financing activities shows loans and owner draws. Positive operating cash flow is critical—you can be profitable on paper but broke in reality."
      },
      {
        "@type": "HowToStep",
        "position": 4,
        "name": "Calculate Key Financial Ratios",
        "text": "Use ratios to benchmark performance. Current ratio (current assets / current liabilities) should be >1.3. Quick ratio should be >1.0. Gross profit margin should be 20-35%. Net profit margin should be 8-15%. Days in A/R should be <60 days. Compare these monthly to spot trends."
      },
      {
        "@type": "HowToStep",
        "position": 5,
        "name": "Compare Actual vs Budget and Identify Red Flags",
        "text": "Compare actuals to budgets and prior periods. Red flags include: declining gross margins, increasing overhead as % of revenue, A/R aging beyond 60 days, negative operating cash flow for 2+ months, increasing debt without revenue growth, and WIP growing faster than billings (underbilling = cash flow crisis)."
      }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What are the 3 most important financial statements for contractors?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The 3 critical financial statements for construction businesses are: (1) Profit & Loss Statement (P&L) - shows revenue, costs, and profitability by period and by project. (2) Balance Sheet - shows assets (cash, A/R, equipment), liabilities (A/P, loans), and equity at a specific point in time. (3) Cash Flow Statement - shows actual cash movement in/out of the business. For contractors, WIP (Work in Progress) reports are equally important as they show unbilled revenue and project profitability in real-time."
        }
      },
      {
        "@type": "Question",
        "name": "How often should contractors review financial statements?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Contractors should review financial statements at different frequencies: P&L by project should be reviewed WEEKLY during active projects to catch cost overruns early. Company-wide P&L and cash flow should be reviewed MONTHLY. Balance sheet should be reviewed MONTHLY to monitor A/R aging, WIP, and debt levels. Annual statements should be reviewed with your CPA for tax planning and year-over-year trends. Real-time dashboards are ideal for tracking key metrics daily."
        }
      },
      {
        "@type": "Question",
        "name": "What's the difference between cash basis and accrual accounting for construction?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Cash basis accounting records revenue when you receive payment and expenses when you pay bills. Accrual accounting records revenue when earned (work completed) and expenses when incurred (work done or materials received), regardless of payment timing. For construction, accrual accounting is REQUIRED for accurate financial statements because projects span months. Cash basis makes a $500K project appear to have zero revenue until the final payment arrives—completely hiding profitability problems. Most banks and bonding companies require accrual-based statements."
        }
      },
      {
        "@type": "Question",
        "name": "What does Work in Progress (WIP) mean on a balance sheet?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Work in Progress (WIP) represents the value of work completed but not yet billed to customers. It's calculated as: costs incurred + earned profit - billings. Positive WIP (underbilling) means you've done work but haven't invoiced it yet—this creates cash flow problems. Negative WIP (overbilling) means you've billed more than you've earned—this is good for cash flow but creates future risk if you can't complete the work profitably. WIP should be monitored weekly on active projects."
        }
      },
      {
        "@type": "Question",
        "name": "What financial ratios should construction companies track?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Key financial ratios for contractors include: Current Ratio (current assets / current liabilities) should be >1.3 to show you can cover short-term obligations. Quick Ratio (current assets - inventory / current liabilities) should be >1.0. Gross Profit Margin should be 20-35% depending on trade. Net Profit Margin should be 8-15%. Days in A/R (accounts receivable / daily revenue) should be <60 days. Debt-to-Equity should be <2.0. WIP as % of revenue shouldn't exceed 15-20% or you're underbilling and starving cash flow."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>How to Read Construction Financial Statements | Contractor's Guide | BuildDesk</title>
        <meta
          name="description"
          content="Learn how to read and interpret construction financial statements including P&L, balance sheet, and cash flow. Practical guide for contractors with real examples and red flags to watch for."
        />
        <meta
          name="keywords"
          content="construction financial statements, read construction P&L, construction balance sheet, contractor financial reports, understand construction financials, WIP report, construction accounting"
        />
        <link rel="canonical" href="https://builddesk.com/resources/reading-financial-statements-guide" />
        <script type="application/ld+json">
          {JSON.stringify(articleSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(howToSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Hero Section */}
        <section className="bg-construction-dark text-white py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="inline-block bg-construction-orange/20 text-construction-orange px-4 py-2 rounded-full text-sm font-semibold mb-6">
              Financial Intelligence Series
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              How to Read Construction Financial Statements (A Contractor's Guide)
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed">
              Your CPA hands you a stack of financial reports. P&L. Balance sheet. Cash flow. WIP schedules. Do you know what you're looking at—or just nodding and hoping for the best?
            </p>
            <div className="flex items-center gap-4 mt-8 text-sm text-gray-400">
              <span>18 min read</span>
              <span>•</span>
              <span>Updated January 2025</span>
            </div>
          </div>
        </section>

        {/* Answer-First Content */}
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <Card className="border-l-4 border-l-construction-orange">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <FileText className="w-8 h-8 text-construction-orange flex-shrink-0 mt-1" />
                  <div>
                    <h2 className="text-2xl font-bold mb-4 text-construction-dark">
                      The Direct Answer
                    </h2>
                    <p className="text-lg leading-relaxed mb-4">
                      <strong>Construction financial statements</strong> tell you three critical things: (1) Are you making money? (P&L / Profit & Loss), (2) Can you pay your bills? (Balance Sheet), and (3) Where is cash actually going? (Cash Flow Statement). These aren't academic exercises—they're your early warning system for cash flow disasters, unprofitable projects, and business failure.
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                      <p className="font-bold text-construction-dark mb-2">The 3 Statements You MUST Understand:</p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-construction-orange flex-shrink-0 mt-0.5" />
                          <span><strong>Profit & Loss (P&L):</strong> Revenue - Costs = Profit. Review weekly by project, monthly company-wide.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-construction-orange flex-shrink-0 mt-0.5" />
                          <span><strong>Balance Sheet:</strong> What you own (assets) vs what you owe (liabilities). Review monthly for A/R aging and WIP.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-construction-orange flex-shrink-0 mt-0.5" />
                          <span><strong>Cash Flow Statement:</strong> Actual cash in vs cash out. Review monthly—positive operating cash flow is non-negotiable.</span>
                        </li>
                      </ul>
                    </div>
                    <p className="text-lg leading-relaxed">
                      <span className="font-bold">Construction-specific twist:</span> You also need <span className="text-construction-orange font-bold">Work in Progress (WIP) reports</span> to track unbilled revenue. Without WIP tracking, you're flying blind on project profitability.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Problem Section */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold mb-8 text-construction-dark flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-construction-orange" />
              Why Most Contractors Don't Understand Their Financials
            </h2>

            <div className="prose prose-lg max-w-none">
              <p className="text-lg leading-relaxed mb-6">
                Here's the uncomfortable truth: most small construction company owners have no idea how to read their financial statements. They rely entirely on their bookkeeper or accountant to tell them if they're making money.
              </p>

              <div className="bg-white p-6 rounded-lg border-l-4 border-l-red-500 mb-8">
                <p className="font-semibold text-construction-dark mb-3">
                  "My accountant said we had a great year—$3.2M in revenue and $480K in profit. But I'm struggling to make payroll and my line of credit is maxed out. What am I missing?"
                </p>
                <p className="text-gray-600 text-sm">
                  — Residential GC, 12 years in business
                </p>
              </div>

              <p className="text-lg leading-relaxed mb-6">
                What's happening here? The contractor is confusing <strong>accrual-based profit</strong> (what the P&L shows) with <strong>actual cash</strong> (what the bank account shows). Here's why they're broke despite being "profitable":
              </p>

              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <Card className="border-2 border-yellow-200">
                  <CardContent className="pt-6">
                    <DollarSign className="w-6 h-6 text-yellow-600 mb-3" />
                    <h3 className="font-bold text-construction-dark mb-2">$480K in "Profit"</h3>
                    <p className="text-sm text-gray-600">
                      Looks great on paper. Includes revenue for work completed but not yet billed (WIP) and billed but not yet collected (A/R).
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-red-200">
                  <CardContent className="pt-6">
                    <XCircle className="w-6 h-6 text-red-500 mb-3" />
                    <h3 className="font-bold text-construction-dark mb-2">$185K Stuck in A/R</h3>
                    <p className="text-sm text-gray-600">
                      Customers owe you this money but haven't paid yet. Average 72 days to collect. Can't use it to pay bills.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-red-200">
                  <CardContent className="pt-6">
                    <XCircle className="w-6 h-6 text-red-500 mb-3" />
                    <h3 className="font-bold text-construction-dark mb-2">$120K in Underbilling</h3>
                    <p className="text-sm text-gray-600">
                      Work completed but not yet invoiced (positive WIP). Won't turn into cash for 30-90 days. Already paid workers for this work.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <p className="text-lg leading-relaxed mb-6">
                <strong>Real cash available:</strong> $480K (profit) - $185K (A/R) - $120K (WIP) = <span className="font-bold text-construction-orange">$175K actual cash generated</span>
              </p>

              <p className="text-lg leading-relaxed">
                Now factor in $80K in equipment purchases and $60K in loan principal payments (neither shows up on the P&L). Actual cash remaining: <span className="font-bold text-red-600">$35K</span>. No wonder they can't make payroll.
              </p>

              <p className="text-lg leading-relaxed mt-6">
                This is why you must understand ALL your financial statements—not just the P&L. The balance sheet shows the A/R and WIP. The cash flow statement shows the equipment and loan payments. Together, they tell the complete story.
              </p>
            </div>
          </div>
        </section>

        {/* Understanding the P&L */}
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold mb-8 text-construction-dark flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-construction-orange" />
              How to Read a Construction Profit & Loss Statement
            </h2>

            <Card className="border-l-4 border-l-construction-orange mb-8">
              <CardContent className="pt-6">
                <p className="text-gray-600 mb-4 leading-relaxed">
                  The P&L (also called Income Statement) shows revenue, costs, and profitability over a specific period (month, quarter, year). For construction, you need TWO views: company-wide P&L and project-specific P&L.
                </p>

                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 font-mono text-sm mb-4">
                  <div className="font-bold text-lg mb-3 text-construction-dark">Sample Construction P&L (Monthly)</div>

                  <div className="mb-4">
                    <div className="font-bold text-construction-dark mb-2">REVENUE</div>
                    <div className="ml-4 space-y-1">
                      <div className="flex justify-between">
                        <span>Completed & Billed</span>
                        <span>$285,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Earned but Unbilled (WIP)</span>
                        <span className="text-yellow-600">$42,000</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-300 font-bold">
                        <span>Total Revenue</span>
                        <span>$327,000</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="font-bold text-construction-dark mb-2">COST OF GOODS SOLD (Direct Costs)</div>
                    <div className="ml-4 space-y-1">
                      <div className="flex justify-between">
                        <span>Labor (w/ burden)</span>
                        <span>$118,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Materials</span>
                        <span>$76,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Subcontractors</span>
                        <span>$52,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Equipment/Tools</span>
                        <span>$8,500</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-300 font-bold">
                        <span>Total COGS</span>
                        <span>$254,500</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 bg-green-50 p-3 rounded">
                    <div className="flex justify-between font-bold text-green-700">
                      <span>GROSS PROFIT</span>
                      <span>$72,500</span>
                    </div>
                    <div className="text-sm text-green-600 mt-1">Gross Margin: 22.2%</div>
                  </div>

                  <div className="mb-4">
                    <div className="font-bold text-construction-dark mb-2">OVERHEAD EXPENSES</div>
                    <div className="ml-4 space-y-1">
                      <div className="flex justify-between">
                        <span>Office Salaries</span>
                        <span>$22,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rent & Utilities</span>
                        <span>$6,500</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Insurance</span>
                        <span>$8,200</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Software & Technology</span>
                        <span>$1,800</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Marketing & Sales</span>
                        <span>$3,200</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Professional Services</span>
                        <span>$2,100</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Other Operating Expenses</span>
                        <span>$4,700</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-300 font-bold">
                        <span>Total Overhead</span>
                        <span>$48,500</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-construction-orange/10 p-3 rounded border-2 border-construction-orange">
                    <div className="flex justify-between font-bold text-construction-dark">
                      <span>NET PROFIT</span>
                      <span className="text-construction-orange text-lg">$24,000</span>
                    </div>
                    <div className="text-sm text-construction-dark mt-1">Net Margin: 7.3%</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <p className="font-semibold text-construction-dark mb-2 flex items-center gap-2">
                      <Eye className="w-5 h-5 text-blue-600" />
                      What to Look For:
                    </p>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span><strong>Gross Margin:</strong> Should be 20-35% for most trades. Below 20% means pricing or cost control problems.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span><strong>Net Margin:</strong> Should be 8-15%. This example (7.3%) is at-risk—little room for error.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span><strong>WIP (Unbilled Revenue):</strong> $42K is 12.8% of total revenue—acceptable. Above 20% signals underbilling problems.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span><strong>Overhead as % of Revenue:</strong> 14.8% is healthy. Above 25% means you're too heavy with admin costs.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <p className="font-semibold text-construction-dark mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Red Flags on a P&L:
                    </p>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <span>Gross margin declining month-over-month (cost overruns or pricing erosion)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <span>Revenue increasing but net profit flat or declining (scaling problems)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <span>Overhead growing faster than revenue (bloated admin costs)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <span>WIP as % of revenue growing (underbilling = future cash crisis)</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Understanding the Balance Sheet */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold mb-8 text-construction-dark flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-construction-orange" />
              How to Read a Construction Balance Sheet
            </h2>

            <Card className="border-l-4 border-l-construction-orange mb-8">
              <CardContent className="pt-6">
                <p className="text-gray-600 mb-4 leading-relaxed">
                  The balance sheet is a snapshot of your financial position at a specific date. It shows what you own (assets), what you owe (liabilities), and what's left over (equity). Think of it as your business net worth statement.
                </p>

                <p className="text-sm text-gray-600 mb-4 italic">
                  Formula: <strong>Assets = Liabilities + Equity</strong>
                </p>

                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 font-mono text-sm mb-4">
                  <div className="font-bold text-lg mb-3 text-construction-dark">Sample Construction Balance Sheet</div>

                  <div className="mb-4">
                    <div className="font-bold text-construction-dark mb-2">ASSETS</div>
                    <div className="ml-4 space-y-2">
                      <div>
                        <div className="font-semibold text-gray-700 mb-1">Current Assets:</div>
                        <div className="ml-4 space-y-1">
                          <div className="flex justify-between">
                            <span>Cash</span>
                            <span>$48,000</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Accounts Receivable</span>
                            <span className="text-yellow-600">$185,000</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Work in Progress (WIP)</span>
                            <span className="text-yellow-600">$92,000</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Retainage Receivable</span>
                            <span className="text-yellow-600">$38,000</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Inventory/Materials</span>
                            <span>$22,000</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-gray-300 font-bold">
                            <span>Total Current Assets</span>
                            <span>$385,000</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="font-semibold text-gray-700 mb-1 mt-3">Fixed Assets:</div>
                        <div className="ml-4 space-y-1">
                          <div className="flex justify-between">
                            <span>Equipment & Vehicles</span>
                            <span>$220,000</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Less: Accumulated Depreciation</span>
                            <span>($95,000)</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-gray-300 font-bold">
                            <span>Net Fixed Assets</span>
                            <span>$125,000</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between pt-2 border-t-2 border-gray-400 font-bold text-construction-dark">
                        <span>TOTAL ASSETS</span>
                        <span>$510,000</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 mt-6">
                    <div className="font-bold text-construction-dark mb-2">LIABILITIES</div>
                    <div className="ml-4 space-y-2">
                      <div>
                        <div className="font-semibold text-gray-700 mb-1">Current Liabilities:</div>
                        <div className="ml-4 space-y-1">
                          <div className="flex justify-between">
                            <span>Accounts Payable</span>
                            <span className="text-red-600">$142,000</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Line of Credit</span>
                            <span className="text-red-600">$75,000</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Current Portion of Loans</span>
                            <span className="text-red-600">$28,000</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Accrued Payroll/Taxes</span>
                            <span className="text-red-600">$18,000</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-gray-300 font-bold">
                            <span>Total Current Liabilities</span>
                            <span>$263,000</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="font-semibold text-gray-700 mb-1 mt-3">Long-Term Liabilities:</div>
                        <div className="ml-4 space-y-1">
                          <div className="flex justify-between">
                            <span>Equipment Loans</span>
                            <span>$82,000</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-gray-300 font-bold">
                            <span>Total Long-Term Liabilities</span>
                            <span>$82,000</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between pt-2 border-t-2 border-gray-400 font-bold">
                        <span>TOTAL LIABILITIES</span>
                        <span>$345,000</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="font-bold text-construction-dark mb-2">EQUITY</div>
                    <div className="ml-4 space-y-1">
                      <div className="flex justify-between">
                        <span>Owner's Equity</span>
                        <span>$125,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Retained Earnings</span>
                        <span>$40,000</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-300 font-bold">
                        <span>TOTAL EQUITY</span>
                        <span>$165,000</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 bg-construction-orange/10 p-3 rounded border border-construction-orange">
                    <div className="flex justify-between font-bold text-construction-dark">
                      <span>TOTAL LIABILITIES + EQUITY</span>
                      <span>$510,000</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">✓ Balances with Total Assets</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <p className="font-semibold text-construction-dark mb-2 flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-blue-600" />
                      Key Ratios to Calculate:
                    </p>
                    <div className="space-y-3 text-sm text-gray-700">
                      <div>
                        <div className="font-bold mb-1">Current Ratio = Current Assets / Current Liabilities</div>
                        <div className="ml-4">$385,000 / $263,000 = <span className="text-green-600 font-bold">1.46</span> ✓ Good (target: &gt;1.3)</div>
                        <p className="ml-4 text-xs text-gray-600 mt-1">Measures ability to pay short-term obligations. Above 1.3 is healthy.</p>
                      </div>

                      <div>
                        <div className="font-bold mb-1">Quick Ratio = (Current Assets - Inventory) / Current Liabilities</div>
                        <div className="ml-4">($385,000 - $22,000) / $263,000 = <span className="text-green-600 font-bold">1.38</span> ✓ Good (target: &gt;1.0)</div>
                        <p className="ml-4 text-xs text-gray-600 mt-1">More conservative than current ratio—excludes inventory. Above 1.0 is healthy.</p>
                      </div>

                      <div>
                        <div className="font-bold mb-1">Debt-to-Equity = Total Liabilities / Total Equity</div>
                        <div className="ml-4">$345,000 / $165,000 = <span className="text-yellow-600 font-bold">2.09</span> ⚠ Moderate (target: &lt;2.0)</div>
                        <p className="ml-4 text-xs text-gray-600 mt-1">Measures financial leverage. Above 2.0 means high debt risk—harder to get bonding.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <p className="font-semibold text-construction-dark mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Balance Sheet Red Flags:
                    </p>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <span><strong>Current ratio &lt; 1.0:</strong> You can't pay your bills. Immediate cash crisis.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <span><strong>A/R aging beyond 60 days:</strong> Customers aren't paying—time for collections or liens.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <span><strong>WIP growing faster than revenue:</strong> Underbilling problem—you're financing customer projects.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <span><strong>Negative equity:</strong> Business is technically insolvent. Liabilities exceed assets.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <span><strong>Line of credit maxed out:</strong> No financial cushion for emergencies or growth.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Cash Flow Statement */}
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold mb-8 text-construction-dark flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-construction-orange" />
              Understanding the Cash Flow Statement
            </h2>

            <Card className="border-l-4 border-l-construction-orange mb-8">
              <CardContent className="pt-6">
                <p className="text-gray-600 mb-4 leading-relaxed">
                  The cash flow statement shows where cash actually went. You can be "profitable" on the P&L but have negative cash flow. This statement explains the disconnect.
                </p>

                <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold text-gray-700">
                    <strong>Critical insight:</strong> Positive <span className="text-construction-orange">operating</span> cash flow is non-negotiable. If operating activities show negative cash flow for 2+ months, you're in crisis mode.
                  </p>
                </div>

                <p className="text-gray-600 mb-4">Cash flow is broken into 3 categories:</p>

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <Card className="border-2 border-blue-200">
                    <CardContent className="pt-6">
                      <h3 className="font-bold text-construction-dark mb-2">Operating Activities</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Cash from running your business: customer payments, paying vendors, payroll, overhead.
                      </p>
                      <p className="text-xs font-semibold text-blue-700">
                        ✓ Must be POSITIVE most months
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-green-200">
                    <CardContent className="pt-6">
                      <h3 className="font-bold text-construction-dark mb-2">Investing Activities</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Cash spent on assets: equipment purchases, vehicle purchases, selling old equipment.
                      </p>
                      <p className="text-xs font-semibold text-green-700">
                        Usually negative (buying assets)
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-purple-200">
                    <CardContent className="pt-6">
                      <h3 className="font-bold text-construction-dark mb-2">Financing Activities</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Cash from/to lenders and owners: loans, line of credit, owner draws, capital contributions.
                      </p>
                      <p className="text-xs font-semibold text-purple-700">
                        Can be positive or negative
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <p className="font-semibold text-construction-dark mb-2">Red Flag Example:</p>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>Operating Activities: <span className="text-red-600 font-bold">-$22,000</span> (losing cash from operations)</div>
                    <div>Investing Activities: -$15,000 (equipment purchase)</div>
                    <div>Financing Activities: <span className="text-green-600 font-bold">+$45,000</span> (drew on line of credit)</div>
                    <div className="pt-2 border-t border-red-300 mt-2">Net Cash Flow: +$8,000</div>
                  </div>
                  <p className="text-sm text-gray-700 mt-3">
                    <strong>Problem:</strong> Positive net cash flow looks okay, but it's only because you borrowed $45K. Operating activities are NEGATIVE—the business isn't generating cash. This is unsustainable.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Review Frequency */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold mb-8 text-construction-dark flex items-center gap-3">
              <Target className="w-8 h-8 text-construction-orange" />
              How Often Should You Review Financial Statements?
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg text-construction-dark mb-3">Weekly Reviews</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Project P&L:</strong> Review every active project to catch cost overruns early</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Cash position:</strong> Check bank balances and upcoming payables</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span><strong>WIP by project:</strong> Identify underbilling before it becomes a cash crisis</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg text-construction-dark mb-3">Monthly Reviews</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Company-wide P&L:</strong> Overall profitability and trends</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Balance Sheet:</strong> A/R aging, WIP, debt levels, equity</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Cash Flow Statement:</strong> Where cash went and operating cash flow health</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Financial Ratios:</strong> Current ratio, gross margin %, net margin %, debt-to-equity</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg text-construction-dark mb-3">Quarterly Reviews</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Trend analysis:</strong> Compare current quarter to prior quarters</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Budget vs actual:</strong> Are you hitting financial targets?</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Update overhead rate:</strong> Recalculate for changing business size</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-orange-500">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg text-construction-dark mb-3">Annual Reviews</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Year-over-year comparison:</strong> Growth trends and performance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Tax planning:</strong> Review with CPA for tax optimization</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Strategic planning:</strong> Set financial goals for next year</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold mb-8 text-construction-dark">
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg mb-2 text-construction-dark">
                    What are the 3 most important financial statements for contractors?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    The 3 critical financial statements for construction businesses are: (1) Profit & Loss Statement (P&L) - shows revenue, costs, and profitability by period and by project. (2) Balance Sheet - shows assets (cash, A/R, equipment), liabilities (A/P, loans), and equity at a specific point in time. (3) Cash Flow Statement - shows actual cash movement in/out of the business. For contractors, WIP (Work in Progress) reports are equally important as they show unbilled revenue and project profitability in real-time.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg mb-2 text-construction-dark">
                    How often should contractors review financial statements?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Contractors should review financial statements at different frequencies: P&L by project should be reviewed WEEKLY during active projects to catch cost overruns early. Company-wide P&L and cash flow should be reviewed MONTHLY. Balance sheet should be reviewed MONTHLY to monitor A/R aging, WIP, and debt levels. Annual statements should be reviewed with your CPA for tax planning and year-over-year trends. Real-time dashboards are ideal for tracking key metrics daily.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg mb-2 text-construction-dark">
                    What's the difference between cash basis and accrual accounting for construction?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Cash basis accounting records revenue when you receive payment and expenses when you pay bills. Accrual accounting records revenue when earned (work completed) and expenses when incurred (work done or materials received), regardless of payment timing. For construction, accrual accounting is REQUIRED for accurate financial statements because projects span months. Cash basis makes a $500K project appear to have zero revenue until the final payment arrives—completely hiding profitability problems. Most banks and bonding companies require accrual-based statements.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg mb-2 text-construction-dark">
                    What does Work in Progress (WIP) mean on a balance sheet?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Work in Progress (WIP) represents the value of work completed but not yet billed to customers. It's calculated as: costs incurred + earned profit - billings. Positive WIP (underbilling) means you've done work but haven't invoiced it yet—this creates cash flow problems. Negative WIP (overbilling) means you've billed more than you've earned—this is good for cash flow but creates future risk if you can't complete the work profitably. WIP should be monitored weekly on active projects.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg mb-2 text-construction-dark">
                    What financial ratios should construction companies track?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Key financial ratios for contractors include: Current Ratio (current assets / current liabilities) should be &gt;1.3 to show you can cover short-term obligations. Quick Ratio (current assets - inventory / current liabilities) should be &gt;1.0. Gross Profit Margin should be 20-35% depending on trade. Net Profit Margin should be 8-15%. Days in A/R (accounts receivable / daily revenue) should be &lt;60 days. Debt-to-Equity should be &lt;2.0. WIP as % of revenue shouldn't exceed 15-20% or you're underbilling and starving cash flow.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-construction-dark text-white">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <BarChart3 className="w-16 h-16 text-construction-orange mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">
              See Your Financial Statements in Real-Time
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              BuildDesk generates live P&L by project, WIP schedules, and cash flow forecasts automatically. No waiting for month-end reports—see profitability and cash position today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-construction-orange hover:bg-construction-orange/90 text-white">
                Try BuildDesk Free for 14 Days
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                See Live Financial Dashboard
              </Button>
            </div>
            <p className="text-sm text-gray-400 mt-6">
              No credit card required • Setup in under 10 minutes • Cancel anytime
            </p>
          </div>
        </section>

        {/* Related Articles */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold mb-6 text-construction-dark">
              Related Financial Intelligence Articles
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Link to="/resources/calculate-true-project-profitability" className="group">
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <Calculator className="w-8 h-8 text-construction-orange mb-3" />
                    <h3 className="font-bold text-construction-dark mb-2 group-hover:text-construction-orange transition-colors">
                      Calculate True Profitability
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Step-by-step guide to calculating actual net profit including all costs, overhead, and hidden expenses.
                    </p>
                    <div className="flex items-center text-construction-orange text-sm font-semibold">
                      Read Guide <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/resources/cash-flow-management-guide" className="group">
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <DollarSign className="w-8 h-8 text-construction-orange mb-3" />
                    <h3 className="font-bold text-construction-dark mb-2 group-hover:text-construction-orange transition-colors">
                      Cash Flow Management
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Why profitable companies run out of cash and 5 strategies to fix the payment cycle gap.
                    </p>
                    <div className="flex items-center text-construction-orange text-sm font-semibold">
                      Read Guide <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/resources/financial-intelligence-guide" className="group">
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <FileText className="w-8 h-8 text-construction-orange mb-3" />
                    <h3 className="font-bold text-construction-dark mb-2 group-hover:text-construction-orange transition-colors">
                      Financial Intelligence Hub
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Complete guide to construction financial management, job costing, and profitability optimization.
                    </p>
                    <div className="flex items-center text-construction-orange text-sm font-semibold">
                      Explore Hub <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default ReadingFinancialStatementsGuide;
