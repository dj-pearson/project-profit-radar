import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { CheckCircle, DollarSign, Users, Clock, ArrowRight, X, Check } from "lucide-react";

const ProcoreAlternative = () => {
  const comparison = [
    {
      feature: "Setup Time",
      builddesk: "2-3 days",
      procore: "2-3 months",
      advantage: "builddesk"
    },
    {
      feature: "Monthly Cost (10 users)",
      builddesk: "$299",
      procore: "$375+",
      advantage: "builddesk"
    },
    {
      feature: "Learning Curve",
      builddesk: "Intuitive interface",
      procore: "Complex, requires training",
      advantage: "builddesk"
    },
    {
      feature: "Small Business Focus",
      builddesk: "Built for SMBs",
      procore: "Enterprise-focused",
      advantage: "builddesk"
    },
    {
      feature: "Customer Support",
      builddesk: "Personal support",
      procore: "Ticket-based system",
      advantage: "builddesk"
    }
  ];

  return (
    <>
      <SEOMetaTags
        title="Procore Alternative - Better Construction Software for Small Business | BuildDesk"
        description="Affordable Procore alternative built for small-medium contractors. Faster setup, lower cost, easier to use. Get the power of enterprise software without the complexity."
        keywords={['Procore alternative', 'construction management software alternative', 'small business construction software', 'affordable construction software', 'Procore competitor', 'construction project management alternative']}
        canonicalUrl="/procore-alternative"
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
                BuildDesk delivers the power you need with the simplicity you want.
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
                BuildDesk vs. Procore Comparison
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Feature</th>
                      <th className="text-center py-3 px-4 text-construction-blue font-bold">BuildDesk</th>
                      <th className="text-center py-3 px-4">Procore</th>
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
                          {row.procore}
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
                Why Switch from Procore to BuildDesk
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

            {/* CTA Section */}
            <div className="bg-construction-blue text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Make the Switch to BuildDesk
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
