import { CheckCircle, XCircle } from 'lucide-react';

/** Detailed reviews 4-7: Buildertrend, Foundation, Jobber, Knowify. */
export function OtherToolReviews() {
  return (
    <>
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
            Compare to Brikly: $350/month for unlimited users (no additional fees).
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
    </>
  );
}
