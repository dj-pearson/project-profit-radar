import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Calculator,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Target,
  Clock,
  ArrowRight,
  XCircle,
  BarChart3,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const ConstructionROICalculatorGuide = () => {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Construction ROI Calculator: How to Calculate Software & Tool ROI (Free Tool)",
    "description": "Learn how to calculate ROI for construction management software, equipment, and tools. Includes step-by-step formulas, real examples, and free ROI calculator for contractors.",
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
      "@id": "https://builddesk.com/resources/construction-roi-calculator-guide"
    },
    "keywords": "construction ROI calculator, calculate construction software ROI, construction management software ROI, equipment ROI calculator, contractor ROI tool"
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Calculate ROI for Construction Software and Tools",
    "description": "Step-by-step guide to calculating return on investment for construction management software, equipment purchases, and productivity tools.",
    "step": [
      {
        "@type": "HowToStep",
        "position": 1,
        "name": "Identify All Costs",
        "text": "Calculate total cost of ownership including purchase price, subscription fees, implementation costs, training time, and ongoing support. Don't forget hidden costs like IT infrastructure, data migration, and learning curve productivity loss. Annual cost should include ALL expenses."
      },
      {
        "@type": "HowToStep",
        "position": 2,
        "name": "Quantify Time Savings",
        "text": "Measure hours saved per week from automation, reduced rework, faster approvals, and eliminated manual processes. Multiply by loaded labor rates to convert time to dollars. Example: 10 hours/week saved × $45/hr loaded rate × 52 weeks = $23,400 annual savings."
      },
      {
        "@type": "HowToStep",
        "position": 3,
        "name": "Calculate Cost Reduction Benefits",
        "text": "Identify direct cost savings: fewer change order disputes (1-3% of revenue), reduced material waste (2-5% of material costs), avoided safety fines, lower insurance premiums from better documentation, and prevented project overruns. Use conservative estimates."
      },
      {
        "@type": "HowToStep",
        "position": 4,
        "name": "Measure Revenue Impact",
        "text": "Estimate revenue gains from taking on more projects with the same staff, faster project completion allowing earlier payment, reduced A/R aging from better billing processes, and winning more bids due to professional proposals. Even 1-2 additional projects per year has massive ROI."
      },
      {
        "@type": "HowToStep",
        "position": 5,
        "name": "Calculate ROI and Payback Period",
        "text": "ROI % = [(Total Annual Benefits - Annual Cost) / Annual Cost] × 100. Payback Period = Total Investment / Annual Net Benefit. Good ROI: >200% in year 1. Payback period should be <6 months for software, <2 years for equipment. Compare to your cost of capital (typically 10-15%)."
      }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is ROI in construction and how do you calculate it?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "ROI (Return on Investment) in construction measures the financial return from an investment in software, equipment, or tools. The formula is: ROI % = [(Total Annual Benefits - Annual Cost) / Annual Cost] × 100. Example: If software costs $4,200/year but saves $18,500 in labor, material waste, and rework, ROI = [($18,500 - $4,200) / $4,200] × 100 = 340%. This means you get $3.40 back for every $1 invested. Good construction software ROI is typically 200-500% in the first year."
        }
      },
      {
        "@type": "Question",
        "name": "What is a good ROI for construction management software?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A good ROI for construction management software is 200-500% in the first year, with payback period under 6 months. Industry data shows contractors typically save 10-15 hours per week on administrative tasks, reduce change order disputes by 1-3% of revenue, and cut material waste by 2-5%. For a $3M/year contractor, this translates to $25K-$50K in annual savings from software costing $3K-$6K per year. ROI above 300% is excellent. Below 100% means the software isn't worth the investment."
        }
      },
      {
        "@type": "Question",
        "name": "How do I calculate time savings in dollars for ROI?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Convert time savings to dollars using loaded labor rates (base wage + burden). Example: Your project manager makes $70K/year ($33.65/hr) but with taxes, insurance, and benefits, loaded rate is $45/hr. If software saves 8 hours/week, annual savings = 8 hours × 52 weeks × $45 = $18,720. Don't use base wage—always use loaded rates or you'll underestimate ROI by 25-35%. Track savings across all users: PMs, foremen, admin staff, and owner time."
        }
      },
      {
        "@type": "Question",
        "name": "What hidden costs should I include when calculating software ROI?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Hidden costs that reduce ROI include: implementation time (setup, data migration, customization), training time for all users, productivity loss during learning curve (typically 2-4 weeks), IT infrastructure needs, ongoing support and maintenance, integration costs with existing systems (QuickBooks, etc.), and subscription price increases over time. Add these to your annual cost. Conversely, hidden BENEFITS include reduced A/R aging (faster cash collection), fewer safety incidents (lower insurance), and better customer satisfaction (more referrals)."
        }
      },
      {
        "@type": "Question",
        "name": "How long should the payback period be for construction software?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Construction management software should have a payback period of 3-6 months. Payback period = Total Investment / Monthly Net Benefit. Example: $5,000 implementation + $350/month subscription = $5,350 total first-year cost. If you save $1,500/month in labor and reduced rework, payback = $5,350 / $1,500 = 3.6 months. After that, it's pure profit. Equipment purchases can have longer payback (1-2 years), but software should pay for itself within one budget cycle. If payback exceeds 12 months, reconsider the purchase."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Construction ROI Calculator: Calculate Software & Tool ROI | BuildDesk</title>
        <meta
          name="description"
          content="Learn how to calculate ROI for construction management software, equipment, and tools. Includes step-by-step formulas, real examples, and free ROI calculator for contractors."
        />
        <meta
          name="keywords"
          content="construction ROI calculator, calculate construction software ROI, construction management software ROI, equipment ROI calculator, contractor ROI tool, BuildDesk ROI"
        />
        <link rel="canonical" href="https://builddesk.com/resources/construction-roi-calculator-guide" />
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
              Financial Intelligence Series • Free Tool Included
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Construction ROI Calculator: How to Calculate Software & Tool ROI
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed">
              Spending $350/month on software but can't prove if it's worth it? Here's how to calculate actual ROI—plus a free calculator that does the math for you.
            </p>
            <div className="flex items-center gap-4 mt-8 text-sm text-gray-400">
              <span>16 min read</span>
              <span>•</span>
              <span>Updated January 2025</span>
              <span>•</span>
              <span className="text-construction-orange font-semibold">Free ROI Calculator ↓</span>
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
                      <strong>ROI (Return on Investment)</strong> for construction software is calculated as: <span className="font-mono text-construction-orange">ROI % = [(Annual Benefits - Annual Cost) / Annual Cost] × 100</span>. If software costs $4,200/year but saves you $18,500 in labor, reduced rework, and material waste, your ROI is <span className="font-bold text-construction-orange">340%</span>—meaning you get $3.40 back for every dollar spent.
                    </p>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                      <p className="font-bold text-construction-dark mb-2">Real Example: Construction Management Software ROI</p>
                      <div className="font-mono text-sm space-y-1">
                        <div><strong>Annual Cost:</strong> $4,200 ($350/month × 12 months)</div>
                        <div className="mt-3"><strong>Annual Benefits:</strong></div>
                        <div className="ml-4">Time savings: 12 hrs/week × $45/hr × 52 = $28,080</div>
                        <div className="ml-4">Reduced change order disputes: 2% of $2M revenue = $40,000</div>
                        <div className="ml-4">Material waste reduction: 3% of $650K materials = $19,500</div>
                        <div className="ml-4">Avoided safety fines: $5,000</div>
                        <div className="ml-4 pt-2 border-t border-gray-300"><strong>Total Benefits: $92,580</strong></div>
                        <div className="mt-3 bg-construction-orange/10 p-2 rounded">
                          <div><strong>ROI = ($92,580 - $4,200) / $4,200 × 100 = <span className="text-construction-orange text-lg">2,104%</span></strong></div>
                          <div className="text-xs text-gray-600 mt-1">Payback period: 0.5 months (pays for itself in 2 weeks)</div>
                        </div>
                      </div>
                    </div>

                    <p className="text-lg leading-relaxed">
                      Industry benchmark: <span className="font-bold">Good construction software ROI is 200-500% in year 1</span>, with payback under 6 months. Below 100% means the tool isn't worth buying.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Free Calculator CTA */}
        <section className="py-12 bg-gradient-to-r from-construction-orange to-orange-600">
          <div className="container mx-auto px-4 max-w-4xl text-center text-white">
            <Calculator className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h2 className="text-3xl font-bold mb-3">
              Free Construction ROI Calculator
            </h2>
            <p className="text-lg mb-6 opacity-90 max-w-2xl mx-auto">
              Skip the spreadsheet. Use our free calculator to instantly see your ROI from BuildDesk or any construction software/tool.
            </p>
            <Link to="/profitability-calculator">
              <Button size="lg" className="bg-white text-construction-orange hover:bg-gray-100">
                <Calculator className="w-5 h-5 mr-2" />
                Calculate Your ROI Now (Free)
              </Button>
            </Link>
            <p className="text-sm mt-4 opacity-80">
              Takes 2 minutes • No signup required • Instant results
            </p>
          </div>
        </section>

        {/* Problem Section */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold mb-8 text-construction-dark flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-construction-orange" />
              Why Most Contractors Never Calculate ROI
            </h2>

            <div className="prose prose-lg max-w-none">
              <p className="text-lg leading-relaxed mb-6">
                Here's a conversation that happens daily in construction companies:
              </p>

              <div className="bg-white p-6 rounded-lg border-l-4 border-l-yellow-500 mb-8">
                <p className="font-semibold text-construction-dark mb-2">
                  "How much is that new software?"
                </p>
                <p className="text-gray-700 mb-2">
                  "$350 a month."
                </p>
                <p className="font-semibold text-construction-dark mb-2">
                  "That's $4,200 a year! We can't afford that."
                </p>
                <p className="text-gray-600 text-sm italic">
                  — Conversation overheard at every construction company considering new software
                </p>
              </div>

              <p className="text-lg leading-relaxed mb-6">
                What's wrong with this thinking? They're looking at <strong>cost</strong>, not <strong>return</strong>. That same contractor will:
              </p>

              <div className="grid md:grid-cols-2 gap-4 mb-8">
                <Card className="border-2 border-red-200">
                  <CardContent className="pt-6">
                    <XCircle className="w-6 h-6 text-red-500 mb-3" />
                    <p className="text-sm text-gray-600">
                      Pay an admin $18/hour to manually create Excel reports that take 6 hours/week = <strong>$28,080/year</strong> in wasted labor
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-red-200">
                  <CardContent className="pt-6">
                    <XCircle className="w-6 h-6 text-red-500 mb-3" />
                    <p className="text-sm text-gray-600">
                      Lose <strong>$40,000/year</strong> to change order disputes because they don't have documented photo timelines and approval workflows
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-red-200">
                  <CardContent className="pt-6">
                    <XCircle className="w-6 h-6 text-red-500 mb-3" />
                    <p className="text-sm text-gray-600">
                      Waste <strong>$19,500/year</strong> in material over-ordering because they don't track material usage per project
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-red-200">
                  <CardContent className="pt-6">
                    <XCircle className="w-6 h-6 text-red-500 mb-3" />
                    <p className="text-sm text-gray-600">
                      Turn down projects worth <strong>$200K+ in revenue</strong> because they're "too busy" managing paperwork
                    </p>
                  </CardContent>
                </Card>
              </div>

              <p className="text-lg leading-relaxed mb-6">
                <strong>Total cost of NOT buying the software:</strong> $28,080 + $40,000 + $19,500 + $200,000 (lost revenue) = <span className="font-bold text-red-600">$287,580 per year</span>
              </p>

              <p className="text-lg leading-relaxed">
                The $4,200 software expense suddenly looks like the cheapest investment they could make. But without calculating ROI, they'll never see it.
              </p>
            </div>
          </div>
        </section>

        {/* 5-Step ROI Calculation */}
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold mb-8 text-construction-dark flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-construction-orange" />
              5 Steps to Calculate Construction Software ROI
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
                        Identify ALL Costs (Not Just Subscription Price)
                      </h3>
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        Most contractors only look at the monthly subscription cost. But true cost of ownership includes hidden expenses:
                      </p>

                      <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <p className="font-bold text-construction-dark mb-2">Total Cost of Ownership Example:</p>
                        <div className="font-mono text-sm space-y-1">
                          <div className="flex justify-between">
                            <span>Monthly subscription ($350 × 12 months)</span>
                            <span>$4,200</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Implementation/setup time (20 hours × $45/hr)</span>
                            <span>$900</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Training for 5 users (8 hours × 5 × $35/hr)</span>
                            <span>$1,400</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Data migration from old system</span>
                            <span>$500</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Learning curve productivity loss (2 weeks)</span>
                            <span>$1,200</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-gray-300 font-bold">
                            <span>First Year Total Cost</span>
                            <span className="text-red-600">$8,200</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Ongoing annual cost (years 2+)</span>
                            <span>$4,200</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <strong>💡 Pro tip:</strong> Year 1 costs are higher due to implementation. Calculate ROI separately for year 1 and ongoing years. Good software should still hit 200%+ ROI even in year 1 with implementation costs included.
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
                        Quantify Time Savings (Convert Hours to Dollars)
                      </h3>
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        Time savings is the #1 ROI driver for construction software. Measure hours saved per week, then multiply by <strong>loaded labor rates</strong> (not base wage).
                      </p>

                      <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-lg mb-4">
                        <p className="font-bold text-construction-dark mb-2">⚠️ Critical: Use Loaded Labor Rates</p>
                        <p className="text-sm text-gray-700 mb-3">
                          Don't use base wages ($25/hr). Use loaded rates that include payroll taxes, insurance, benefits, and overhead. Loaded rates are typically 25-40% higher than base wages.
                        </p>
                        <div className="font-mono text-xs bg-white p-3 rounded border border-yellow-200">
                          <div>Project Manager: $70K salary = $33.65/hr base → <strong>$45/hr loaded</strong></div>
                          <div>Admin Staff: $40K salary = $19.23/hr base → <strong>$26/hr loaded</strong></div>
                          <div>Foreman: $60K salary = $28.85/hr base → <strong>$38/hr loaded</strong></div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <p className="font-bold text-construction-dark mb-2">Time Savings Calculation Example:</p>
                        <div className="space-y-3 text-sm">
                          <div>
                            <div className="font-semibold mb-1">Project Manager: 8 hrs/week saved</div>
                            <div className="ml-4 text-gray-600">
                              • 3 hrs: Automated daily reports vs manual Excel<br />
                              • 2 hrs: Digital change orders vs paper/email<br />
                              • 2 hrs: Real-time budget tracking vs month-end reconciliation<br />
                              • 1 hr: Photo documentation vs driving to site for punch list
                            </div>
                            <div className="ml-4 font-mono mt-2">
                              8 hrs/week × 52 weeks × $45/hr = <strong className="text-green-600">$18,720/year</strong>
                            </div>
                          </div>

                          <div>
                            <div className="font-semibold mb-1">Admin Staff: 6 hrs/week saved</div>
                            <div className="ml-4 text-gray-600">
                              • 4 hrs: Automated invoicing vs manual entry<br />
                              • 2 hrs: Integrated time tracking vs paper timesheets
                            </div>
                            <div className="ml-4 font-mono mt-2">
                              6 hrs/week × 52 weeks × $26/hr = <strong className="text-green-600">$8,112/year</strong>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-gray-300">
                            <strong>Total Time Savings: $26,832/year</strong>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 leading-relaxed">
                        Track savings conservatively. It's better to underestimate and be pleasantly surprised than overestimate and be disappointed.
                      </p>
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
                        Calculate Cost Reduction Benefits
                      </h3>
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        Beyond time savings, good software directly reduces costs. These savings compound over time.
                      </p>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <h4 className="font-bold text-construction-dark mb-2 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            Reduced Change Order Disputes
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            Photo documentation, approval workflows, and paper trails prevent "he said/she said" disputes.
                          </p>
                          <div className="font-mono text-xs">
                            2% of $2M revenue = <strong className="text-green-600">$40,000/year</strong>
                          </div>
                        </div>

                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <h4 className="font-bold text-construction-dark mb-2 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            Material Waste Reduction
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            Accurate quantity tracking and job costing prevents over-ordering and theft.
                          </p>
                          <div className="font-mono text-xs">
                            3% of $650K materials = <strong className="text-green-600">$19,500/year</strong>
                          </div>
                        </div>

                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <h4 className="font-bold text-construction-dark mb-2 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            Avoided Safety Fines
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            Digital safety checklists and incident reporting reduce OSHA violations.
                          </p>
                          <div className="font-mono text-xs">
                            Avg fine avoided: <strong className="text-green-600">$5,000/year</strong>
                          </div>
                        </div>

                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <h4 className="font-bold text-construction-dark mb-2 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            Reduced Rework
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            Clear specs, RFI tracking, and submittal workflows prevent costly mistakes.
                          </p>
                          <div className="font-mono text-xs">
                            1% of project costs = <strong className="text-green-600">$20,000/year</strong>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="font-bold text-construction-dark mb-1">Total Cost Reduction:</div>
                        <div className="font-mono">
                          $40,000 + $19,500 + $5,000 + $20,000 = <strong className="text-construction-orange text-lg">$84,500/year</strong>
                        </div>
                      </div>
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
                        Measure Revenue Impact
                      </h3>
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        The hardest ROI category to quantify—but often the highest impact. Can you take on more work with the same staff?
                      </p>

                      <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <h4 className="font-bold text-construction-dark mb-2">Additional Project Capacity</h4>
                          <p className="text-sm text-gray-600 mb-3">
                            If automation saves 14 hours/week across the team, that's 728 hours/year of capacity. Can you use that to take on 1-2 more projects?
                          </p>
                          <div className="bg-white p-3 rounded border border-blue-300">
                            <div className="font-mono text-sm">
                              <div>Average project size: $200,000</div>
                              <div>Gross margin: 25%</div>
                              <div>Net margin: 10%</div>
                              <div className="pt-2 border-t border-blue-200 mt-2">
                                <strong>1 additional project = $20,000 net profit</strong>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <h4 className="font-bold text-construction-dark mb-2">Faster Payment Collection</h4>
                          <p className="text-sm text-gray-600 mb-3">
                            Automated invoicing and progress billing gets you paid faster. Reducing A/R from 65 days to 45 days improves cash flow.
                          </p>
                          <div className="font-mono text-xs text-gray-700">
                            Value: Opportunity cost of capital (10-15% annually) × accelerated cash
                          </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <h4 className="font-bold text-construction-dark mb-2">Win More Bids</h4>
                          <p className="text-sm text-gray-600 mb-3">
                            Professional proposals with real-time cost data help you bid accurately and win more work.
                          </p>
                          <div className="font-mono text-xs text-gray-700">
                            Conservative estimate: 2% higher win rate on bids
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 bg-yellow-50 border border-yellow-300 p-4 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <strong>💡 Conservative approach:</strong> Don't include revenue impact in your initial ROI calculation unless you can prove it with data. Use it as a bonus upside once you've validated time savings and cost reduction.
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
                        Calculate ROI and Payback Period
                      </h3>
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        Now put it all together. Use these two formulas to evaluate any construction software or tool investment:
                      </p>

                      <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200 mb-4">
                        <div className="space-y-4">
                          <div>
                            <div className="font-bold text-construction-dark mb-2">ROI Formula:</div>
                            <div className="bg-white p-3 rounded border border-gray-300 font-mono text-sm">
                              ROI % = [(Total Annual Benefits - Annual Cost) / Annual Cost] × 100
                            </div>
                          </div>

                          <div>
                            <div className="font-bold text-construction-dark mb-2">Payback Period Formula:</div>
                            <div className="bg-white p-3 rounded border border-gray-300 font-mono text-sm">
                              Payback Period (months) = Total First-Year Investment / Monthly Net Benefit
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-construction-orange/10 p-6 rounded-lg border-2 border-construction-orange mb-4">
                        <p className="font-bold text-construction-dark mb-3">Full ROI Calculation Example:</p>
                        <div className="font-mono text-sm space-y-2">
                          <div className="mb-3">
                            <div className="font-bold">Annual Benefits:</div>
                            <div className="ml-4 space-y-1">
                              <div className="flex justify-between">
                                <span>Time savings</span>
                                <span>$26,832</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Cost reductions</span>
                                <span>$84,500</span>
                              </div>
                              <div className="flex justify-between pt-2 border-t border-gray-300">
                                <strong>Total Benefits</strong>
                                <strong>$111,332</strong>
                              </div>
                            </div>
                          </div>

                          <div className="mb-3">
                            <div className="font-bold">Annual Cost:</div>
                            <div className="ml-4">
                              <div className="flex justify-between">
                                <span>First-year cost (with implementation)</span>
                                <span>$8,200</span>
                              </div>
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>Ongoing cost (year 2+)</span>
                                <span>$4,200</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white p-4 rounded border-2 border-construction-orange">
                            <div className="mb-2">
                              <div className="font-bold">Year 1 ROI:</div>
                              <div className="ml-4">($111,332 - $8,200) / $8,200 × 100 = <strong className="text-construction-orange text-xl">1,258%</strong></div>
                            </div>
                            <div className="mb-2">
                              <div className="font-bold">Ongoing ROI (Year 2+):</div>
                              <div className="ml-4">($111,332 - $4,200) / $4,200 × 100 = <strong className="text-construction-orange text-xl">2,551%</strong></div>
                            </div>
                            <div>
                              <div className="font-bold">Payback Period:</div>
                              <div className="ml-4">$8,200 / ($111,332 / 12) = <strong className="text-construction-orange text-xl">0.9 months</strong></div>
                              <div className="ml-4 text-xs text-gray-600">Pays for itself in less than 1 month</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                        <p className="font-semibold text-construction-dark mb-2">✓ ROI Benchmarks:</p>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li><strong className="text-green-700">&gt;300% ROI:</strong> Excellent investment, buy immediately</li>
                          <li><strong className="text-green-600">200-300% ROI:</strong> Good investment, strong business case</li>
                          <li><strong className="text-yellow-600">100-200% ROI:</strong> Acceptable, proceed with caution</li>
                          <li><strong className="text-red-600">&lt;100% ROI:</strong> Poor investment, don't buy</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Interactive Calculator CTA */}
        <section className="py-16 bg-gradient-to-r from-construction-dark to-gray-800 text-white">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <Zap className="w-16 h-16 text-construction-orange mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">
              Calculate Your Exact ROI in 2 Minutes
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Use our free ROI calculator to see exactly how much BuildDesk (or any construction software) will save you annually.
            </p>
            <Link to="/profitability-calculator">
              <Button size="lg" className="bg-construction-orange hover:bg-construction-orange/90 text-white mb-4">
                <Calculator className="w-5 h-5 mr-2" />
                Try Free ROI Calculator
              </Button>
            </Link>
            <p className="text-sm text-gray-400">
              See time savings, cost reductions, and payback period • No signup • Instant results
            </p>
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
                    What is ROI in construction and how do you calculate it?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    ROI (Return on Investment) in construction measures the financial return from an investment in software, equipment, or tools. The formula is: ROI % = [(Total Annual Benefits - Annual Cost) / Annual Cost] × 100. Example: If software costs $4,200/year but saves $18,500 in labor, material waste, and rework, ROI = [($18,500 - $4,200) / $4,200] × 100 = 340%. This means you get $3.40 back for every $1 invested. Good construction software ROI is typically 200-500% in the first year.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg mb-2 text-construction-dark">
                    What is a good ROI for construction management software?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    A good ROI for construction management software is 200-500% in the first year, with payback period under 6 months. Industry data shows contractors typically save 10-15 hours per week on administrative tasks, reduce change order disputes by 1-3% of revenue, and cut material waste by 2-5%. For a $3M/year contractor, this translates to $25K-$50K in annual savings from software costing $3K-$6K per year. ROI above 300% is excellent. Below 100% means the software isn't worth the investment.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg mb-2 text-construction-dark">
                    How do I calculate time savings in dollars for ROI?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Convert time savings to dollars using loaded labor rates (base wage + burden). Example: Your project manager makes $70K/year ($33.65/hr) but with taxes, insurance, and benefits, loaded rate is $45/hr. If software saves 8 hours/week, annual savings = 8 hours × 52 weeks × $45 = $18,720. Don't use base wage—always use loaded rates or you'll underestimate ROI by 25-35%. Track savings across all users: PMs, foremen, admin staff, and owner time.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg mb-2 text-construction-dark">
                    What hidden costs should I include when calculating software ROI?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Hidden costs that reduce ROI include: implementation time (setup, data migration, customization), training time for all users, productivity loss during learning curve (typically 2-4 weeks), IT infrastructure needs, ongoing support and maintenance, integration costs with existing systems (QuickBooks, etc.), and subscription price increases over time. Add these to your annual cost. Conversely, hidden BENEFITS include reduced A/R aging (faster cash collection), fewer safety incidents (lower insurance), and better customer satisfaction (more referrals).
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg mb-2 text-construction-dark">
                    How long should the payback period be for construction software?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Construction management software should have a payback period of 3-6 months. Payback period = Total Investment / Monthly Net Benefit. Example: $5,000 implementation + $350/month subscription = $5,350 total first-year cost. If you save $1,500/month in labor and reduced rework, payback = $5,350 / $1,500 = 3.6 months. After that, it's pure profit. Equipment purchases can have longer payback (1-2 years), but software should pay for itself within one budget cycle. If payback exceeds 12 months, reconsider the purchase.
                  </p>
                </CardContent>
              </Card>
            </div>
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
                    <Target className="w-8 h-8 text-construction-orange mb-3" />
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

              <Link to="/resources/reading-financial-statements-guide" className="group">
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <BarChart3 className="w-8 h-8 text-construction-orange mb-3" />
                    <h3 className="font-bold text-construction-dark mb-2 group-hover:text-construction-orange transition-colors">
                      Reading Financial Statements
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Learn how to read and interpret P&L, balance sheet, and cash flow statements for contractors.
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
                    <TrendingUp className="w-8 h-8 text-construction-orange mb-3" />
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

export default ConstructionROICalculatorGuide;
