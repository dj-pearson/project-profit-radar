import React, { lazy, Suspense, useEffect, useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SocialProof from "@/components/SocialProof";
import ProblemSolution from "@/components/ProblemSolution";
import FinancialIntelligenceShowcase from "@/components/FinancialIntelligenceShowcase";
import { SkipLink } from "@/components/accessibility/AccessibilityUtils";
import { PageSEO, createOrganizationSchema, createSoftwareApplicationSchema, createBreadcrumbSchema } from "@/components/seo/PageSEO";
import { LazyFeatures, LazyPricing, LazyIndustries, PerformanceLazyWrapper } from "@/components/performance/LazyComponents";
import { OrganizationSchema, SoftwareSchema } from "@/components/seo/EnhancedSchemaMarkup";
import { initializeSEOBackendIntegration } from "@/utils/seoBackendSync";
import { supabase } from "@/integrations/supabase/client";
import { initializeFontOptimizations, monitorFontPerformance } from "@/utils/fontOptimization";
import { useCriticalResources } from "@/components/performance/CriticalResourceLoader";
import ModernSection from "@/components/ui/ModernSection";
import { MobilePerformanceProvider } from "@/components/performance/MobileOptimizations";
import { useCriticalCSS } from "@/utils/criticalCSSExtractor";

// Lazy load below-the-fold components for better mobile performance
const FinancialHealthCheckBanner = lazy(() => import("@/components/FinancialHealthCheckBanner"));
const Implementation = lazy(() => import("@/components/Implementation"));
const FAQ = lazy(() => import("@/components/FAQ"));
const Footer = lazy(() => import("@/components/Footer"));
const TestimonialsSection = lazy(() => import("@/components/TestimonialsSection").then(m => ({ default: m.TestimonialsSection })));
const ClientLogosSection = lazy(() => import("@/components/TestimonialsSection").then(m => ({ default: m.ClientLogosSection })));
const CaseStudiesSection = lazy(() => import("@/components/CaseStudiesSection").then(m => ({ default: m.CaseStudiesSection })));
const StickyDemoCTA = lazy(() => import("@/components/StickyDemoCTA"));
const ParallaxBackground = lazy(() => import("@/components/ParallaxBackground"));

// Defer non-critical performance monitoring - load after first paint
const CoreWebVitalsOptimizer = lazy(() => import("@/components/performance/CoreWebVitalsOptimizer"));
const AdvancedSEOAnalytics = lazy(() => import("@/components/analytics/AdvancedSEOAnalytics").then(m => ({ default: m.AdvancedSEOAnalytics })));
const AdvancedCoreWebVitals = lazy(() => import("@/components/performance/AdvancedCoreWebVitals").then(m => ({ default: m.AdvancedCoreWebVitals })));
const SiteSearchSchema = lazy(() => import("@/components/seo/SiteSearchSchema").then(m => ({ default: m.SiteSearchSchema })));
const FontOptimization = lazy(() => import("@/components/performance/FontOptimization").then(m => ({ default: m.FontOptimization })));
const PageResourcePreloader = lazy(() => import("@/components/performance/CriticalResourceLoader").then(m => ({ default: m.PageResourcePreloader })));
const AISearchOptimization = lazy(() => import("@/components/AISearchOptimization"));
const GEOOptimizedFAQ = lazy(() => import("@/components/seo/GEOOptimizedFAQ").then(m => ({ default: m.GEOOptimizedFAQ })));

// Import FAQ data statically since it's just data
import { homepageFAQs } from "@/components/seo/GEOOptimizedFAQ";

// Hook to detect mobile - SSR safe
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024 || 'ontouchstart' in window);
    };
    checkMobile();
  }, []);

  return isMobile;
};

// Minimal loading fallback
const SectionFallback = ({ height = "h-64" }: { height?: string }) => (
  <div className={`${height} bg-muted/30 animate-pulse rounded-lg`} />
);

const Index = () => {
  // Initialize critical resources only
  useCriticalResources();
  useCriticalCSS('homepage');

  const isMobile = useIsMobile();
  const [deferredLoaded, setDeferredLoaded] = useState(false);

  // Defer non-critical initializations until after first paint
  useEffect(() => {
    // Use requestIdleCallback to defer non-critical work
    const initDeferred = () => {
      // Initialize font optimization after first paint
      initializeFontOptimizations([
        { family: 'Inter', preload: true, display: 'swap' }
      ]);
      monitorFontPerformance();
      setDeferredLoaded(true);

      // Then initialize SEO backend integration only when authenticated
      (async () => {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          initializeSEOBackendIntegration().then(result => {
            if (result.success) {
              console.log('✅ SEO backend integration successful');
            } else {
              console.warn('⚠️ SEO backend integration warning:', result.message);
            }
          });
        }
      })();
    };

    // Defer initialization until browser is idle
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(initDeferred, { timeout: 2000 });
    } else {
      setTimeout(initDeferred, 100);
    }
  }, []);

  return (
    <MobilePerformanceProvider>
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Deferred Performance Optimizations - only load after first paint */}
        {deferredLoaded && (
          <Suspense fallback={null}>
            <CoreWebVitalsOptimizer pageType="homepage" />
            <AdvancedCoreWebVitals enableReporting={true} enableOptimization={true} />
            <AdvancedSEOAnalytics />
            <FontOptimization />
            <PageResourcePreloader pageType="homepage" />
            <SiteSearchSchema />
          </Suspense>
        )}

        {/* Parallax Background - skip on mobile for better performance */}
        {!isMobile && (
          <Suspense fallback={null}>
            <ParallaxBackground />
          </Suspense>
        )}

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

          {/* SEO-only sections - deferred loading, hidden from users */}
          {deferredLoaded && (
            <div className="sr-only" aria-hidden="true">
              <Suspense fallback={null}>
                <AISearchOptimization page="homepage" primaryKeyword="construction financial intelligence software" />
                <GEOOptimizedFAQ
                  faqs={homepageFAQs}
                  title="Construction Management Software FAQs"
                  description="Get answers to common questions about BuildDesk and construction management software"
                />
              </Suspense>
            </div>
          )}
        </main>

        <OrganizationSchema />
        <SoftwareSchema />
        <Suspense fallback={<SectionFallback height="h-64" />}>
          <Footer />
        </Suspense>

        {/* Sticky Demo CTA - defer on mobile */}
        {!isMobile && (
          <Suspense fallback={null}>
            <StickyDemoCTA />
          </Suspense>
        )}
      </div>
    </MobilePerformanceProvider>
  );
};

export default Index;
