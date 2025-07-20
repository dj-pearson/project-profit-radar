import { lazy, Suspense } from "react";
import Header from "@/components/Header";
import SocialProof from "@/components/SocialProof";
import CriticalCSS from "@/components/CriticalCSS";
import PerformanceOptimizer from "@/components/PerformanceOptimizer";
import MobileOptimizedHero from "@/components/MobileOptimizedHero";
import OptimizedLazySection from "@/components/OptimizedLazySection";
import { SkipLink } from "@/components/accessibility/AccessibilityUtils";
import { SEOMetaTags, constructionSoftwareStructuredData, organizationStructuredData } from "@/components/SEOMetaTags";

// Lazy load non-critical components for better performance
const ProblemSolution = lazy(() => import("@/components/ProblemSolution"));
const Features = lazy(() => import("@/components/Features"));
const Industries = lazy(() => import("@/components/Industries"));
const Pricing = lazy(() => import("@/components/Pricing"));
const Implementation = lazy(() => import("@/components/Implementation"));
const FAQ = lazy(() => import("@/components/FAQ"));
const Footer = lazy(() => import("@/components/Footer"));

const Index = () => {
  return (
    <div className="critical-layout">
      <CriticalCSS />
      <PerformanceOptimizer />
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
        <MobileOptimizedHero />
        <SocialProof />
        
        <OptimizedLazySection priority="high">
          <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
            <ProblemSolution />
          </Suspense>
        </OptimizedLazySection>
        
        <OptimizedLazySection priority="normal">
          <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
            <Features />
          </Suspense>
        </OptimizedLazySection>
        
        <OptimizedLazySection priority="normal">
          <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}>
            <Industries />
          </Suspense>
        </OptimizedLazySection>
        
        <OptimizedLazySection priority="high">
          <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
            <Pricing />
          </Suspense>
        </OptimizedLazySection>
        
        <OptimizedLazySection priority="low">
          <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}>
            <Implementation />
          </Suspense>
        </OptimizedLazySection>
        
        <OptimizedLazySection priority="low">
          <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}>
            <FAQ />
          </Suspense>
        </OptimizedLazySection>
      </main>
      
      <Suspense fallback={<div className="h-32 bg-muted animate-pulse" />}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default Index;

