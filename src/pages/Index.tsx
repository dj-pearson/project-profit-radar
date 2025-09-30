import React from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SocialProof from "@/components/SocialProof";
import ProblemSolution from "@/components/ProblemSolution";
import Implementation from "@/components/Implementation";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import LazySection from "@/components/LazySection";
import { TestimonialsSection, ClientLogosSection } from "@/components/TestimonialsSection";
import { CaseStudiesSection } from "@/components/CaseStudiesSection";
import { SkipLink } from "@/components/accessibility/AccessibilityUtils";
import { SEOMetaTags, constructionSoftwareStructuredData, organizationStructuredData } from "@/components/SEOMetaTags";
import { LazyFeatures, LazyPricing, LazyIndustries, PerformanceLazyWrapper } from "@/components/performance/LazyComponents";
import AISearchOptimization from "@/components/AISearchOptimization";
import { OrganizationSchema, SoftwareSchema } from "@/components/seo/EnhancedSchemaMarkup";
import CoreWebVitalsOptimizer from "@/components/performance/CoreWebVitalsOptimizer";
import { AdvancedSEOAnalytics } from "@/components/analytics/AdvancedSEOAnalytics";
import { AdvancedCoreWebVitals } from "@/components/performance/AdvancedCoreWebVitals";
import { SiteSearchSchema } from "@/components/seo/SiteSearchSchema";
import { initializeSEOBackendIntegration } from "@/utils/seoBackendSync";
import { initializeFontOptimization, monitorFontPerformance, optimizeCriticalFonts } from "@/utils/fontOptimization";
// import { initializePerformanceOptimizations } from "@/utils/performanceOptimization";
import { CriticalResourceLoader, useCriticalResources, PageResourcePreloader } from "@/components/performance/CriticalResourceLoader";
import StickyDemoCTA from "@/components/StickyDemoCTA";

import { FontOptimization, useFontOptimization } from "@/components/performance/FontOptimization";
import { MobilePerformanceProvider } from "@/components/performance/MobileOptimizations";
// import { useCriticalCSS } from "@/utils/criticalCSSExtractor";
const Index = () => {
  // Initialize all performance optimizations
  useCriticalResources();
  useFontOptimization();
  // useCriticalCSS('homepage');

  // Initialize SEO backend integration on app start
  React.useEffect(() => {
    // Initialize font optimization first for better performance
    optimizeCriticalFonts();
    initializeFontOptimization();
    monitorFontPerformance();
    
    // Then initialize SEO backend integration
    initializeSEOBackendIntegration().then(result => {
      if (result.success) {
        console.log('✅ SEO backend integration successful');
      } else {
        console.warn('⚠️ SEO backend integration warning:', result.message);
      }
    });
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
      
      <SEOMetaTags
        title="Construction Management Software for Small & Mid GC Teams | BuildDesk"
        description="Job costing, scheduling, daily logs, OSHA reporting, and time tracking in one simple tool for U.S. contractors. Simple setup, fast onboarding, clear dashboards for jobs, crews, and costs."
        keywords={[
          'construction management software', 
          'construction project management software',
          'construction software for small business',
          'job costing software construction',
          'construction field management software',
          'procore alternative small contractors',
          'buildertrend alternative',
          'construction time tracking app',
          'OSHA safety reporting software',
          'construction scheduling software',
          'construction budget tracking',
          'quickbooks construction integration'
        ]}
        canonicalUrl="/"
        structuredData={[constructionSoftwareStructuredData, organizationStructuredData]}
      />
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <SkipLink href="#navigation">Skip to navigation</SkipLink>
      
      <Header />
      
      <main id="main-content" role="main">
        <Hero />
        <SocialProof />
        
        <LazySection>
          <ProblemSolution />
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
            <AISearchOptimization page="homepage" primaryKeyword="construction management software" />
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

