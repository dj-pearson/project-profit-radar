import React, { lazy, Suspense, useState, useEffect, useCallback } from "react";
import { ChevronUp } from "lucide-react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import { SkipLink } from "@/components/accessibility/AccessibilityUtils";
import { PageSEO, createOrganizationSchema, createSoftwareApplicationSchema, createBreadcrumbSchema, createWebSiteSchema } from "@/components/seo/PageSEO";
import { LazyFeatures, LazyPricing, LazyIndustries, PerformanceLazyWrapper } from "@/components/performance/LazyComponents";
import { OrganizationSchema, SoftwareSchema } from "@/components/seo/EnhancedSchemaMarkup";
import ModernSection from "@/components/ui/ModernSection";
import { AggregateRatingSchema } from "@/components/seo/AggregateRatingSchema";
import { BreadcrumbsNavigation } from "@/components/BreadcrumbsNavigation";
import { SaaSProductSchema } from "@/components/seo/SaaSProductSchema";

// Lazy load below-the-fold components
const SocialProof = lazy(() => import("@/components/SocialProof"));
const ProblemSolution = lazy(() => import("@/components/ProblemSolution"));
const FinancialIntelligenceShowcase = lazy(() => import("@/components/FinancialIntelligenceShowcase"));
const FinancialHealthCheckBanner = lazy(() => import("@/components/FinancialHealthCheckBanner"));
const Implementation = lazy(() => import("@/components/Implementation"));
const FAQ = lazy(() => import("@/components/FAQ"));
const Footer = lazy(() => import("@/components/Footer"));
const TestimonialsSection = lazy(() => import("@/components/TestimonialsSection").then(m => ({ default: m.TestimonialsSection })));
const ClientLogosSection = lazy(() => import("@/components/TestimonialsSection").then(m => ({ default: m.ClientLogosSection })));
const CaseStudiesSection = lazy(() => import("@/components/CaseStudiesSection").then(m => ({ default: m.CaseStudiesSection })));
const StickyDemoCTA = lazy(() => import("@/components/StickyDemoCTA"));

// Minimal loading fallback
const SectionFallback = ({ height = "h-64" }: { height?: string }) => (
  <div className={`${height} bg-muted/30 animate-pulse rounded-lg flex items-center justify-center`}>
    <span className="text-sm text-muted-foreground/50">Loading...</span>
  </div>
);

const Index = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    setScrollProgress(progress);
    setShowBackToTop(progress > 50);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Scroll Progress Indicator */}
        <div className="fixed top-16 left-0 right-0 z-40 h-0.5 bg-border/20">
          <div
            className="h-full bg-construction-orange transition-[width] duration-100"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

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
          schema={[createOrganizationSchema(), createSoftwareApplicationSchema(), createWebSiteSchema(), createBreadcrumbSchema([
            { name: "Home", url: "https://builddesk.com" }
          ])]}
          lastModified="2026-02-08"
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
            <Suspense fallback={<SectionFallback height="h-64" />}>
              <SocialProof />
            </Suspense>
          </ModernSection>

          <ModernSection direction="up" background="mesh" className="py-24">
            <Suspense fallback={<SectionFallback height="h-96" />}>
              <ProblemSolution />
            </Suspense>
          </ModernSection>

          <ModernSection background="grid" className="bg-secondary/20">
            <Suspense fallback={<SectionFallback height="h-64" />}>
              <FinancialIntelligenceShowcase />
            </Suspense>
          </ModernSection>

          <PerformanceLazyWrapper fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
            <ModernSection>
              <LazyFeatures />
            </ModernSection>
          </PerformanceLazyWrapper>

          {/* Trust Signals - BEFORE pricing for better conversion */}
          <ModernSection background="glass">
            <Suspense fallback={<SectionFallback height="h-96" />}>
              <TestimonialsSection />
            </Suspense>
          </ModernSection>

          <ModernSection>
            <Suspense fallback={<SectionFallback height="h-64" />}>
              <CaseStudiesSection />
            </Suspense>
          </ModernSection>

          {/* Pricing - Main conversion point */}
          <PerformanceLazyWrapper fallback={<SectionFallback height="h-96" />}>
            <ModernSection direction="up" background="mesh" id="pricing">
              <LazyPricing />
            </ModernSection>
          </PerformanceLazyWrapper>

          <PerformanceLazyWrapper fallback={<SectionFallback height="h-64" />}>
            <ModernSection direction="left">
              <LazyIndustries />
            </ModernSection>
          </PerformanceLazyWrapper>

          <ModernSection>
            <Suspense fallback={<SectionFallback height="h-32" />}>
              <ClientLogosSection />
            </Suspense>
          </ModernSection>

          {/* Financial Health Check CTA Banner - Secondary conversion */}
          <ModernSection direction="left" className="py-12">
            <Suspense fallback={<SectionFallback height="h-48" />}>
              <FinancialHealthCheckBanner />
            </Suspense>
          </ModernSection>

          <ModernSection>
            <Suspense fallback={<SectionFallback height="h-64" />}>
              <Implementation />
            </Suspense>
          </ModernSection>

          <ModernSection className="mb-20">
            <Suspense fallback={<SectionFallback height="h-96" />}>
              <FAQ />
            </Suspense>
          </ModernSection>
        </main>

        <OrganizationSchema />
        <SoftwareSchema />
        <Suspense fallback={<SectionFallback height="h-64" />}>
          <Footer />
        </Suspense>

        <Suspense fallback={null}>
          <StickyDemoCTA />
        </Suspense>

        {/* Back to Top Button - always rendered, visibility toggled via CSS to avoid CLS */}
        <button
          onClick={scrollToTop}
          className={`fixed bottom-20 right-4 z-40 rounded-full h-10 w-10 flex items-center justify-center bg-construction-orange text-white hover:bg-construction-orange/90 shadow-lg transition-all duration-300 ${
            showBackToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
          aria-label="Back to top"
          aria-hidden={!showBackToTop}
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      </div>
  );
};

export default Index;
