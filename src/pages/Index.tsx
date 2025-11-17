import React from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero3D";
import SocialProof from "@/components/SocialProof";
import ProblemSolution from "@/components/ProblemSolution";
import FinancialIntelligenceShowcase from "@/components/FinancialIntelligenceShowcase";
import FinancialHealthCheckBanner from "@/components/FinancialHealthCheckBanner";
import Implementation from "@/components/Implementation";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import LazySection from "@/components/LazySection";
import { TestimonialsSection, ClientLogosSection } from "@/components/TestimonialsSection";
import { CaseStudiesSection } from "@/components/CaseStudiesSection";
import { SkipLink } from "@/components/accessibility/AccessibilityUtils";
import { PageSEO, createOrganizationSchema, createSoftwareApplicationSchema, createBreadcrumbSchema } from "@/components/seo/PageSEO";
import { GEOOptimizedFAQ, homepageFAQs } from "@/components/seo/GEOOptimizedFAQ";
import { LazyFeatures, LazyPricing, LazyIndustries, PerformanceLazyWrapper } from "@/components/performance/LazyComponents";
import AISearchOptimization from "@/components/AISearchOptimization";
import { OrganizationSchema, SoftwareSchema } from "@/components/seo/EnhancedSchemaMarkup";
import CoreWebVitalsOptimizer from "@/components/performance/CoreWebVitalsOptimizer";
import { AdvancedSEOAnalytics } from "@/components/analytics/AdvancedSEOAnalytics";
import { AdvancedCoreWebVitals } from "@/components/performance/AdvancedCoreWebVitals";
import { SiteSearchSchema } from "@/components/seo/SiteSearchSchema";
import { initializeSEOBackendIntegration } from "@/utils/seoBackendSync";
import { supabase } from "@/integrations/supabase/client";
import { initializeFontOptimizations, monitorFontPerformance } from "@/utils/fontOptimization";
// import { initializePerformanceOptimizations } from "@/utils/performanceOptimization";
import { CriticalResourceLoader, useCriticalResources, PageResourcePreloader } from "@/components/performance/CriticalResourceLoader";
import StickyDemoCTA from "@/components/StickyDemoCTA";

import { FontOptimization, useFontOptimization } from "@/components/performance/FontOptimization";
import { MobilePerformanceProvider } from "@/components/performance/MobileOptimizations";
import { useCriticalCSS } from "@/utils/criticalCSSExtractor";

const Index = () => {
  // Initialize all performance optimizations
  useCriticalResources();
  useFontOptimization();
  useCriticalCSS('homepage');

  // Initialize SEO backend integration on app start
  React.useEffect(() => {
    // Initialize font optimization first for better performance
    initializeFontOptimizations([
      { family: 'Inter', preload: true, display: 'swap' }
    ]);
    monitorFontPerformance();
    
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
  }, []);

  return (
    <MobilePerformanceProvider>
      <div className="min-h-screen bg-background">
        {/* Performance Optimizations */}
        <CoreWebVitalsOptimizer pageType="homepage" />
        <AdvancedCoreWebVitals enableReporting={true} enableOptimization={true} />
        <AdvancedSEOAnalytics />
        <FontOptimization />
        <PageResourcePreloader pageType="homepage" />
        <SiteSearchSchema />
      
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
      
      <main id="main-content" role="main">
        <Hero />
        <SocialProof />

        {/* Financial Health Check CTA Banner */}
        <FinancialHealthCheckBanner />

        <LazySection>
          <ProblemSolution />
        </LazySection>

        <LazySection>
          <FinancialIntelligenceShowcase />
        </LazySection>

        <PerformanceLazyWrapper fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
          <LazyFeatures />
        </PerformanceLazyWrapper>
        
        <PerformanceLazyWrapper fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}>
          <LazyIndustries />
        </PerformanceLazyWrapper>
        
        <PerformanceLazyWrapper fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
          <LazyPricing />
        </PerformanceLazyWrapper>
        
        {/* Trust Signals */}
        <LazySection>
          <TestimonialsSection />
        </LazySection>
        
        <LazySection>
          <CaseStudiesSection />
        </LazySection>
        
        <ClientLogosSection />
        
        <LazySection>
          <Implementation />
        </LazySection>
        
        <LazySection>
          <FAQ />
        </LazySection>
        
        {/* AI Search Optimization Section */}
        <LazySection>
          <div className="container mx-auto px-4 py-16">
            <AISearchOptimization page="homepage" primaryKeyword="construction financial intelligence software" />
          </div>
        </LazySection>

        {/* GEO-Optimized FAQ Section */}
        <LazySection>
          <div className="container mx-auto px-4 py-16">
            <GEOOptimizedFAQ
              faqs={homepageFAQs}
              title="Construction Management Software FAQs"
              description="Get answers to common questions about BuildDesk and construction management software"
            />
          </div>
        </LazySection>
      </main>
      
      <OrganizationSchema />
      <SoftwareSchema />
      <Footer />
      
      {/* Sticky Demo CTA */}
      <StickyDemoCTA />
    </div>
    </MobilePerformanceProvider>
  );
};

export default Index;

