import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { QuickAnswerSnippet, LastUpdated } from "@/components/seo/QuickAnswerSnippet";
import Features from "@/components/Features";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";
import StickyDemoCTA from "@/components/StickyDemoCTA";

const FeaturesPage = () => {
  return (
    <>
      <SEOMetaTags
        title="Construction Management Features - Job Costing, Scheduling & OSHA | BuildDesk"
        description="Complete construction management suite: real-time job costing, mobile crew tracking, daily logs, OSHA compliance, QuickBooks sync. Built for small & mid-size contractors."
        keywords={['construction management features', 'job costing software construction', 'construction time tracking app', 'OSHA safety reporting software', 'construction field management', 'construction scheduling software']}
        canonicalUrl="/features"
      />
      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        <main className="py-12">
          <div className="container mx-auto px-4">
            {/* Breadcrumbs */}
            <BreadcrumbsNavigation className="mb-6" />
            
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-4">
                Complete Construction Management Suite
              </h1>
              <LastUpdated date="September 2025" />
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
                Everything you need to run your construction business efficiently, from project planning to final invoicing.
              </p>
            </div>
            
            <QuickAnswerSnippet
              question="What features should construction management software have?"
              answer="Essential features include real-time job costing, mobile crew tracking, daily logs, OSHA compliance tools, QuickBooks integration, photo documentation, scheduling, and change order management. BuildDesk includes all these in one platform designed for small contractors."
            />
            <Features />
          </div>
        </main>
        <Footer />
        <StickyDemoCTA />
      </div>
    </>
  );
};

export default FeaturesPage;
