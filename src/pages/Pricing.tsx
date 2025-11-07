import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PageSEO, createBreadcrumbSchema, createProductSchema } from "@/components/seo/PageSEO";
import { GEOOptimizedFAQ, pricingFAQs } from "@/components/seo/GEOOptimizedFAQ";
import { QuickAnswerSnippet, LastUpdated } from "@/components/seo/QuickAnswerSnippet";
import Pricing from "@/components/Pricing";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";
import StickyDemoCTA from "@/components/StickyDemoCTA";

const PricingPage = () => {
  // Structured data for pricing page
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", url: "https://builddesk.com" },
    { name: "Pricing", url: "https://builddesk.com/pricing" }
  ]);

  const productSchema = createProductSchema(
    "BuildDesk Construction Management Software",
    "Complete construction management platform for small contractors with job costing, scheduling, mobile apps, and OSHA compliance.",
    "350",
    {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "247"
      }
    }
  );

  return (
    <>
      <PageSEO
        title="BuildDesk Pricing - $350/Month Unlimited Users | Construction Software"
        description="Simple, transparent pricing for construction management software. $350/month with unlimited users, job costing, scheduling, mobile apps, OSHA compliance, QuickBooks sync. 14-day free trial. No setup fees."
        keywords={[
          'construction software pricing',
          'construction management software cost',
          'builddesk pricing',
          'contractor software pricing',
          'construction project management pricing',
          'job costing software cost',
          'procore alternative pricing',
          'affordable construction software'
        ]}
        canonicalUrl="/pricing"
        schema={[breadcrumbSchema, productSchema]}
        lastModified="2025-11-07"
      />
      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        <main className="py-12">
          <div className="container mx-auto px-4">
            {/* Breadcrumbs */}
            <BreadcrumbsNavigation className="mb-6" />

            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-4">
                Simple, Transparent Pricing for Small Contractors
              </h1>
              <LastUpdated date="November 2025" />
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
                $350/month with unlimited users. No per-seat fees, no setup charges, no hidden costs. Start your 14-day free trial today.
              </p>
            </div>

            <QuickAnswerSnippet
              question="How much does BuildDesk construction management software cost?"
              answer="BuildDesk costs $350/month with unlimited users and all features included. This is 50% less than Procore ($500+/month per user) and includes no hidden fees, no per-seat charges, and no setup costs. A 14-day free trial is available with no credit card required."
            />

            <Pricing />

            {/* GEO-Optimized FAQ Section */}
            <div className="mt-16">
              <GEOOptimizedFAQ
                faqs={pricingFAQs}
                title="Pricing & Billing Questions"
                description="Get answers to common questions about BuildDesk pricing, billing, and plans"
              />
            </div>
          </div>
        </main>
        <Footer />
        <StickyDemoCTA />
      </div>
    </>
  );
};

export default PricingPage;
