import { CheckCircle, XCircle } from 'lucide-react';

/** The quick comparison table of all seven tools. */
export function ComparisonTable() {
  return (
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
                  <div className="font-bold text-construction-orange">Brikly</div>
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
  );
}
