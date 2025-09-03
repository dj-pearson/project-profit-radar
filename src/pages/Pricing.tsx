import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import Pricing from "@/components/Pricing";

const PricingPage = () => {
  return (
    <>
      <SEOMetaTags
        title="BuildDesk Pricing - Affordable Construction Management Software"
        description="Simple, transparent pricing for construction management software. Start at $149/month. No setup fees. Cancel anytime. 14-day free trial included."
        keywords={['construction software pricing', 'construction management software cost', 'contractor software pricing', 'BuildDesk pricing', 'construction project management pricing']}
        canonicalUrl="/pricing"
      />
      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        <main className="py-12">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-4">
                Simple, Transparent Pricing
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Choose the plan that fits your construction business. All plans include a 14-day free trial.
              </p>
            </div>
            <Pricing />
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default PricingPage;
