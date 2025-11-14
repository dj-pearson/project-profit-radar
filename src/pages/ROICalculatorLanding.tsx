/**
 * Enhanced ROI Calculator Landing Page
 * Phase 4 SEO Content - Tools & Authority
 *
 * Target Keywords:
 * - construction roi calculator
 * - contractor profitability calculator
 * - construction profit calculator
 * - free construction calculator
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Calculator,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  Clock,
  DollarSign,
  Target,
  Zap,
  ArrowRight
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function ROICalculatorLanding() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "BuildDesk Construction ROI Calculator",
    "description": "Free construction ROI calculator for contractors. Calculate true project profitability including overhead, validate bids in 2 minutes, and protect your profit margins.",
    "url": "https://builddesk.ai/roi-calculator",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "Real-time ROI calculations",
      "Overhead allocation",
      "Profit margin analysis",
      "Bid validation",
      "PDF report generation",
      "Project comparison"
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How do I calculate ROI on a construction project?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "To calculate construction project ROI: 1) Add all direct costs (labor, materials, equipment), 2) Add overhead allocation (typically 10-20% of direct costs), 3) Subtract total costs from project revenue, 4) Divide net profit by total costs, 5) Multiply by 100 for percentage. Example: $100K revenue - $75K total costs = $25K profit. ROI = ($25K / $75K) × 100 = 33% ROI."
        }
      },
      {
        "@type": "Question",
        "name": "What is a good ROI for a construction project?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A good ROI for construction projects varies by type: Residential remodeling: 15-30%, Commercial build-out: 10-20%, New construction: 8-15%, Large commercial: 5-12%. Anything below 5% ROI is too risky for most contractors. Projects with 20%+ ROI are excellent opportunities."
        }
      },
      {
        "@type": "Question",
        "name": "Why is my construction profit different from my ROI?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Profit is the dollar amount you make ($25K profit on a $100K job). ROI is profit as a percentage of your investment (33% ROI means you made $0.33 for every $1 you spent). ROI helps compare projects of different sizes - a $50K job with 30% ROI might be better than a $200K job with 10% ROI."
        }
      },
      {
        "@type": "Question",
        "name": "Should I include overhead in my ROI calculation?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, you MUST include overhead in ROI calculations to get accurate profitability. Overhead includes office rent, insurance, vehicles, office staff, marketing, and other costs not directly tied to one project. Without overhead, you'll show fake profit that doesn't exist. Typical overhead is 10-20% of project costs."
        }
      },
      {
        "@type": "Question",
        "name": "How often should I calculate ROI on my projects?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Calculate ROI at three stages: 1) Before bidding - validate if the project is worth pursuing, 2) Mid-project - track if actual costs match estimates, 3) After completion - compare projected vs actual ROI. Tools like BuildDesk calculate ROI in real-time, so you always know current profitability."
        }
      }
    ]
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Calculate Construction Project ROI",
    "description": "Step-by-step guide to calculating return on investment for construction projects",
    "step": [
      {
        "@type": "HowToStep",
        "name": "Calculate Total Direct Costs",
        "text": "Add up all direct project costs: labor (hours × loaded rate), materials (receipts + waste), equipment (rentals + owned equipment allocation), and subcontractors (invoices)."
      },
      {
        "@type": "HowToStep",
        "name": "Add Overhead Allocation",
        "text": "Calculate overhead as 10-20% of direct costs, or use your company's actual overhead rate. Overhead includes office expenses, insurance, vehicles, office staff, and other indirect costs."
      },
      {
        "@type": "HowToStep",
        "name": "Calculate Total Costs",
        "text": "Add direct costs + overhead allocation = total project costs. This is your true investment in the project."
      },
      {
        "@type": "HowToStep",
        "name": "Calculate Net Profit",
        "text": "Subtract total costs from project revenue: Net Profit = Revenue - Total Costs. This is your actual profit after all costs."
      },
      {
        "@type": "HowToStep",
        "name": "Calculate ROI Percentage",
        "text": "Divide net profit by total costs, then multiply by 100: ROI = (Net Profit / Total Costs) × 100. This shows how much you made per dollar invested."
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Free Construction ROI Calculator - Calculate True Project Profitability | BuildDesk</title>
        <meta
          name="description"
          content="Free construction ROI calculator for contractors. Calculate true project profitability in 2 minutes including overhead, validate bids, and protect profit margins. No signup required."
        />
        <meta name="keywords" content="construction roi calculator, contractor profitability calculator, construction profit calculator, free construction calculator, bid validation calculator, project roi tool" />

        {/* Open Graph */}
        <meta property="og:title" content="Free Construction ROI Calculator - BuildDesk" />
        <meta property="og:description" content="Calculate true project profitability in 2 minutes. Free tool for contractors to validate bids and protect margins." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://builddesk.ai/roi-calculator" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Free Construction ROI Calculator - BuildDesk" />
        <meta name="twitter:description" content="Calculate true project profitability in 2 minutes. Validate bids and protect your margins." />

        {/* Schema.org structured data */}
        <script type="application/ld+json">
          {JSON.stringify(articleSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(howToSchema)}
        </script>

        <link rel="canonical" href="https://builddesk.ai/roi-calculator" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <Navigation />

        <article className="pt-24 pb-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Hero Section */}
            <header className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-construction-orange/10 text-construction-orange px-4 py-2 rounded-full text-sm font-semibold mb-6">
                <Calculator className="w-4 h-4" />
                Free Tool - No Signup Required
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                Free Construction ROI Calculator
              </h1>

              <p className="text-xl text-slate-700 mb-8 max-w-3xl mx-auto leading-relaxed">
                Calculate true project profitability in 2 minutes. Validate bids, include overhead, and protect your profit margins with our free contractor ROI calculator.
              </p>

              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Includes Overhead</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Instant Results</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Free PDF Report</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>No Credit Card</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/profitability-calculator"
                  className="inline-flex items-center justify-center gap-2 bg-construction-orange text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-construction-orange/90 transition-colors shadow-lg"
                >
                  <Calculator className="w-5 h-5" />
                  Calculate ROI Now
                </a>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 bg-white text-construction-orange border-2 border-construction-orange px-8 py-4 rounded-lg font-bold text-lg hover:bg-construction-orange/5 transition-colors"
                >
                  How It Works
                </a>
              </div>
            </header>

            {/* Benefits Grid */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Why Calculate ROI Before Every Bid</h2>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <Target className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Validate Bids</h3>
                  <p className="text-sm text-slate-600">
                    Know if a project is worth bidding <em>before</em> you invest hours in detailed estimates.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Include Overhead</h3>
                  <p className="text-sm text-slate-600">
                    Automatically allocate overhead costs - don't fool yourself with fake "profit" numbers.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Avoid Bad Jobs</h3>
                  <p className="text-sm text-slate-600">
                    Identify low-margin projects that will waste your time and tie up your crew for pennies.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Compare Projects</h3>
                  <p className="text-sm text-slate-600">
                    Use ROI to compare different-sized projects and choose the most profitable opportunities.
                  </p>
                </div>
              </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="mb-16 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-6 text-center">How to Calculate Construction ROI in 5 Steps</h2>

              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="flex items-start gap-4 bg-white rounded-lg p-6 border border-blue-200">
                  <div className="flex-shrink-0 w-10 h-10 bg-construction-orange text-white rounded-full flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Calculate Total Direct Costs</h3>
                    <p className="text-sm text-slate-700">
                      Add up all direct project costs: <strong>labor</strong> (hours × loaded rate), <strong>materials</strong> (receipts + waste), <strong>equipment</strong> (rentals + owned equipment allocation), and <strong>subcontractors</strong> (invoices).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-white rounded-lg p-6 border border-blue-200">
                  <div className="flex-shrink-0 w-10 h-10 bg-construction-orange text-white rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Add Overhead Allocation</h3>
                    <p className="text-sm text-slate-700">
                      Calculate overhead as <strong>10-20% of direct costs</strong>, or use your company's actual overhead rate. Overhead includes office expenses, insurance, vehicles, office staff, and other indirect costs.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-white rounded-lg p-6 border border-blue-200">
                  <div className="flex-shrink-0 w-10 h-10 bg-construction-orange text-white rounded-full flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Calculate Total Costs</h3>
                    <p className="text-sm text-slate-700">
                      Add direct costs + overhead allocation = <strong>total project costs</strong>. This is your true investment in the project.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-white rounded-lg p-6 border border-blue-200">
                  <div className="flex-shrink-0 w-10 h-10 bg-construction-orange text-white rounded-full flex items-center justify-center font-bold">
                    4
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Calculate Net Profit</h3>
                    <p className="text-sm text-slate-700">
                      Subtract total costs from project revenue: <strong>Net Profit = Revenue - Total Costs</strong>. This is your actual profit after all costs (including overhead).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-white rounded-lg p-6 border border-blue-200">
                  <div className="flex-shrink-0 w-10 h-10 bg-construction-orange text-white rounded-full flex items-center justify-center font-bold">
                    5
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Calculate ROI Percentage</h3>
                    <p className="text-sm text-slate-700">
                      Divide net profit by total costs, then multiply by 100: <strong>ROI = (Net Profit / Total Costs) × 100</strong>. This shows how much you made per dollar invested.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-white border border-blue-300 rounded-lg p-6">
                <h3 className="font-bold text-slate-900 mb-3">Example Calculation:</h3>
                <div className="grid md:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Project Revenue:</span>
                      <span className="font-semibold">$100,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Direct Costs:</span>
                      <span className="font-semibold">$60,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Overhead (15%):</span>
                      <span className="font-semibold">$9,000</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <span className="text-slate-600">Total Costs:</span>
                      <span className="font-semibold">$69,000</span>
                    </div>
                  </div>
                  <div className="space-y-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Net Profit:</span>
                      <span className="font-semibold text-green-600">$31,000</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-600">ROI Calculation:</span>
                      <span className="font-semibold">$31K / $69K × 100</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <span className="text-slate-600">ROI:</span>
                      <span className="font-semibold text-green-600">44.9%</span>
                    </div>
                    <p className="text-xs text-slate-600 pt-2">
                      Excellent ROI - you made $0.45 for every $1 invested
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ROI Benchmarks */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-6 text-center">What's a Good ROI for Construction Projects?</h2>

              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full bg-white rounded-lg shadow-lg overflow-hidden">
                    <thead className="bg-construction-dark text-white">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold">Project Type</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold">Typical ROI Range</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="px-6 py-4 font-semibold">Residential Remodeling</td>
                        <td className="px-6 py-4">15-30%</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                            <TrendingUp className="w-3 h-3" />
                            High
                          </span>
                        </td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="px-6 py-4 font-semibold">Commercial Build-Out</td>
                        <td className="px-6 py-4">10-20%</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                            Good
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-semibold">New Residential Construction</td>
                        <td className="px-6 py-4">8-15%</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                            Good
                          </span>
                        </td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="px-6 py-4 font-semibold">Large Commercial</td>
                        <td className="px-6 py-4">5-12%</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-semibold">
                            Moderate
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-semibold">Below 5% ROI</td>
                        <td className="px-6 py-4">&lt; 5%</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-semibold">
                            <AlertTriangle className="w-3 h-3" />
                            Avoid
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-6">
                <p className="text-sm text-slate-700">
                  <strong>Rule of Thumb:</strong> Anything below 5% ROI is too risky for most contractors. You're tying up your crew, equipment, and cash for minimal return. Projects with 20%+ ROI are excellent opportunities - pursue these aggressively.
                </p>
              </div>
            </section>

            {/* CTA Section */}
            <section className="mb-16 bg-gradient-to-r from-construction-orange to-construction-yellow rounded-xl p-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-4">
                Calculate Your Project ROI Now
              </h2>
              <p className="text-xl text-white/90 mb-6 max-w-2xl mx-auto">
                Free calculator includes overhead allocation, instant results, and downloadable PDF report. No signup or credit card required.
              </p>
              <a
                href="/profitability-calculator"
                className="inline-flex items-center gap-2 bg-white text-construction-orange px-8 py-4 rounded-lg font-bold text-lg hover:bg-slate-50 transition-colors shadow-lg"
              >
                <Calculator className="w-5 h-5" />
                Start Calculating ROI <ArrowRight className="w-5 h-5" />
              </a>
            </section>

            {/* FAQ Section */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Frequently Asked Questions</h2>

              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    How do I calculate ROI on a construction project?
                  </h3>
                  <p className="text-slate-700">
                    To calculate construction project ROI: <strong>1)</strong> Add all direct costs (labor, materials, equipment), <strong>2)</strong> Add overhead allocation (typically 10-20% of direct costs), <strong>3)</strong> Subtract total costs from project revenue, <strong>4)</strong> Divide net profit by total costs, <strong>5)</strong> Multiply by 100 for percentage. Example: $100K revenue - $75K total costs = $25K profit. ROI = ($25K / $75K) × 100 = <strong>33% ROI</strong>.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    What is a good ROI for a construction project?
                  </h3>
                  <p className="text-slate-700 mb-3">
                    A good ROI for construction projects varies by type:
                  </p>
                  <ul className="space-y-1 text-slate-700 ml-6">
                    <li>• <strong>Residential remodeling:</strong> 15-30%</li>
                    <li>• <strong>Commercial build-out:</strong> 10-20%</li>
                    <li>• <strong>New construction:</strong> 8-15%</li>
                    <li>• <strong>Large commercial:</strong> 5-12%</li>
                  </ul>
                  <p className="text-slate-700 mt-3">
                    Anything below 5% ROI is too risky for most contractors. Projects with 20%+ ROI are excellent opportunities.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    Why is my construction profit different from my ROI?
                  </h3>
                  <p className="text-slate-700">
                    <strong>Profit</strong> is the dollar amount you make ($25K profit on a $100K job). <strong>ROI</strong> is profit as a percentage of your investment (33% ROI means you made $0.33 for every $1 you spent). ROI helps compare projects of different sizes - a $50K job with 30% ROI might be better than a $200K job with 10% ROI because it ties up less of your capital and crew time.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    Should I include overhead in my ROI calculation?
                  </h3>
                  <p className="text-slate-700">
                    <strong>Yes, you MUST include overhead</strong> in ROI calculations to get accurate profitability. Overhead includes office rent, insurance, vehicles, office staff, marketing, and other costs not directly tied to one project. Without overhead, you'll show fake "profit" that doesn't exist - you'll be profitable on paper but broke in reality. Typical overhead is 10-20% of project costs.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    How often should I calculate ROI on my projects?
                  </h3>
                  <p className="text-slate-700 mb-3">
                    Calculate ROI at three critical stages:
                  </p>
                  <ol className="space-y-2 text-slate-700 ml-6 list-decimal">
                    <li><strong>Before bidding</strong> - Validate if the project is worth pursuing (use our free calculator)</li>
                    <li><strong>Mid-project</strong> - Track if actual costs match estimates, catch overruns early</li>
                    <li><strong>After completion</strong> - Compare projected vs actual ROI to improve future estimates</li>
                  </ol>
                  <p className="text-slate-700 mt-3">
                    Tools like BuildDesk calculate ROI in real-time during the project, so you always know current profitability and can adjust before it's too late.
                  </p>
                </div>
              </div>
            </section>

            {/* Beyond the Calculator */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-6 text-center">Beyond the Calculator: Real-Time Job Costing</h2>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-8">
                <p className="text-lg text-slate-700 mb-6">
                  This free calculator helps you <strong>estimate ROI before bidding</strong>. But what if you could track ROI <em>in real-time during the project</em>?
                </p>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-white rounded-lg p-6 border border-blue-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-amber-600" />
                      </div>
                      <h3 className="font-bold text-slate-900">With This Calculator:</h3>
                    </div>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li>• Estimate ROI before bidding</li>
                      <li>• Manual updates if costs change</li>
                      <li>• Discover actual ROI after project ends</li>
                      <li>• Too late to fix overruns</li>
                    </ul>
                  </div>

                  <div className="bg-white rounded-lg p-6 border border-green-300">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Zap className="w-5 h-5 text-green-600" />
                      </div>
                      <h3 className="font-bold text-slate-900">With BuildDesk:</h3>
                    </div>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li>• Real-time ROI updates as costs are entered</li>
                      <li>• Automatic overhead allocation</li>
                      <li>• Budget alerts when thresholds exceeded</li>
                      <li>• Catch overruns while you can fix them</li>
                    </ul>
                  </div>
                </div>

                <div className="text-center">
                  <Link
                    to="/features/job-costing"
                    className="inline-flex items-center gap-2 bg-construction-orange text-white px-6 py-3 rounded-lg font-semibold hover:bg-construction-orange/90 transition-colors"
                  >
                    See Real-Time Job Costing <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </section>

            {/* Related Articles */}
            <section className="border-t border-slate-200 pt-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Related Resources</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <Link
                  to="/resources/construction-roi-calculator-guide"
                  className="group bg-white border border-slate-200 rounded-lg p-6 hover:border-construction-orange transition-colors"
                >
                  <h3 className="font-bold text-slate-900 mb-2 group-hover:text-construction-orange transition-colors">
                    Construction ROI Calculator Guide
                  </h3>
                  <p className="text-sm text-slate-600">
                    Complete guide to calculating ROI on construction software and tools.
                  </p>
                </Link>

                <Link
                  to="/resources/calculate-true-project-profitability"
                  className="group bg-white border border-slate-200 rounded-lg p-6 hover:border-construction-orange transition-colors"
                >
                  <h3 className="font-bold text-slate-900 mb-2 group-hover:text-construction-orange transition-colors">
                    Calculate True Project Profitability
                  </h3>
                  <p className="text-sm text-slate-600">
                    Learn how to calculate net profit including ALL hidden costs.
                  </p>
                </Link>

                <Link
                  to="/resources/financial-intelligence-guide"
                  className="group bg-white border border-slate-200 rounded-lg p-6 hover:border-construction-orange transition-colors"
                >
                  <h3 className="font-bold text-slate-900 mb-2 group-hover:text-construction-orange transition-colors">
                    Financial Intelligence for Contractors
                  </h3>
                  <p className="text-sm text-slate-600">
                    Master real-time job costing and financial management.
                  </p>
                </Link>
              </div>
            </section>

          </div>
        </article>

        <Footer />
      </div>
    </>
  );
}
