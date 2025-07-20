import { lazy, Suspense } from "react";
import CriticalCSS from "@/components/CriticalCSS";
import PerformanceOptimizer from "@/components/PerformanceOptimizer";
import { SkipLink } from "@/components/accessibility/AccessibilityUtils";
import { SEOMetaTags, constructionSoftwareStructuredData, organizationStructuredData } from "@/components/SEOMetaTags";

// Load critical components immediately
import Header from "@/components/Header";
import MobileOptimizedHero from "@/components/MobileOptimizedHero";

// Aggressively lazy load everything else
const SocialProof = lazy(() => import("@/components/SocialProof"));
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
        
        {/* Load social proof immediately after hero */}
        <Suspense fallback={<div className="h-32 bg-muted animate-pulse" />}>
          <SocialProof />
        </Suspense>
        
        {/* Lazy load remaining sections with minimal fallbacks */}
        <Suspense fallback={<div className="h-64 bg-muted animate-pulse" />}>
          <ProblemSolution />
        </Suspense>
        
        <Suspense fallback={<div className="h-64 bg-muted animate-pulse" />}>
          <Features />
        </Suspense>
        
        <Suspense fallback={<div className="h-48 bg-muted animate-pulse" />}>
          <Industries />
        </Suspense>
        
        <Suspense fallback={<div className="h-64 bg-muted animate-pulse" />}>
          <Pricing />
        </Suspense>
        
        <Suspense fallback={<div className="h-48 bg-muted animate-pulse" />}>
          <Implementation />
        </Suspense>
        
        <Suspense fallback={<div className="h-48 bg-muted animate-pulse" />}>
          <FAQ />
        </Suspense>
      </main>
      
      <Suspense fallback={<div className="h-32 bg-muted animate-pulse" />}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default Index;

