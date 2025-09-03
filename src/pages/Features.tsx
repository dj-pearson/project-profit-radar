import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import Features from "@/components/Features";

const FeaturesPage = () => {
  return (
    <>
      <SEOMetaTags
        title="BuildDesk Features - Complete Construction Management Suite"
        description="Discover all BuildDesk features: job costing, project management, mobile field apps, OSHA compliance, QuickBooks integration, and more for construction contractors."
        keywords={['construction management features', 'construction software features', 'job costing software', 'project management tools', 'construction field management', 'OSHA compliance software']}
        canonicalUrl="/features"
      />
      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        <main className="py-12">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-4">
                Complete Construction Management Suite
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Everything you need to run your construction business efficiently, from project planning to final invoicing.
              </p>
            </div>
            <Features />
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default FeaturesPage;
