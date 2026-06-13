import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { DollarSign, Users, Clock, ArrowRight, X, Check } from "lucide-react";
import { PageSEO, createOrganizationSchema, createBreadcrumbSchema, createComparisonSchema } from "@/components/seo/PageSEO";
import { GEOOptimizedFAQ, procoreAlternativeFAQs } from "@/components/seo/GEOOptimizedFAQ";

const ProcoreAlternative = () => {
  const comparison = [
    {
      feature: "Setup Time",
      brikly: "2-3 days",
      procore: "2-3 months",
      advantage: "brikly"
    },
    {
      feature: "Monthly Cost (10 users)",
      brikly: "$299",
      procore: "$375+",
      advantage: "brikly"
    },
    {
      feature: "Learning Curve",
      brikly: "Intuitive interface",
      procore: "Complex, requires training",
      advantage: "brikly"
    },
    {
      feature: "Small Business Focus",
      brikly: "Built for SMBs",
      procore: "Enterprise-focused",
      advantage: "brikly"
    },
    {
      feature: "Customer Support",
      brikly: "Personal support",
      procore: "Ticket-based system",
      advantage: "brikly"
    }
  ];

  return (
    <>
      <PageSEO
        title="Best Procore Alternative for Small Contractors 2026"
        description="Brikly is the #1 Procore alternative for small contractors. 50% less cost ($350 vs $500+/month), unlimited users, 1-2 day setup. Same features without enterprise complexity."
        keywords={['Procore alternative', 'Procore competitor', 'Procore vs Brikly', 'cheaper than Procore', 'Procore for small contractors', 'construction management software alternative', 'small business construction software']}
        canonicalUrl="https://brikly.net/procore-alternative"
        lastModified="2026-02-08"
        schema={[
          createOrganizationSchema(),
          createComparisonSchema('Brikly vs Procore Comparison', [
            { name: 'Brikly', description: 'Construction management software for small contractors with real-time job costing, unlimited users at $350/month', price: '350', url: 'https://brikly.net' },
            { name: 'Procore', description: 'Enterprise construction management platform with per-seat pricing starting at $500+/month', price: '500', url: 'https://www.procore.com' },
          ]),
          createBreadcrumbSchema([
            { name: 'Home', url: 'https://brikly.net' },
            { name: 'Procore Alternative', url: 'https://brikly.net/procore-alternative' },
          ]),
        ]}
      />
      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        <main className="py-12">
          <div className="container mx-auto px-4">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-6">
                Better Than Procore for Small Business
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                Get enterprise-level construction management without the enterprise complexity and cost. 
                Brikly delivers the power you need with the simplicity you want.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth">
                  <Button size="lg" className="bg-construction-blue hover:bg-construction-blue/90">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/roi-calculator">
                  <Button size="lg" variant="outline">
                    Compare Costs
                  </Button>
                </Link>
              </div>
            </div>

            {/* Comparison Table */}
            <div className="bg-white rounded-lg border p-8 mb-16">
              <h2 className="text-3xl font-bold text-construction-dark mb-8 text-center">
                Brikly vs. Procore Comparison
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Feature</th>
                      <th className="text-center py-3 px-4 text-construction-blue font-bold">Brikly</th>
                      <th className="text-center py-3 px-4">Procore</th>
                      <th className="text-center py-3 px-4">Winner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((row, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-4 px-4 font-medium">{row.feature}</td>
                        <td className="py-4 px-4 text-center text-construction-blue font-semibold">
                          {row.brikly}
                        </td>
                        <td className="py-4 px-4 text-center text-gray-600">
                          {row.procore}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {row.advantage === "brikly" ? (
                            <Check className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-gray-400 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Benefits Section */}
            <div className="bg-white rounded-lg border p-8 mb-16">
              <h2 className="text-3xl font-bold text-construction-dark mb-8 text-center">
                Why Switch from Procore to Brikly
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-green-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Save 20% on Software Costs</h3>
                  <p className="text-sm text-muted-foreground">
                    Get the same functionality at a fraction of the cost, with transparent pricing and no hidden fees.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Faster Implementation</h3>
                  <p className="text-sm text-muted-foreground">
                    Get up and running in days, not months, with intuitive setup and personal onboarding support.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Personal Support</h3>
                  <p className="text-sm text-muted-foreground">
                    Talk to real people who understand construction, not a ticket system or chatbot.
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ Section - GEO optimized for AI citation */}
            <div className="mb-16">
              <GEOOptimizedFAQ
                faqs={procoreAlternativeFAQs}
                title="Procore vs Brikly: Frequently Asked Questions"
                description="Common questions contractors ask when comparing Brikly to Procore."
              />
            </div>

            {/* CTA Section */}
            <div className="bg-construction-blue text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Make the Switch to Brikly
              </h2>
              <p className="text-lg mb-6 opacity-90">
                Join contractors who switched from Procore and never looked back. Better value, easier to use, faster results.
              </p>
              <Link to="/auth">
                <Button size="lg" variant="secondary">
                  Start Your Free Trial Today
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ProcoreAlternative;
