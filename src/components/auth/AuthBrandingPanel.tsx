import { Link } from "react-router-dom";
import { Shield, BarChart3, Users, HardHat, Building2 } from "lucide-react";

const AuthBrandingPanel = () => {
  return (
    <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-orange-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
        <div className="absolute top-2/3 left-1/3 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
        <div>
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">
              Build<span className="text-blue-400">Desk</span>
            </span>
          </Link>
        </div>

        <div className="space-y-8 max-w-lg">
          <div className="space-y-4">
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
              Build smarter.{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Profit more.
              </span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed">
              The construction management platform that gives you real-time financial control without enterprise complexity.
            </p>
          </div>

          <div className="grid gap-4">
            {[
              { icon: BarChart3, title: 'Real-Time Job Costing', desc: 'Know your margins on every project, every day' },
              { icon: Users, title: 'Team Collaboration', desc: 'Field to office, everyone stays in sync' },
              { icon: HardHat, title: 'Built for Construction', desc: 'Purpose-built tools for how you actually work' },
            ].map((feature) => (
              <div key={feature.title} className="flex items-start gap-4 group">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-blue-500/30 transition-colors">
                  <feature.icon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm text-slate-500">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="flex -space-x-2">
              {[
                'bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-purple-500', 'bg-pink-500'
              ].map((color, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full ${color} border-2 border-slate-900 flex items-center justify-center`}
                >
                  <span className="text-[10px] font-bold text-white">
                    {['JM', 'SK', 'AR', 'TW', 'LP'][i]}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-400">
              Built for construction companies
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              SOC2 Ready
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span>256-bit encryption</span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span>99.9% uptime</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthBrandingPanel;
