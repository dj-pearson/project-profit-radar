import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FinancialHealthCheck from "@/components/tools/FinancialHealthCheck";
import { CheckCircle, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import { PageSEO } from "@/components/seo/PageSEO";

const FinancialHealthCheckPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title="Free Financial Intelligence Health Check for Contractors | BuildDesk"
        description="Take our 2-minute assessment to discover what financial blindness is costing your construction business. Get personalized report showing hidden costs, time waste, and ROI projections. 500+ contractors improved margins by 4%+ after identifying their financial gaps."
        keywords={[
          'contractor financial assessment',
          'construction profit calculator',
          'contractor financial health check',
          'construction cost analysis tool',
          'contractor profit loss assessment',
          'construction financial audit',
          'contractor profitability tool'
        ]}
        canonicalUrl="https://builddesk.com/financial-health-check"
        lastModified="2025-11-11"
      />

      <Header />

      <main className="py-12 sm:py-20">
        {/* Hero Section */}
        <section className="container mx-auto px-4 mb-12">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-construction-dark mb-4">
              How Much Is Financial Blindness
              <span className="block text-construction-orange mt-2">Costing Your Business?</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-6">
              Most contractors don't know they're losing money until tax time. Take our 2-minute Financial Intelligence Health Check to discover your hidden costs.
            </p>

            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-construction-orange mb-1">2 min</div>
                <div className="text-sm text-muted-foreground">Quick Assessment</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-construction-orange mb-1">12</div>
                <div className="text-sm text-muted-foreground">Simple Questions</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-construction-orange mb-1">100%</div>
                <div className="text-sm text-muted-foreground">Free Forever</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-construction-orange mb-1">Instant</div>
                <div className="text-sm text-muted-foreground">Personalized Report</div>
              </div>
            </div>
          </div>

          {/* What You'll Discover */}
          <div className="max-w-3xl mx-auto mb-12 bg-gradient-to-r from-construction-orange/10 to-construction-blue/10 p-8 rounded-xl">
            <h2 className="text-2xl font-bold text-construction-dark mb-6 text-center">
              What You'll Discover
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-construction-orange flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-construction-dark mb-1">Your Financial Intelligence Score</h3>
                  <p className="text-sm text-muted-foreground">0-100 rating across 4 critical categories</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-construction-orange flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-construction-dark mb-1">Estimated Annual Cost</h3>
                  <p className="text-sm text-muted-foreground">What financial blindness is costing you</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-6 w-6 text-construction-orange flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-construction-dark mb-1">Time Wasted</h3>
                  <p className="text-sm text-muted-foreground">Days per year lost to manual processes</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="h-6 w-6 text-construction-orange flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-construction-dark mb-1">Custom Action Plan</h3>
                  <p className="text-sm text-muted-foreground">Personalized recommendations to improve</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Assessment Tool */}
        <section className="container mx-auto px-4">
          <FinancialHealthCheck />
        </section>

        {/* Social Proof */}
        <section className="container mx-auto px-4 mt-16">
          <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-lg text-center">
            <h3 className="text-xl font-bold text-construction-dark mb-4">
              Join 500+ Contractors Who Discovered Their Hidden Costs
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-3xl font-bold text-construction-orange mb-2">$47K</div>
                <div className="text-sm text-muted-foreground">Average cost overrun prevented after implementing recommendations</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-construction-orange mb-2">4%</div>
                <div className="text-sm text-muted-foreground">Average margin improvement within first quarter</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-construction-orange mb-2">36 days</div>
                <div className="text-sm text-muted-foreground">Time reclaimed annually from automated processes</div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Building */}
        <section className="container mx-auto px-4 mt-12">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-muted-foreground mb-4">
              <strong className="text-construction-dark">Why contractors trust this assessment:</strong>
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-construction-orange" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-construction-orange" />
                <span>No software installation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-construction-orange" />
                <span>100% privacy protected</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-construction-orange" />
                <span>Unsubscribe anytime</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FinancialHealthCheckPage;
