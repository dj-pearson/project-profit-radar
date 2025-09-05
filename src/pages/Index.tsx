import React from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SocialProof from "@/components/SocialProof";
import ProblemSolution from "@/components/ProblemSolution";
import Implementation from "@/components/Implementation";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import LazySection from "@/components/LazySection";
import { SkipLink } from "@/components/accessibility/AccessibilityUtils";
import { SEOMetaTags, constructionSoftwareStructuredData, organizationStructuredData } from "@/components/SEOMetaTags";
import { LazyFeatures, LazyPricing, LazyIndustries, PerformanceLazyWrapper } from "@/components/performance/LazyComponents";
import AISearchOptimization from "@/components/AISearchOptimization";
import { OrganizationSchema, SoftwareSchema } from "@/components/EnhancedSchemaMarkup";
// import { initializePerformanceOptimizations } from "@/utils/performanceOptimization";
import { CriticalResourceLoader, useCriticalResources, PageResourcePreloader } from "@/components/performance/CriticalResourceLoader";
import { PerformanceDashboard } from "@/components/performance/PerformanceDashboard";
import { FontOptimization, useFontOptimization } from "@/components/performance/FontOptimization";
import { MobilePerformanceProvider } from "@/components/performance/MobileOptimizations";
// import { useCriticalCSS } from "@/utils/criticalCSSExtractor";
const Index = () => {
  const [showPerformanceDashboard, setShowPerformanceDashboard] = React.useState(false);
  
  // Initialize all performance optimizations
  useCriticalResources();
  useFontOptimization();
  // useCriticalCSS('homepage');
  
  // Initialize performance optimizations
  React.useEffect(() => {
    // initializePerformanceOptimizations();
    
    // Show performance dashboard in development
    if (process.env.NODE_ENV === 'development') {
      const timer = setTimeout(() => setShowPerformanceDashboard(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <MobilePerformanceProvider>
      <div className="min-h-screen bg-background">
        {/* Performance Optimizations */}
        <FontOptimization />
        <PageResourcePreloader pageType="homepage" />
      
      <SEOMetaTags
        title="BuildDesk - Construction Management Software for Small & Medium Contractors | Save 23% on Project Costs"
        description="Stop losing money on delays and overruns. BuildDesk delivers real-time job costing, mobile field management, and OSHA compliance without enterprise complexity. Join 500+ contractors saving $50K+ annually."
        keywords={[
          'construction management software', 
          'construction project management software',
          'construction software for small business',
          'job costing software construction',
          'construction field management software',
          'construction safety management software',
          'procore alternative',
          'buildertrend alternative',
          'contractor software',
          'construction scheduling software',
          'construction budget tracking',
          'OSHA compliance software',
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
      
      {/* Performance Dashboard for Development */}
      <PerformanceDashboard isVisible={showPerformanceDashboard} />
    </div>
    </MobilePerformanceProvider>
  );
};

export default Index;

