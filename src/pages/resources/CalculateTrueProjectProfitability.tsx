import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Calculator,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  FileText,
  DollarSign,
  PieChart,
  Target,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const CalculateTrueProjectProfitability = () => {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "How to Calculate True Construction Project Profitability (Not Just Revenue)",
    "description": "Learn how to calculate actual construction project profit margins beyond simple revenue tracking. Includes hidden costs, overhead allocation, and step-by-step profitability formulas for contractors.",
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
      "@id": "https://builddesk.com/resources/calculate-true-project-profitability"
    },
    "keywords": "construction project profitability, calculate construction profit margin, job profit calculation, construction profitability metrics, true project profit"
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Calculate True Construction Project Profitability",
    "description": "Step-by-step guide to calculating accurate construction project profit margins including all hidden costs and overhead allocation.",
    "step": [
      {
        "@type": "HowToStep",
        "position": 1,
        "name": "Track All Direct Costs",
        "text": "Capture every dollar spent on the project: labor (including benefits and burden), materials, subcontractors, equipment rentals, and permits. Use real-time job costing to track these as they occur, not 30 days later."
      },
      {
        "@type": "HowToStep",
        "position": 2,
        "name": "Allocate Overhead Accurately",
        "text": "Calculate your overhead rate (total annual overhead / total annual revenue) and apply it to the project. Include office staff, rent, utilities, insurance, and administrative costs. Don't skip this—it's often 15-25% of project costs."
      },
      {
        "@type": "HowToStep",
        "position": 3,
        "name": "Account for Hidden Costs",
        "text": "Add costs that don't show up on invoices: warranty work, callbacks, financing costs (if you're carrying receivables), unbilled time from project managers, and mobilization/demobilization expenses."
      },
      {
        "@type": "HowToStep",
        "position": 4,
        "name": "Calculate Gross and Net Profit",
        "text": "Gross Profit = Revenue - Direct Costs. Net Profit = Gross Profit - Allocated Overhead - Hidden Costs. Then calculate margins: Gross Margin % = (Gross Profit / Revenue) × 100. Net Margin % = (Net Profit / Revenue) × 100."
      },
      {
        "@type": "HowToStep",
        "position": 5,
        "name": "Compare to Industry Benchmarks",
        "text": "Healthy construction net profit margins range from 8-15% for most trades. If you're below 5%, you're losing money when accounting for risk and opportunity cost. Use these benchmarks to identify underperforming projects early."
      }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What's the difference between gross profit and net profit in construction?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Gross profit is revenue minus direct job costs (labor, materials, subs, equipment). Net profit is gross profit minus allocated overhead (office costs, admin, insurance) and hidden costs (warranty work, callbacks, financing). Net profit is what you actually keep. Many contractors track gross profit but don't allocate overhead, so they think they're profitable when they're actually losing money."
        }
      },
      {
        "@type": "Question",
        "name": "How do I calculate overhead allocation for a single project?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Calculate your annual overhead rate: (Total Annual Overhead Costs / Total Annual Revenue) × 100. For example, if you have $500K in overhead and $3M in revenue, your overhead rate is 16.7%. Then apply this rate to each project. A $100K project would carry $16,700 in allocated overhead. Update this rate quarterly as your business grows."
        }
      },
      {
        "@type": "Question",
        "name": "What hidden costs do contractors miss when calculating profit?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The most commonly missed costs are: warranty and callback work (2-5% of project cost), unbilled project management time, financing costs from carrying receivables 30-90 days, small tools and consumables not tracked, vehicle expenses not allocated to jobs, and mobilization/demobilization costs. These can reduce actual profit margins by 3-8%."
        }
      },
      {
        "@type": "Question",
        "name": "What's a healthy profit margin for construction projects?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Industry benchmarks from CFMA show healthy net profit margins range from 8-15% for most construction trades. Gross margins should be 20-35% depending on your business model. If your net margin is below 5%, you're essentially working for free when accounting for risk, delayed payments, and opportunity cost. Specialty trades can achieve higher margins (15-20%) while commodity work may be lower (5-10%)."
        }
      },
      {
        "@type": "Question",
        "name": "How often should I calculate project profitability?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Calculate profitability weekly during active projects using real-time job costing. Don't wait until the project closes—by then you've already lost money and can't course-correct. Weekly profit checks let you catch cost overruns early, adjust labor allocation, and renegotiate change orders before it's too late. Final profitability calculations should happen within 30 days of project completion."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>How to Calculate True Construction Project Profitability | BuildDesk</title>
        <meta
          name="description"
          content="Learn how to calculate actual construction project profit margins beyond simple revenue tracking. Includes hidden costs, overhead allocation, and step-by-step profitability formulas for contractors."
        />
        <meta
          name="keywords"
          content="construction project profitability, calculate construction profit margin, job profit calculation, construction profitability metrics, true project profit, construction overhead allocation"
        />
        <link rel="canonical" href="https://builddesk.com/resources/calculate-true-project-profitability" />
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
              How to Calculate True Construction Project Profitability (Not Just Revenue)
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed">
              Most contractors think revenue = success. But when you factor in overhead, hidden costs, and delayed cash flow, that "$500K project" might actually lose money.
            </p>
            <div className="flex items-center gap-4 mt-8 text-sm text-gray-400">
              <span>15 min read</span>
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
                  <Calculator className="w-8 h-8 text-construction-orange flex-shrink-0 mt-1" />
                  <div>
                    <h2 className="text-2xl font-bold mb-4 text-construction-dark">
                      The Direct Answer
                    </h2>
                    <p className="text-lg leading-relaxed mb-4">
                      <strong>True construction project profitability</strong> is calculated by subtracting <span className="font-bold text-construction-orange">ALL costs</span> from revenue—not just the obvious ones. This includes direct costs (labor, materials, subs), allocated overhead (15-25% of project cost), and hidden costs (warranty work, callbacks, financing).
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 font-mono text-sm mb-4">
                      <div className="mb-2"><strong>Revenue:</strong> $100,000</div>
                      <div className="mb-2"><strong>- Direct Costs:</strong> $65,000 (labor, materials, subs)</div>
                      <div className="mb-2"><strong>= Gross Profit:</strong> $35,000 (35% gross margin)</div>
                      <div className="mb-2"><strong>- Allocated Overhead:</strong> $18,000 (18% overhead rate)</div>
                      <div className="mb-2"><strong>- Hidden Costs:</strong> $5,000 (callbacks, financing, unbilled PM time)</div>
                      <div className="pt-2 border-t border-gray-300"><strong>= Net Profit:</strong> <span className="text-construction-orange">$12,000 (12% net margin)</span></div>
                    </div>
                    <p className="text-lg leading-relaxed">
                      Industry benchmarks from CFMA show <span className="font-bold">healthy net margins are 8-15%</span>. If you're calculating profitability without overhead allocation, you're likely overestimating profit by 30-50%.
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
              Why "Profitable" Projects Actually Lose Money
            </h2>

            <div className="prose prose-lg max-w-none">
              <p className="text-lg leading-relaxed mb-6">
                Here's a scenario that happens to thousands of contractors every year:
              </p>

              <div className="bg-white p-6 rounded-lg border-l-4 border-l-red-500 mb-8">
                <p className="font-semibold text-construction-dark mb-3">
                  "We closed the quarter with $2.5M in revenue and 30% gross margins. The books said we made $750K. But when I looked at the bank account, we barely had enough to make payroll."
                </p>
                <p className="text-gray-600 text-sm">
                  — Commercial Contractor, 8 years in business
                </p>
              </div>

              <p className="text-lg leading-relaxed mb-6">
                What happened? The contractor calculated <strong>gross profit</strong> (revenue minus direct costs) but ignored:
              </p>

              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <Card className="border-2 border-red-200">
                  <CardContent className="pt-6">
                    <XCircle className="w-6 h-6 text-red-500 mb-3" />
                    <h3 className="font-bold text-construction-dark mb-2">Overhead Costs</h3>
                    <p className="text-sm text-gray-600">
                      Office staff, rent, insurance, software, accounting—$450K annually not allocated to projects
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-red-200">
                  <CardContent className="pt-6">
                    <XCircle className="w-6 h-6 text-red-500 mb-3" />
                    <h3 className="font-bold text-construction-dark mb-2">Hidden Costs</h3>
                    <p className="text-sm text-gray-600">
                      Warranty work, callbacks, financing costs from 60-day payment terms—another $125K
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-red-200">
                  <CardContent className="pt-6">
                    <XCircle className="w-6 h-6 text-red-500 mb-3" />
                    <h3 className="font-bold text-construction-dark mb-2">Unbilled Time</h3>
                    <p className="text-sm text-gray-600">
                      Project managers, estimators, foremen doing paperwork—$75K in labor not tracked to jobs
                    </p>
                  </CardContent>
                </Card>
              </div>

              <p className="text-lg leading-relaxed mb-6">
                <strong>Real profit:</strong> $750K (gross) - $450K (overhead) - $125K (hidden) - $75K (unbilled) = <span className="font-bold text-red-600">$100K net profit (4% margin)</span>
              </p>

              <p className="text-lg leading-relaxed">
                A 4% net margin means you're working for nearly nothing when you account for the risk of construction, delayed payments, and opportunity cost. This is why contractors can be "busy and broke" at the same time.
              </p>
            </div>
          </div>
        </section>

        {/* 5-Step Calculation Guide */}
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold mb-8 text-construction-dark flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-construction-orange" />
              5 Steps to Calculate True Project Profitability
            </h2>

            <div className="space-y-8">
              {/* Step 1 */}
              <Card className="border-l-4 border-l-construction-orange">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-construction-orange text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      1
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-3 text-construction-dark">
                        Track All Direct Costs in Real-Time
                      </h3>
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        Capture every dollar spent on the project <strong>as it happens</strong>, not 30 days later when invoices arrive. Direct costs include:
                      </p>
                      <ul className="space-y-2 mb-4">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-construction-orange flex-shrink-0 mt-0.5" />
                          <span><strong>Labor:</strong> Hourly wages + payroll burden (taxes, insurance, benefits)—typically 25-35% on top of base wages</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-construction-orange flex-shrink-0 mt-0.5" />
                          <span><strong>Materials:</strong> Every stick of lumber, bag of concrete, roll of wire—track at purchase, not when used</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-construction-orange flex-shrink-0 mt-0.5" />
                          <span><strong>Subcontractors:</strong> All sub invoices including retention (track when work is done, not when paid)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-construction-orange flex-shrink-0 mt-0.5" />
                          <span><strong>Equipment:</strong> Rentals, fuel, repairs allocated to this project</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-construction-orange flex-shrink-0 mt-0.5" />
                          <span><strong>Permits & fees:</strong> Building permits, impact fees, inspection costs</span>
                        </li>
                      </ul>
                      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <strong>⚠️ Critical mistake:</strong> Waiting for vendor invoices to arrive before recording costs. By the time you see the invoice, you're already 30 days behind on profitability tracking. Use <Link to="/features/job-costing" className="text-construction-orange hover:underline">real-time job costing</Link> to capture costs daily.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 2 */}
              <Card className="border-l-4 border-l-construction-orange">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-construction-orange text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      2
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-3 text-construction-dark">
                        Allocate Overhead to Each Project
                      </h3>
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        Overhead is the cost of running your business that doesn't directly go to a specific job. Most contractors skip this step—and wonder why they have revenue but no cash.
                      </p>

                      <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <p className="font-semibold text-construction-dark mb-2">How to Calculate Your Overhead Rate:</p>
                        <div className="font-mono text-sm space-y-1">
                          <div>1. Total Annual Overhead Costs: $500,000</div>
                          <div className="ml-4 text-gray-600">Office staff, rent, utilities, insurance, software, accounting, marketing</div>
                          <div>2. Total Annual Revenue (projected): $3,000,000</div>
                          <div>3. Overhead Rate = ($500,000 / $3,000,000) × 100 = <strong className="text-construction-orange">16.7%</strong></div>
                        </div>
                      </div>

                      <p className="text-gray-600 mb-4 leading-relaxed">
                        Apply this rate to every project. A $100K project carries $16,700 in overhead. A $50K project carries $8,350. This ensures each job pays its fair share of keeping the business running.
                      </p>

                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <strong>💡 Pro tip:</strong> Update your overhead rate quarterly as your business grows. Hire 2 new office staff? Your overhead rate just increased. Won 3 new projects? Your rate decreased because you're spreading overhead across more revenue.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 3 */}
              <Card className="border-l-4 border-l-construction-orange">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-construction-orange text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      3
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-3 text-construction-dark">
                        Account for Hidden Costs
                      </h3>
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        These costs don't show up on invoices but eat away at profit margins. Industry data shows hidden costs reduce actual profit by 3-8% on average.
                      </p>

                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <h4 className="font-bold text-construction-dark mb-2">Warranty & Callbacks</h4>
                          <p className="text-sm text-gray-600 mb-2">
                            Customer calls 6 months later: "The tile is loose." You send a crew for 4 hours. Cost: $400 not billed to the original project.
                          </p>
                          <p className="text-xs text-gray-500">Typical impact: 2-5% of project cost</p>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <h4 className="font-bold text-construction-dark mb-2">Financing Costs</h4>
                          <p className="text-sm text-gray-600 mb-2">
                            Customer pays in 60 days. You pay crews weekly and vendors in 30 days. That gap costs money—either in actual interest or opportunity cost.
                          </p>
                          <p className="text-xs text-gray-500">Typical impact: 1-3% of project cost</p>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <h4 className="font-bold text-construction-dark mb-2">Unbilled PM Time</h4>
                          <p className="text-sm text-gray-600 mb-2">
                            Project manager spends 10 hours doing RFIs, submittals, and coordination calls. If their loaded cost is $75/hr, that's $750 not tracked to the job.
                          </p>
                          <p className="text-xs text-gray-500">Typical impact: 2-4% of project cost</p>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <h4 className="font-bold text-construction-dark mb-2">Small Tools & Consumables</h4>
                          <p className="text-sm text-gray-600 mb-2">
                            Drill bits, saw blades, safety equipment, cleaning supplies. Small items that add up to thousands per project but rarely get tracked.
                          </p>
                          <p className="text-xs text-gray-500">Typical impact: 1-2% of project cost</p>
                        </div>
                      </div>

                      <p className="text-gray-600 leading-relaxed">
                        Add 5-10% to your cost estimates to account for these hidden expenses. Better to overestimate and be pleasantly surprised than underestimate and lose money.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 4 */}
              <Card className="border-l-4 border-l-construction-orange">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-construction-orange text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      4
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-3 text-construction-dark">
                        Calculate Gross Profit, Net Profit, and Margins
                      </h3>
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        Now that you have all costs tracked, do the math. Here's a real example from a $250K commercial remodel:
                      </p>

                      <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200 font-mono text-sm mb-4">
                        <div className="mb-4">
                          <div className="text-lg font-bold mb-2 text-construction-dark">Revenue</div>
                          <div className="ml-4">Contract amount: $250,000</div>
                          <div className="ml-4">Change orders: $18,000</div>
                          <div className="ml-4 pt-2 border-t border-gray-300 font-bold">Total Revenue: $268,000</div>
                        </div>

                        <div className="mb-4">
                          <div className="text-lg font-bold mb-2 text-construction-dark">Direct Costs</div>
                          <div className="ml-4">Labor (w/ burden): $95,000</div>
                          <div className="ml-4">Materials: $58,000</div>
                          <div className="ml-4">Subcontractors: $42,000</div>
                          <div className="ml-4">Equipment rental: $8,000</div>
                          <div className="ml-4">Permits: $3,500</div>
                          <div className="ml-4 pt-2 border-t border-gray-300 font-bold">Total Direct Costs: $206,500</div>
                        </div>

                        <div className="mb-4 bg-green-50 p-3 rounded">
                          <div className="font-bold text-green-700">Gross Profit = Revenue - Direct Costs</div>
                          <div className="ml-4 text-green-700">$268,000 - $206,500 = $61,500</div>
                          <div className="ml-4 text-green-700">Gross Margin = 23.0%</div>
                        </div>

                        <div className="mb-4">
                          <div className="text-lg font-bold mb-2 text-construction-dark">Allocated Overhead & Hidden Costs</div>
                          <div className="ml-4">Overhead (16.7% rate): $44,756</div>
                          <div className="ml-4">Warranty/callbacks: $6,700</div>
                          <div className="ml-4">Financing costs: $4,020</div>
                          <div className="ml-4">Unbilled PM time: $5,360</div>
                          <div className="ml-4 pt-2 border-t border-gray-300 font-bold">Total Allocated/Hidden: $60,836</div>
                        </div>

                        <div className="bg-construction-orange/10 p-3 rounded border-2 border-construction-orange">
                          <div className="font-bold text-construction-dark">Net Profit = Gross Profit - Overhead - Hidden Costs</div>
                          <div className="ml-4 text-construction-dark">$61,500 - $60,836 = <strong className="text-construction-orange text-lg">$664</strong></div>
                          <div className="ml-4 text-construction-dark">Net Margin = <strong className="text-construction-orange">0.25%</strong></div>
                        </div>
                      </div>

                      <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <strong>⚠️ Reality check:</strong> This project looked great on paper (23% gross margin) but netted only $664 after ALL costs. That's $664 profit on a 6-month project requiring $268K in revenue. This is a <strong>losing project</strong> when you account for risk and opportunity cost.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 5 */}
              <Card className="border-l-4 border-l-construction-orange">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-construction-orange text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      5
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-3 text-construction-dark">
                        Compare to Industry Benchmarks
                      </h3>
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        Once you know your true profitability, compare it to industry standards. Here's what healthy margins look like according to CFMA research:
                      </p>

                      <div className="grid md:grid-cols-3 gap-4 mb-4">
                        <Card className="bg-green-50 border-2 border-green-300">
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
                              <div className="text-3xl font-bold text-green-700 mb-1">8-15%</div>
                              <div className="text-sm font-semibold text-green-700 mb-2">Healthy Net Margin</div>
                              <p className="text-xs text-gray-600">
                                Sustainable profit range for most construction trades
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-yellow-50 border-2 border-yellow-300">
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                              <div className="text-3xl font-bold text-yellow-700 mb-1">3-7%</div>
                              <div className="text-sm font-semibold text-yellow-700 mb-2">At-Risk Zone</div>
                              <p className="text-xs text-gray-600">
                                Profitable but vulnerable to market changes
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-red-50 border-2 border-red-300">
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                              <div className="text-3xl font-bold text-red-700 mb-1">&lt;3%</div>
                              <div className="text-sm font-semibold text-red-700 mb-2">Losing Money</div>
                              <p className="text-xs text-gray-600">
                                Not enough profit to justify risk and opportunity cost
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                        <p className="font-semibold text-construction-dark mb-2">Gross Margin Benchmarks by Trade:</p>
                        <ul className="space-y-1 text-sm text-gray-700">
                          <li className="flex justify-between"><span>Specialty trades (electrical, HVAC, plumbing):</span> <strong>28-35%</strong></li>
                          <li className="flex justify-between"><span>General contractors (residential):</span> <strong>20-28%</strong></li>
                          <li className="flex justify-between"><span>Commercial GCs:</span> <strong>15-25%</strong></li>
                          <li className="flex justify-between"><span>Heavy civil/infrastructure:</span> <strong>12-20%</strong></li>
                        </ul>
                      </div>

                      <p className="text-gray-600 leading-relaxed">
                        If your margins are consistently below these benchmarks, you have a pricing problem, a cost control problem, or both. Use <Link to="/resources/budget-vs-actual-tracking-guide" className="text-construction-orange hover:underline">budget vs actual tracking</Link> to identify where profit is leaking.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Common Mistakes */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold mb-8 text-construction-dark flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500" />
              5 Profitability Calculation Mistakes That Cost You Money
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-l-4 border-l-red-500">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-3">
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                    <h3 className="font-bold text-construction-dark">Mistake #1: Using Cash Basis Accounting</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Waiting for invoices to arrive before recording costs means your profitability numbers are always 30-60 days behind reality.
                  </p>
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                    <p className="text-xs font-semibold text-green-700 mb-1">✓ Do This Instead:</p>
                    <p className="text-xs text-gray-700">
                      Use accrual accounting and track costs when incurred, not when invoices are paid. Real-time job costing is essential.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-3">
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                    <h3 className="font-bold text-construction-dark">Mistake #2: Ignoring Overhead Allocation</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    "I made $40K on that job!" No, you made $40K in gross profit. After overhead, you might have made $12K.
                  </p>
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                    <p className="text-xs font-semibold text-green-700 mb-1">✓ Do This Instead:</p>
                    <p className="text-xs text-gray-700">
                      Calculate your overhead rate annually and apply it to every project. Every job must carry its share of business costs.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-3">
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                    <h3 className="font-bold text-construction-dark">Mistake #3: Forgetting Payroll Burden</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Estimating labor at $25/hr when the true loaded cost is $32/hr (with taxes, insurance, benefits) destroys margins.
                  </p>
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                    <p className="text-xs font-semibold text-green-700 mb-1">✓ Do This Instead:</p>
                    <p className="text-xs text-gray-700">
                      Always use loaded labor rates (base wage + 25-35% burden). Track burden separately so you know the true cost.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-3">
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                    <h3 className="font-bold text-construction-dark">Mistake #4: Not Tracking Change Orders</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Doing "small extras" without formal change orders means you're working for free. $500 here, $1,200 there—it adds up.
                  </p>
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                    <p className="text-xs font-semibold text-green-700 mb-1">✓ Do This Instead:</p>
                    <p className="text-xs text-gray-700">
                      Document and bill every change, no matter how small. Use digital change order workflows to make this painless.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500 md:col-span-2">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-3">
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                    <h3 className="font-bold text-construction-dark">Mistake #5: Calculating Profit Only at Project Close</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Waiting until the project is done to calculate profitability means you can't course-correct. By then, the money is already lost.
                  </p>
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                    <p className="text-xs font-semibold text-green-700 mb-1">✓ Do This Instead:</p>
                    <p className="text-xs text-gray-700">
                      Calculate profitability weekly during active projects. Track budget vs actual in real-time so you can adjust labor, negotiate change orders, or cut costs before it's too late. Learn more about <Link to="/features/real-time-budgeting" className="text-construction-orange hover:underline font-semibold">real-time budgeting strategies</Link>.
                    </p>
                  </div>
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
                    What's the difference between gross profit and net profit in construction?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Gross profit is revenue minus direct job costs (labor, materials, subs, equipment). Net profit is gross profit minus allocated overhead (office costs, admin, insurance) and hidden costs (warranty work, callbacks, financing). Net profit is what you actually keep. Many contractors track gross profit but don't allocate overhead, so they think they're profitable when they're actually losing money.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg mb-2 text-construction-dark">
                    How do I calculate overhead allocation for a single project?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Calculate your annual overhead rate: (Total Annual Overhead Costs / Total Annual Revenue) × 100. For example, if you have $500K in overhead and $3M in revenue, your overhead rate is 16.7%. Then apply this rate to each project. A $100K project would carry $16,700 in allocated overhead. Update this rate quarterly as your business grows.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg mb-2 text-construction-dark">
                    What hidden costs do contractors miss when calculating profit?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    The most commonly missed costs are: warranty and callback work (2-5% of project cost), unbilled project management time, financing costs from carrying receivables 30-90 days, small tools and consumables not tracked, vehicle expenses not allocated to jobs, and mobilization/demobilization costs. These can reduce actual profit margins by 3-8%.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg mb-2 text-construction-dark">
                    What's a healthy profit margin for construction projects?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Industry benchmarks from CFMA show healthy net profit margins range from 8-15% for most construction trades. Gross margins should be 20-35% depending on your business model. If your net margin is below 5%, you're essentially working for free when accounting for risk, delayed payments, and opportunity cost. Specialty trades can achieve higher margins (15-20%) while commodity work may be lower (5-10%).
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg mb-2 text-construction-dark">
                    How often should I calculate project profitability?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Calculate profitability weekly during active projects using real-time job costing. Don't wait until the project closes—by then you've already lost money and can't course-correct. Weekly profit checks let you catch cost overruns early, adjust labor allocation, and renegotiate change orders before it's too late. Final profitability calculations should happen within 30 days of project completion.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-construction-dark text-white">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <PieChart className="w-16 h-16 text-construction-orange mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">
              Stop Guessing. Start Knowing Your True Profitability.
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              BuildDesk gives you real-time job costing, automated overhead allocation, and profitability tracking on every project. Know if you're making money today—not 30 days later.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-construction-orange hover:bg-construction-orange/90 text-white">
                Try BuildDesk Free for 14 Days
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                See Live Profitability Demo
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
              <Link to="/resources/budget-vs-actual-tracking-guide" className="group">
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <TrendingUp className="w-8 h-8 text-construction-orange mb-3" />
                    <h3 className="font-bold text-construction-dark mb-2 group-hover:text-construction-orange transition-colors">
                      Budget vs Actual Tracking
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Learn the ±5% variance rule and how to catch cost overruns before they kill profitability.
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

export default CalculateTrueProjectProfitability;
