import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Zap,
  Database,
  Globe,
  Smartphone,
  Shield,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";

const TechnicalSuperioritySection = () => {
  const architectureComparison = [
    {
      feature: "Data Updates",
      builddesk: "Real-time (<2 seconds)",
      legacy: "Batch processing (hourly/daily)",
      icon: Zap,
      advantage: "2-3 year head start"
    },
    {
      feature: "Database Architecture",
      builddesk: "PostgreSQL with real-time subscriptions",
      legacy: "Monolithic SQL with scheduled syncs",
      icon: Database,
      advantage: "Modern stack advantage"
    },
    {
      feature: "Deployment",
      builddesk: "Edge computing (Cloudflare)",
      legacy: "Traditional data centers",
      icon: Globe,
      advantage: "Global performance"
    },
    {
      feature: "Mobile Experience",
      builddesk: "Progressive Web App + Native",
      legacy: "Responsive web only",
      icon: Smartphone,
      advantage: "Offline-first architecture"
    }
  ];

  const technicalDifferentiators = [
    {
      icon: Zap,
      title: "Real-Time Infrastructure",
      metric: "<2 sec",
      description: "Built on Supabase real-time database with WebSocket subscriptions",
      impact: "Field cost → Dashboard visibility in under 2 seconds vs. hourly/daily batch updates"
    },
    {
      icon: Database,
      title: "Modern Data Architecture",
      metric: "332+",
      description: "Migrations worth of construction-specific schema optimizations",
      impact: "Purpose-built data models that legacy platforms can't retrofit without complete rebuilds"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      metric: "Row-level",
      description: "Database-level security with role-based access control",
      impact: "Multi-tenant isolation that scales from 1 to 10,000+ companies"
    },
    {
      icon: TrendingUp,
      title: "API-First Design",
      metric: "REST + GraphQL",
      description: "Modern API architecture enables rapid integration development",
      impact: "Build integrations in days that take competitors months"
    }
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-block px-4 py-2 bg-construction-blue/10 rounded-full mb-4">
            <span className="text-sm font-semibold text-construction-blue">Technical Superiority</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-construction-dark mb-6">
            Modern Architecture vs. Legacy Systems
          </h2>
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            While competitors patch 10-year-old systems, BuildDesk is built on 2025 infrastructure
          </p>
        </div>

        {/* Architecture Comparison Table */}
        <div className="mb-16 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-construction-dark text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Capability</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-construction-orange" />
                      BuildDesk (Modern)
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-muted" />
                      Legacy Platforms
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Advantage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {architectureComparison.map((item, index) => (
                  <tr key={index} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5 text-construction-blue" />
                        <span className="font-semibold text-construction-dark">{item.feature}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-construction-orange shrink-0" />
                        <span className="text-sm font-medium text-construction-dark">{item.builddesk}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-muted-foreground">{item.legacy}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-block px-3 py-1 bg-construction-orange/10 rounded-full">
                        <span className="text-xs font-semibold text-construction-orange">{item.advantage}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Technical Differentiators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {technicalDifferentiators.map((item, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-card to-muted/30">
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-construction-blue/10 flex items-center justify-center">
                    <item.icon className="h-6 w-6 text-construction-blue" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-construction-orange">{item.metric}</div>
                  </div>
                </div>
                <CardTitle className="text-xl text-construction-dark mb-2">{item.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-2 p-3 bg-construction-orange/5 rounded-lg border-l-4 border-construction-orange">
                  <TrendingUp className="h-4 w-4 text-construction-orange shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-construction-dark">{item.impact}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 bg-gradient-to-r from-construction-blue to-construction-dark rounded-2xl p-8 text-center text-white">
          <Clock className="h-12 w-12 text-construction-orange mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-4">
            The Window Is Closing
          </h3>
          <p className="text-lg text-white/90 max-w-2xl mx-auto mb-6">
            Every month competitors get closer to catching up. Lock in your technical advantage now with BuildDesk's modern architecture.
          </p>
          <div className="inline-block px-6 py-3 bg-construction-orange/20 rounded-lg">
            <span className="text-sm font-semibold text-construction-orange">2-3 year competitive head start • Defensible through execution</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechnicalSuperioritySection;
