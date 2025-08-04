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
const Index = () => {

  return (
    <div className="min-h-screen bg-background">
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
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;

