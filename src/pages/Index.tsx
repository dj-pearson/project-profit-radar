import React, { lazy, Suspense } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SocialProof from "@/components/SocialProof";
import ProblemSolution from "@/components/ProblemSolution";
import FinancialIntelligenceShowcase from "@/components/FinancialIntelligenceShowcase";
import { SkipLink } from "@/components/accessibility/AccessibilityUtils";
import { PageSEO, createOrganizationSchema, createSoftwareApplicationSchema, createBreadcrumbSchema } from "@/components/seo/PageSEO";
import { LazyFeatures, LazyPricing, LazyIndustries, PerformanceLazyWrapper } from "@/components/performance/LazyComponents";
import { OrganizationSchema, SoftwareSchema } from "@/components/seo/EnhancedSchemaMarkup";
import ModernSection from "@/components/ui/ModernSection";
import { AggregateRatingSchema } from "@/components/seo/AggregateRatingSchema";
import { BreadcrumbsNavigation } from "@/components/BreadcrumbsNavigation";
import { SaaSProductSchema } from "@/components/seo/SaaSProductSchema";

// Lazy load below-the-fold components
const FinancialHealthCheckBanner = lazy(() => import("@/components/FinancialHealthCheckBanner"));
const Implementation = lazy(() => import("@/components/Implementation"));
const FAQ = lazy(() => import("@/components/FAQ"));
const Footer = lazy(() => import("@/components/Footer"));
const TestimonialsSection = lazy(() => import("@/components/TestimonialsSection").then(m => ({ default: m.TestimonialsSection })));
const ClientLogosSection = lazy(() => import("@/components/TestimonialsSection").then(m => ({ default: m.ClientLogosSection })));
const CaseStudiesSection = lazy(() => import("@/components/CaseStudiesSection").then(m => ({ default: m.CaseStudiesSection })));
const StickyDemoCTA = lazy(() => import("@/components/StickyDemoCTA"));

interface SectionFallbackProps {
  height?: string;
  /** Accessible label for the loading section */
  label?: string;
}

/**
 * Accessible loading fallback for lazy-loaded sections
 */
const SectionFallback = ({
  height = "h-64",
  label = "Loading section"
}: SectionFallbackProps) => (
  <div
    className={`${height} bg-muted/30 animate-pulse rounded-lg flex items-center justify-center`}
    role="status"
    aria-busy="true"
    aria-label={label}
  >
    <span className="sr-only">{label}, please wait...</span>
  </div>
);

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">

        <PageSEO
          title="Real-Time Job Costing for Contractors"
          description="Construction job costing software with real-time budget tracking. Know your project profitability today, not 30 days later. Unlimited users, $350/month."
          keywords={[
            'construction job costing software',
            'real-time construction budgeting',
            'construction financial management',
            'job cost accounting for contractors',
            'construction profit tracking',
            'contractor expense tracking software',
            'real-time budget alerts construction',
            'construction financial dashboard software',
            'quickbooks alternative for contractors',
            'contractor cash flow forecasting',
            'construction budget vs actual tracking',
            'construction project profitability',
            'small contractor software',
            'construction cost tracking',
            'real-time job costing'
          ]}
          canonicalUrl="https://builddesk.com"
          schema={[createOrganizationSchema(), createSoftwareApplicationSchema(), createBreadcrumbSchema([
            { name: "Home", url: "https://builddesk.com" }
          ])]}
          lastModified="2025-11-11"
        />

        {/* Enhanced SEO: Aggregate Rating Schema for Rich Snippets */}
        <AggregateRatingSchema
          schemaType="SoftwareApplication"
          itemName="BuildDesk - Construction Management Software"
          itemDescription="Real-time job costing and construction management software for contractors"
          itemImage="https://ilhzuvemiuyfuxfegtlv.supabase.co/storage/v1/object/public/assets/builddesk-logo.png"
          itemUrl="https://builddesk.com"
        />

        {/* Enhanced SEO: Comprehensive SaaS Product Schema with Subscription Details */}
        <SaaSProductSchema
          includeReviews={true}
          includeOffers={true}
          includeFeatures={true}
        />

        {/* Enhanced SEO: Breadcrumb Navigation with Schema */}
        <BreadcrumbsNavigation
          items={[
            { label: 'Home', href: '/', isActive: true }
          ]}
          showHome={true}
          includeSchema={true}
          className="sr-only"
        />

        <SkipLink href="#main-content">Skip to main content</SkipLink>
        <SkipLink href="#navigation">Skip to navigation</SkipLink>

        <Header />

        <main id="main-content" role="main" className="relative z-10">
          <Hero />

          <ModernSection delay={0.2} background="glass" className="border-b border-border/40">
            <SocialProof />
          </ModernSection>

          <ModernSection direction="up" background="mesh" className="py-24">
            <ProblemSolution />
          </ModernSection>

          <ModernSection background="grid" className="bg-secondary/20">
            <FinancialIntelligenceShowcase />
          </ModernSection>

          <PerformanceLazyWrapper fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
            <ModernSection>
              <LazyFeatures />
            </ModernSection>
          </PerformanceLazyWrapper>

          {/* Trust Signals - BEFORE pricing for better conversion */}
          <ModernSection background="glass">
            <Suspense fallback={<SectionFallback height="h-96" label="Loading testimonials" />}>
              <TestimonialsSection />
            </Suspense>
          </ModernSection>

          <ModernSection>
            <Suspense fallback={<SectionFallback height="h-64" label="Loading case studies" />}>
              <CaseStudiesSection />
            </Suspense>
          </ModernSection>

          {/* Pricing - Main conversion point */}
          <PerformanceLazyWrapper fallback={<SectionFallback height="h-96" label="Loading pricing" />}>
            <ModernSection direction="up" background="mesh" id="pricing">
              <LazyPricing />
            </ModernSection>
          </PerformanceLazyWrapper>

          <PerformanceLazyWrapper fallback={<SectionFallback height="h-64" label="Loading industries" />}>
            <ModernSection direction="left">
              <LazyIndustries />
            </ModernSection>
          </PerformanceLazyWrapper>

          <ModernSection>
            <Suspense fallback={<SectionFallback height="h-32" label="Loading client logos" />}>
              <ClientLogosSection />
            </Suspense>
          </ModernSection>

          {/* Financial Health Check CTA Banner - Secondary conversion */}
          <ModernSection direction="left" className="py-12">
            <Suspense fallback={<SectionFallback height="h-48" label="Loading financial health check" />}>
              <FinancialHealthCheckBanner />
            </Suspense>
          </ModernSection>

          <ModernSection>
            <Suspense fallback={<SectionFallback height="h-64" label="Loading implementation steps" />}>
              <Implementation />
            </Suspense>
          </ModernSection>

          <ModernSection className="mb-20">
            <Suspense fallback={<SectionFallback height="h-96" label="Loading FAQ" />}>
              <FAQ />
            </Suspense>
          </ModernSection>
        </main>

        <OrganizationSchema />
        <SoftwareSchema />
        <Suspense fallback={<SectionFallback height="h-64" label="Loading footer" />}>
          <Footer />
        </Suspense>

        <Suspense fallback={null}>
          <StickyDemoCTA />
        </Suspense>
      </div>
  );
};

export default Index;
