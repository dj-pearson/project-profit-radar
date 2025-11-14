/**
 * Job Costing Software Comparison Guide
 * Phase 4 SEO Content - Comparison & Competitive Content
 *
 * Target Keywords:
 * - construction job costing software comparison
 * - best job costing software for contractors
 * - real-time job costing tools
 * - construction cost tracking software
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Calculator,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowRight,
  DollarSign,
  FileText,
  Users,
  Smartphone,
  BarChart3
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function JobCostingSoftwareComparison() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "7 Best Construction Job Costing Software Tools Compared (2025)",
    "description": "Compare the top 7 job costing software tools for contractors. Real pricing, features, pros & cons to help you choose the right solution for your construction business.",
    "author": {
      "@type": "Organization",
      "name": "BuildDesk",
      "url": "https://builddesk.ai"
    },
    "publisher": {
      "@type": "Organization",
      "name": "BuildDesk",
      "logo": {
        "@type": "ImageObject",
        "url": "https://builddesk.ai/logo.png"
      }
    },
    "datePublished": "2025-01-14",
    "dateModified": "2025-01-14",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://builddesk.ai/resources/job-costing-software-comparison"
    },
    "keywords": "construction job costing software, job costing comparison, construction cost tracking, real-time job costing, contractor software",
    "articleSection": "Construction Technology",
    "wordCount": 3800
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is the best job costing software for small contractors?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "BuildDesk is the best value for small contractors, offering unlimited users and real-time job costing at $350/month. For contractors needing basic features on a tight budget, Buildertrend ($299/month) or CoConstruct ($399/month) are solid alternatives."
        }
      },
      {
        "@type": "Question",
        "name": "What's the difference between real-time and delayed job costing?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Real-time job costing updates costs as they're entered (instantly showing current project profitability). Delayed job costing requires manual syncing or waiting until the next accounting period close. Real-time systems help you catch budget overruns while there's still time to fix them."
        }
      },
      {
        "@type": "Question",
        "name": "Do I need job costing software if I use QuickBooks?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. QuickBooks tracks costs after the fact (historical accounting). Job costing software tracks costs in real-time as they happen, allowing you to make decisions while projects are active. Most modern job costing tools sync with QuickBooks automatically."
        }
      },
      {
        "@type": "Question",
        "name": "What should I look for in job costing software?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Key features include: 1) Real-time cost tracking, 2) Budget vs actual reporting, 3) Mobile time tracking, 4) QuickBooks integration, 5) Change order management, 6) Unlimited users (not per-seat pricing), 7) Easy-to-read dashboards showing current profitability."
        }
      },
      {
        "@type": "Question",
        "name": "How much does job costing software cost?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Pricing ranges from $299/month (Buildertrend, limited users) to $1,500+/month (Procore enterprise). Most small contractor solutions cost $300-500/month. Watch for per-user fees that add up quickly - BuildDesk offers unlimited users at $350/month flat rate."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>7 Best Job Costing Software for Contractors Compared (2025) | BuildDesk</title>
        <meta
          name="description"
          content="Compare the top 7 construction job costing software tools. Real pricing, features, pros & cons. Find the best real-time job costing solution for your contracting business."
        />
        <meta name="keywords" content="construction job costing software, job costing comparison, construction cost tracking, real-time job costing, contractor software, job costing tools" />

        {/* Open Graph */}
        <meta property="og:title" content="7 Best Job Costing Software for Contractors Compared (2025)" />
        <meta property="og:description" content="Compare the top 7 construction job costing software tools. Real pricing, features, pros & cons to help you choose the right solution." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://builddesk.ai/resources/job-costing-software-comparison" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="7 Best Job Costing Software for Contractors Compared (2025)" />
        <meta name="twitter:description" content="Compare the top 7 construction job costing software tools. Real pricing, features, and pros & cons." />

        {/* Schema.org structured data */}
        <script type="application/ld+json">
          {JSON.stringify(articleSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>

        <link rel="canonical" href="https://builddesk.ai/resources/job-costing-software-comparison" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <Navigation />

        <article className="pt-24 pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Breadcrumb */}
            <nav className="mb-8 text-sm text-slate-600">
              <Link to="/" className="hover:text-construction-orange">Home</Link>
              <span className="mx-2">/</span>
              <Link to="/resources" className="hover:text-construction-orange">Resources</Link>
              <span className="mx-2">/</span>
              <span className="text-slate-900">Job Costing Software Comparison</span>
            </nav>

            {/* Article Header */}
            <header className="mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                7 Best Construction Job Costing Software Tools Compared (2025)
              </h1>

              <div className="flex items-center gap-6 text-sm text-slate-600 mb-6">
                <time dateTime="2025-01-14">January 14, 2025</time>
                <span>•</span>
                <span>15 min read</span>
                <span>•</span>
                <span>Comparison Guide</span>
              </div>

              <p className="text-xl text-slate-700 leading-relaxed">
                Compare the top 7 job costing software tools for contractors. Real pricing, features, pros & cons to help you choose the right solution for your construction business.
              </p>
            </header>

            {/* Answer-First Content */}
            <div className="bg-gradient-to-r from-construction-orange/10 to-construction-yellow/10 border-l-4 border-construction-orange p-6 rounded-r-lg mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <Calculator className="w-6 h-6 text-construction-orange" />
                Quick Answer: Best Job Costing Software by Business Type
              </h2>
              <div className="space-y-3 text-slate-700">
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <span><strong>Best for Small Contractors (1-10 employees):</strong> BuildDesk ($350/month, unlimited users, real-time job costing)</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <span><strong>Best for Residential Builders:</strong> CoConstruct ($399/month, excellent client portal)</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <span><strong>Best for Mid-Sized Commercial ($5M-$50M):</strong> Procore ($1,500+/month, comprehensive features)</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <span><strong>Best Budget Option:</strong> Buildertrend ($299/month, solid basics but limited users)</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <span><strong>Best for Service Contractors (HVAC, Plumbing, Electrical):</strong> Jobber ($169/month, field service focus)</span>
                </p>
              </div>
            </div>

            {/* Comparison Table */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Quick Comparison Table</h2>

              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full bg-white rounded-lg shadow-lg overflow-hidden">
                    <thead className="bg-construction-dark text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Software</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Starting Price</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Real-Time Costing</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Users</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Mobile App</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Best For</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className="bg-construction-orange/5">
                        <td className="px-4 py-4">
                          <div className="font-bold text-construction-orange">BuildDesk</div>
                          <div className="text-xs text-slate-600 mt-1">Our Pick</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold">$350/month</div>
                          <div className="text-xs text-slate-600">Flat rate</div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <CheckCircle className="w-5 h-5 text-green-600 inline" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-green-600">Unlimited</div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <CheckCircle className="w-5 h-5 text-green-600 inline" />
                        </td>
                        <td className="px-4 py-4 text-sm">Small contractors needing real-time visibility</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-4 font-bold">Procore</td>
                        <td className="px-4 py-4">
                          <div className="font-semibold">$1,500+/month</div>
                          <div className="text-xs text-slate-600">Custom pricing</div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <CheckCircle className="w-5 h-5 text-green-600 inline" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-slate-600">Unlimited</div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <CheckCircle className="w-5 h-5 text-green-600 inline" />
                        </td>
                        <td className="px-4 py-4 text-sm">Enterprise contractors ($50M+)</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-4 font-bold">CoConstruct</td>
                        <td className="px-4 py-4">
                          <div className="font-semibold">$399/month</div>
                          <div className="text-xs text-slate-600">Essential plan</div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <XCircle className="w-5 h-5 text-slate-400 inline" />
                          <div className="text-xs text-slate-600">Delayed</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-slate-600">3-5 users</div>
                          <div className="text-xs text-slate-600">$39/add'l</div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <CheckCircle className="w-5 h-5 text-green-600 inline" />
                        </td>
                        <td className="px-4 py-4 text-sm">Residential custom builders</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-4 font-bold">Buildertrend</td>
                        <td className="px-4 py-4">
                          <div className="font-semibold">$299/month</div>
                          <div className="text-xs text-slate-600">Essential plan</div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <XCircle className="w-5 h-5 text-slate-400 inline" />
                          <div className="text-xs text-slate-600">Delayed</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-slate-600">2 users</div>
                          <div className="text-xs text-slate-600">$50/add'l</div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <CheckCircle className="w-5 h-5 text-green-600 inline" />
                        </td>
                        <td className="px-4 py-4 text-sm">Budget-conscious contractors</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-4 font-bold">Foundation</td>
                        <td className="px-4 py-4">
                          <div className="font-semibold">$399/month</div>
                          <div className="text-xs text-slate-600">Standard plan</div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <CheckCircle className="w-5 h-5 text-green-600 inline" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-slate-600">Unlimited</div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <CheckCircle className="w-5 h-5 text-green-600 inline" />
                        </td>
                        <td className="px-4 py-4 text-sm">Accounting-focused contractors</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-4 font-bold">Jobber</td>
                        <td className="px-4 py-4">
                          <div className="font-semibold">$169/month</div>
                          <div className="text-xs text-slate-600">Connect plan</div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <XCircle className="w-5 h-5 text-slate-400 inline" />
                          <div className="text-xs text-slate-600">Basic only</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-slate-600">Up to 30</div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <CheckCircle className="w-5 h-5 text-green-600 inline" />
                        </td>
                        <td className="px-4 py-4 text-sm">HVAC, plumbing, electrical</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-4 font-bold">Knowify</td>
                        <td className="px-4 py-4">
                          <div className="font-semibold">$249/month</div>
                          <div className="text-xs text-slate-600">Core plan</div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <CheckCircle className="w-5 h-5 text-green-600 inline" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-slate-600">5 users</div>
                          <div className="text-xs text-slate-600">$35/add'l</div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <CheckCircle className="w-5 h-5 text-green-600 inline" />
                        </td>
                        <td className="px-4 py-4 text-sm">Small specialty contractors</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Real-Time vs Delayed Job Costing Explanation */}
            <section className="mb-16 bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <Clock className="w-6 h-6 text-amber-600" />
                Real-Time vs Delayed Job Costing: Why It Matters
              </h2>
              <div className="space-y-4 text-slate-700">
                <p>
                  <strong>Real-time job costing</strong> updates your project costs instantly as time, materials, and expenses are entered. You can see current profitability at any moment.
                </p>
                <p>
                  <strong>Delayed job costing</strong> requires manual synchronization or waits until your accountant closes the books (weekly or monthly). By the time you see the numbers, it's often too late to fix budget overruns.
                </p>
                <div className="bg-white border border-amber-300 rounded p-4 mt-4">
                  <p className="font-semibold text-slate-900 mb-2">Example:</p>
                  <p className="text-sm">
                    <strong>Real-time:</strong> On Thursday afternoon, you notice labor costs are tracking 15% over budget for Week 2. You adjust crew assignments immediately for Week 3 to stay on target.
                  </p>
                  <p className="text-sm mt-2">
                    <strong>Delayed:</strong> Two weeks after the project ends, your accountant tells you labor was 15% over budget. Too late to fix anything.
                  </p>
                </div>
                <p className="text-sm font-semibold text-amber-900">
                  💡 Bottom line: Real-time costing lets you manage profitability <em>while the project is active</em>, not after it's done.
                </p>
              </div>
            </section>

            {/* Detailed Reviews */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-8">Detailed Software Reviews</h2>

              {/* BuildDesk */}
              <div className="mb-12 bg-gradient-to-r from-construction-orange/5 to-construction-yellow/5 border-l-4 border-construction-orange p-6 rounded-r-lg">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">1. BuildDesk</h3>
                    <p className="text-construction-orange font-semibold">Best for Small Contractors</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900">$350/month</div>
                    <div className="text-sm text-slate-600">Unlimited users</div>
                  </div>
                </div>

                <p className="text-slate-700 mb-4">
                  BuildDesk is purpose-built for small to mid-sized contractors who need real-time job costing without enterprise complexity or per-user fees. Unlimited users at a flat rate makes it the best value for growing teams.
                </p>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Pros
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Real-time job costing:</strong> See current profitability instantly</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Unlimited users:</strong> No per-seat fees ($350 flat rate)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>QuickBooks sync:</strong> Auto-syncs with QuickBooks Online</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Mobile app:</strong> iOS/Android time tracking and photo documentation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Budget alerts:</strong> Automatic alerts when costs exceed thresholds</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Easy setup:</strong> Most contractors are fully operational within 2-3 days</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      Cons
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">✗</span>
                        <span><strong>No native estimating:</strong> Best paired with dedicated estimating software</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">✗</span>
                        <span><strong>Limited integrations:</strong> Fewer third-party integrations than enterprise tools</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">✗</span>
                        <span><strong>Newer platform:</strong> Less market presence than 20-year-old competitors</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white border border-construction-orange/30 rounded-lg p-4">
                  <h4 className="font-bold text-slate-900 mb-2">Best For:</h4>
                  <p className="text-sm text-slate-700">
                    Small to mid-sized contractors ($500K-$10M revenue) who need real-time visibility into job profitability without paying $50-99/month per user. Perfect for growing teams that need unlimited access to financial data.
                  </p>
                </div>

                <div className="mt-6">
                  <Link
                    to="/pricing"
                    className="inline-flex items-center gap-2 bg-construction-orange text-white px-6 py-3 rounded-lg font-semibold hover:bg-construction-orange/90 transition-colors"
                  >
                    Try BuildDesk Free <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Procore */}
              <div className="mb-12 bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">2. Procore</h3>
                    <p className="text-slate-600 font-semibold">Best for Enterprise Contractors</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900">$1,500+/month</div>
                    <div className="text-sm text-slate-600">Custom pricing</div>
                  </div>
                </div>

                <p className="text-slate-700 mb-4">
                  Procore is the industry leader for large commercial contractors and enterprise construction firms. Comprehensive features, unlimited users, but comes with enterprise-level pricing and complexity.
                </p>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Pros
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Most comprehensive:</strong> Every feature imaginable</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Real-time costing:</strong> Enterprise-grade job cost tracking</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Unlimited users:</strong> No per-seat pricing</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Extensive integrations:</strong> Connects to everything</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Industry standard:</strong> Most recognized brand</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      Cons
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">✗</span>
                        <span><strong>Expensive:</strong> $1,500-$5,000/month minimum</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">✗</span>
                        <span><strong>Complex setup:</strong> 4-6 weeks onboarding typical</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">✗</span>
                        <span><strong>Overkill for small contractors:</strong> Too many features most won't use</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">✗</span>
                        <span><strong>Requires training:</strong> Steep learning curve</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h4 className="font-bold text-slate-900 mb-2">Best For:</h4>
                  <p className="text-sm text-slate-700">
                    Large commercial contractors ($50M+ revenue) managing multiple complex projects simultaneously. Worth the investment if you need enterprise features and have dedicated IT/admin staff.
                  </p>
                </div>
              </div>

              {/* CoConstruct */}
              <div className="mb-12 bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">3. CoConstruct</h3>
                    <p className="text-slate-600 font-semibold">Best for Residential Builders</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900">$399/month</div>
                    <div className="text-sm text-slate-600">Essential (3-5 users)</div>
                  </div>
                </div>

                <p className="text-slate-700 mb-4">
                  CoConstruct specializes in custom residential construction with excellent client portal features and selection management. Delayed job costing is the main limitation for contractors wanting real-time visibility.
                </p>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Pros
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Excellent client portal:</strong> Best-in-class homeowner experience</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Selection management:</strong> Perfect for custom home builds</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Estimating included:</strong> Built-in takeoff and estimating</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>QuickBooks sync:</strong> Two-way integration</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      Cons
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">✗</span>
                        <span><strong>No real-time costing:</strong> Delayed job cost updates</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">✗</span>
                        <span><strong>Per-user pricing:</strong> $39/month per additional user</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">✗</span>
                        <span><strong>Limited to residential:</strong> Not ideal for commercial work</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h4 className="font-bold text-slate-900 mb-2">Best For:</h4>
                  <p className="text-sm text-slate-700">
                    Custom residential builders who prioritize client communication and selection management over real-time financial tracking. Excellent for builders doing 5-20 custom homes per year.
                  </p>
                </div>
              </div>

              {/* Buildertrend */}
              <div className="mb-12 bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">4. Buildertrend</h3>
                    <p className="text-slate-600 font-semibold">Best Budget Option</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900">$299/month</div>
                    <div className="text-sm text-slate-600">Essential (2 users)</div>
                  </div>
                </div>

                <p className="text-slate-700 mb-4">
                  Buildertrend offers solid basic features at the lowest entry price. However, the 2-user limit on the Essential plan means most contractors end up paying significantly more once they add team members at $50/month each.
                </p>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Pros
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Lowest starting price:</strong> $299/month entry point</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Solid basics:</strong> Covers essential job costing features</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Good mobile app:</strong> Easy field time tracking</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Established platform:</strong> 20+ years in business</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      Cons
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">✗</span>
                        <span><strong>No real-time costing:</strong> Delayed job cost updates</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">✗</span>
                        <span><strong>Only 2 users:</strong> $50/month per additional user adds up quickly</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">✗</span>
                        <span><strong>True cost with team:</strong> $299 + (5 users × $50) = $549/month</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">✗</span>
                        <span><strong>Interface feels dated:</strong> Not as modern as newer competitors</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-bold text-slate-900 mb-2">Pricing Reality Check:</h4>
                  <p className="text-sm text-slate-700 mb-2">
                    While Buildertrend advertises $299/month, most contractors need more than 2 users:
                  </p>
                  <ul className="text-sm text-slate-700 space-y-1 ml-4">
                    <li>• <strong>5 users:</strong> $299 + (3 × $50) = $449/month</li>
                    <li>• <strong>10 users:</strong> $299 + (8 × $50) = $699/month</li>
                    <li>• <strong>15 users:</strong> $299 + (13 × $50) = $949/month</li>
                  </ul>
                  <p className="text-sm font-semibold text-amber-900 mt-2">
                    Compare to BuildDesk: $350/month for unlimited users (no additional fees).
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
                  <h4 className="font-bold text-slate-900 mb-2">Best For:</h4>
                  <p className="text-sm text-slate-700">
                    Very small contractors (1-2 person operations) who truly won't need additional users and can accept delayed job costing. Not ideal for growing teams.
                  </p>
                </div>
              </div>

              {/* Foundation */}
              <div className="mb-12 bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">5. Foundation</h3>
                    <p className="text-slate-600 font-semibold">Best for Accounting-Focused Contractors</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900">$399/month</div>
                    <div className="text-sm text-slate-600">Standard plan</div>
                  </div>
                </div>

                <p className="text-slate-700 mb-4">
                  Foundation (formerly Sage 100 Contractor) is an accounting-first platform with strong job costing built in. Best for contractors who want construction-specific accounting without needing QuickBooks.
                </p>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Pros
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Construction accounting built-in:</strong> Don't need QuickBooks</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Real-time costing:</strong> Live job cost tracking</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Unlimited users:</strong> No per-seat fees</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Advanced reporting:</strong> Deep financial analytics</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      Cons
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">✗</span>
                        <span><strong>Accounting-heavy interface:</strong> Less intuitive for field teams</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">✗</span>
                        <span><strong>Steeper learning curve:</strong> Requires accounting knowledge</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">✗</span>
                        <span><strong>Limited mobile features:</strong> Not as field-friendly</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h4 className="font-bold text-slate-900 mb-2">Best For:</h4>
                  <p className="text-sm text-slate-700">
                    Contractors who want an all-in-one accounting + job costing system and don't mind a more complex interface. Good if you want to eliminate QuickBooks entirely.
                  </p>
                </div>
              </div>

              {/* Jobber */}
              <div className="mb-12 bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">6. Jobber</h3>
                    <p className="text-slate-600 font-semibold">Best for Service Contractors</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900">$169/month</div>
                    <div className="text-sm text-slate-600">Connect (up to 30 users)</div>
                  </div>
                </div>

                <p className="text-slate-700 mb-4">
                  Jobber is designed for field service contractors (HVAC, plumbing, electrical, landscaping) doing mostly service work rather than long-term construction projects. Basic job costing but excellent for service ticket management.
                </p>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Pros
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Lowest price:</strong> $169/month for up to 30 users</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Service-focused:</strong> Perfect for HVAC, plumbing, electrical</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Scheduling & dispatch:</strong> Excellent routing and dispatch tools</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Customer management:</strong> Strong CRM for service businesses</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      Cons
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">✗</span>
                        <span><strong>Basic job costing only:</strong> Not designed for complex projects</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">✗</span>
                        <span><strong>No real-time costing:</strong> Basic profit tracking only</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">✗</span>
                        <span><strong>Limited for project work:</strong> Not ideal for multi-month projects</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h4 className="font-bold text-slate-900 mb-2">Best For:</h4>
                  <p className="text-sm text-slate-700">
                    Service contractors (HVAC, plumbing, electrical, landscaping) doing mostly 1-day service calls and small installations. Not recommended for project-based general contractors.
                  </p>
                </div>
              </div>

              {/* Knowify */}
              <div className="mb-12 bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">7. Knowify</h3>
                    <p className="text-slate-600 font-semibold">Best for Small Specialty Contractors</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900">$249/month</div>
                    <div className="text-sm text-slate-600">Core (5 users)</div>
                  </div>
                </div>

                <p className="text-slate-700 mb-4">
                  Knowify focuses on small specialty contractors (under $5M revenue) with an emphasis on easy-to-use job costing and time tracking. Good middle ground between simplicity and features.
                </p>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Pros
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Real-time costing:</strong> Live job cost updates</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Easy to use:</strong> Clean, simple interface</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Good mobile app:</strong> Field-friendly time tracking</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span><strong>Reasonable pricing:</strong> $249/month for 5 users</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      Cons
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">✗</span>
                        <span><strong>Per-user pricing:</strong> $35/month for each additional user</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">✗</span>
                        <span><strong>Limited features:</strong> Fewer capabilities than comprehensive tools</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">✗</span>
                        <span><strong>Smaller company:</strong> Less established than competitors</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h4 className="font-bold text-slate-900 mb-2">Best For:</h4>
                  <p className="text-sm text-slate-700">
                    Small specialty contractors (electrical, HVAC, plumbing) with 5-10 employees who want real-time job costing without enterprise complexity. Good for teams that won't exceed 10 users.
                  </p>
                </div>
              </div>
            </section>

            {/* How to Choose */}
            <section className="mb-16 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-6">How to Choose the Right Job Costing Software</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    1. Calculate True Cost (Including Users)
                  </h3>
                  <p className="text-slate-700 mb-3">
                    Don't just look at the advertised price. Calculate what you'll actually pay with your team size:
                  </p>
                  <div className="bg-white border border-blue-200 rounded p-4 font-mono text-sm">
                    <div>Base Price + (Additional Users × Per-User Fee) = True Monthly Cost</div>
                    <div className="mt-2 text-slate-600">Example: Buildertrend with 8 users</div>
                    <div className="text-slate-600">$299 + (6 users × $50) = $599/month</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    2. Prioritize Real-Time Costing
                  </h3>
                  <p className="text-slate-700">
                    If you want to manage profitability <em>while projects are active</em> (not after they're done), prioritize tools with real-time job costing. Tools with delayed costing only help you write better estimates for the next job.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    3. Consider Your Team Size Growth
                  </h3>
                  <p className="text-slate-700">
                    If you're growing, per-user pricing adds up quickly. A tool with unlimited users at a flat rate (like BuildDesk or Procore) may cost less long-term than "cheaper" options with per-seat fees.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-blue-600" />
                    4. Test Mobile Functionality
                  </h3>
                  <p className="text-slate-700">
                    Your field team won't use clunky mobile apps. Test time tracking, photo uploads, and cost entry on actual phones/tablets before committing. Most tools offer free trials.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    5. Verify QuickBooks Integration
                  </h3>
                  <p className="text-slate-700">
                    If you use QuickBooks (most contractors do), make sure the job costing tool syncs automatically. Manual data entry between systems defeats the purpose of job costing software.
                  </p>
                </div>
              </div>
            </section>

            {/* FAQ Section */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-8">Frequently Asked Questions</h2>

              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    What is the best job costing software for small contractors?
                  </h3>
                  <p className="text-slate-700">
                    <strong>BuildDesk</strong> is the best value for small contractors, offering unlimited users and real-time job costing at $350/month flat rate. For contractors needing basic features on a tight budget, <strong>Buildertrend</strong> ($299/month) or <strong>CoConstruct</strong> ($399/month) are solid alternatives, though both have per-user fees that add up as you grow.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    What's the difference between real-time and delayed job costing?
                  </h3>
                  <p className="text-slate-700 mb-3">
                    <strong>Real-time job costing</strong> updates costs instantly as they're entered, showing current project profitability at any moment. <strong>Delayed job costing</strong> requires manual syncing or waiting until your accountant closes the books (weekly or monthly).
                  </p>
                  <p className="text-slate-700">
                    Real-time systems let you catch budget overruns while there's still time to fix them. Delayed systems only help you write better estimates for the next project.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    Do I need job costing software if I use QuickBooks?
                  </h3>
                  <p className="text-slate-700 mb-3">
                    <strong>Yes.</strong> QuickBooks tracks costs <em>after the fact</em> (historical accounting). Job costing software tracks costs <em>in real-time as they happen</em>, allowing you to make decisions while projects are active.
                  </p>
                  <p className="text-slate-700">
                    Think of it this way: QuickBooks tells you what happened last month. Job costing software tells you what's happening <em>right now</em>. Most modern job costing tools sync with QuickBooks automatically, so you get both benefits without double entry.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    What should I look for in job costing software?
                  </h3>
                  <p className="text-slate-700 mb-3">Key features to prioritize:</p>
                  <ol className="list-decimal ml-6 space-y-2 text-slate-700">
                    <li><strong>Real-time cost tracking</strong> (not delayed/manual updates)</li>
                    <li><strong>Budget vs actual reporting</strong> with variance alerts</li>
                    <li><strong>Mobile time tracking</strong> that your field team will actually use</li>
                    <li><strong>QuickBooks integration</strong> (if you use QuickBooks)</li>
                    <li><strong>Change order management</strong> with cost impact tracking</li>
                    <li><strong>Unlimited users</strong> or reasonable per-user pricing</li>
                    <li><strong>Easy-to-read dashboards</strong> showing current profitability</li>
                  </ol>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    How much does job costing software cost?
                  </h3>
                  <p className="text-slate-700 mb-3">
                    Pricing ranges from $169/month (Jobber for service contractors) to $1,500+/month (Procore enterprise). Most small contractor solutions cost $300-500/month.
                  </p>
                  <p className="text-slate-700">
                    <strong>Watch for per-user fees</strong> that aren't obvious in advertised pricing. A "$299/month" tool can easily become $599/month once you add 6 team members at $50/each. BuildDesk offers unlimited users at $350/month flat rate with no surprise fees.
                  </p>
                </div>
              </div>
            </section>

            {/* CTA Section */}
            <section className="bg-gradient-to-r from-construction-orange to-construction-yellow rounded-xl p-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-4">
                See Real-Time Job Costing in Action
              </h2>
              <p className="text-xl text-white/90 mb-6 max-w-2xl mx-auto">
                Try BuildDesk free for 14 days. No credit card required. See exactly how much profit you're making on every project—in real-time.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-2 bg-white text-construction-orange px-8 py-4 rounded-lg font-bold text-lg hover:bg-slate-50 transition-colors shadow-lg"
                >
                  Start Free Trial <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/features/job-costing"
                  className="inline-flex items-center gap-2 bg-construction-dark text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-construction-dark/90 transition-colors"
                >
                  Learn About Job Costing
                </Link>
              </div>
            </section>

            {/* Related Articles */}
            <section className="mt-16 border-t border-slate-200 pt-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Related Articles</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <Link
                  to="/resources/financial-intelligence-guide"
                  className="group bg-white border border-slate-200 rounded-lg p-6 hover:border-construction-orange transition-colors"
                >
                  <h3 className="font-bold text-slate-900 mb-2 group-hover:text-construction-orange transition-colors">
                    Financial Intelligence Guide for Contractors
                  </h3>
                  <p className="text-sm text-slate-600">
                    Master construction financial management with real-time job costing.
                  </p>
                </Link>

                <Link
                  to="/resources/quickbooks-vs-construction-software"
                  className="group bg-white border border-slate-200 rounded-lg p-6 hover:border-construction-orange transition-colors"
                >
                  <h3 className="font-bold text-slate-900 mb-2 group-hover:text-construction-orange transition-colors">
                    QuickBooks vs Construction Software
                  </h3>
                  <p className="text-sm text-slate-600">
                    Understand why contractors need both systems working together.
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
              </div>
            </section>

          </div>
        </article>

        <Footer />
      </div>
    </>
  );
}
