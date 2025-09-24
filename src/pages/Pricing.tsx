import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import Pricing from "@/components/Pricing";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";
import StickyDemoCTA from "@/components/StickyDemoCTA";

const PricingPage = () => {
  return (
    <>
      <SEOMetaTags
        title="Construction Management Software Pricing - Simple & Transparent | BuildDesk"
        description="Transparent pricing for small & mid contractors. Start at $149/month with job costing, scheduling, OSHA compliance. No setup fees. 14-day free trial."
        keywords={['construction software pricing', 'construction management software cost', 'contractor software pricing', 'construction project management pricing', 'job costing software pricing']}
        canonicalUrl="/pricing"
      />
      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        <main className="py-12">
          <div className="container mx-auto px-4">
            {/* Breadcrumbs */}
            <BreadcrumbsNavigation className="mb-6" />
            
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
        <StickyDemoCTA />
      </div>
    </>
  );
};

export default PricingPage;
