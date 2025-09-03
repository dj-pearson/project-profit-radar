import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { CheckCircle, DollarSign, Users, Clock, ArrowRight, X, Check, Smartphone } from "lucide-react";

const BuildertrendAlternative = () => {
  const comparison = [
    {
      feature: "Mobile App Quality",
      builddesk: "Native performance",
      buildertrend: "Web-based mobile",
      advantage: "builddesk"
    },
    {
      feature: "Customer Support",
      builddesk: "Phone & chat support",
      buildertrend: "Email support only",
      advantage: "builddesk"
    },
    {
      feature: "Setup Complexity",
      builddesk: "Simple 3-step setup",
      buildertrend: "Complex configuration",
      advantage: "builddesk"
    },
    {
      feature: "Pricing Transparency",
      builddesk: "Clear, simple pricing",
      buildertrend: "Complex pricing tiers",
      advantage: "builddesk"
    },
    {
      feature: "QuickBooks Integration",
      builddesk: "Real-time sync",
      buildertrend: "Basic integration",
      advantage: "builddesk"
    }
  ];

  return (
    <>
      <SEOMetaTags
        title="Buildertrend Alternative - Modern Construction Software | BuildDesk"
        description="Better Buildertrend alternative with superior mobile apps, simpler pricing, and better support. Built for modern construction contractors who demand more."
        keywords={['Buildertrend alternative', 'construction software alternative', 'residential construction software', 'home builder software', 'construction management alternative', 'contractor software comparison']}
        canonicalUrl="/buildertrend-alternative"
      />
      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        <main className="py-12">
          <div className="container mx-auto px-4">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-6">
                A Modern Alternative to Buildertrend
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                Experience construction management software that actually works the way you do. 
                Better mobile experience, clearer pricing, and support that cares about your success.
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
                BuildDesk vs. Buildertrend Comparison
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Feature</th>
                      <th className="text-center py-3 px-4 text-construction-blue font-bold">BuildDesk</th>
                      <th className="text-center py-3 px-4">Buildertrend</th>
                      <th className="text-center py-3 px-4">Winner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((row, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-4 px-4 font-medium">{row.feature}</td>
                        <td className="py-4 px-4 text-center text-construction-blue font-semibold">
                          {row.builddesk}
                        </td>
                        <td className="py-4 px-4 text-center text-gray-600">
                          {row.buildertrend}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {row.advantage === "builddesk" ? (
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
                Why Contractors Switch to BuildDesk
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-green-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Superior Mobile Experience</h3>
                  <p className="text-sm text-muted-foreground">
                    Native mobile apps that work offline and sync seamlessly, not just a mobile website.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Transparent Pricing</h3>
                  <p className="text-sm text-muted-foreground">
                    No hidden fees, no per-project charges. Simple, predictable pricing that scales with your business.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Real Human Support</h3>
                  <p className="text-sm text-muted-foreground">
                    Talk to construction experts who understand your business, not generic tech support.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-construction-blue text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Ready to Upgrade from Buildertrend?
              </h2>
              <p className="text-lg mb-6 opacity-90">
                Make the switch to better construction management software. Your team will thank you.
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

export default BuildertrendAlternative;
