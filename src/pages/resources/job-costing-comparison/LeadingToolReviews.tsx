import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';

/** Detailed reviews 1-3: Brikly, Procore, CoConstruct. */
export function LeadingToolReviews() {
  return (
    <>
      {/* Brikly */}
      <div className="mb-12 bg-construction-orange/5 border border-construction-orange/30 p-6 rounded-lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">1. Brikly</h3>
            <p className="text-construction-orange font-semibold">Best for Small Contractors</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-900">$350/month</div>
            <div className="text-sm text-slate-600">Unlimited users</div>
          </div>
        </div>

        <p className="text-slate-700 mb-4">
          Brikly is purpose-built for small to mid-sized contractors who need real-time job costing without enterprise complexity or per-user fees. Unlimited users at a flat rate makes it the best value for growing teams.
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
            Try Brikly Free <ArrowRight className="w-4 h-4" />
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
    </>
  );
}
