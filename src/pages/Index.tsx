import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SocialProof from "@/components/SocialProof";
import ProblemSolution from "@/components/ProblemSolution";
import Features from "@/components/Features";
import Industries from "@/components/Industries";
import Pricing from "@/components/Pricing";
import Implementation from "@/components/Implementation";
import FAQ from "@/components/FAQ";
import BlogSection from "@/components/BlogSection";
import Footer from "@/components/Footer";
import { SkipLink } from "@/components/accessibility/AccessibilityUtils";
import { SEOMetaTags, constructionSoftwareStructuredData, organizationStructuredData } from "@/components/SEOMetaTags";

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
        <ProblemSolution />
        <Features />
        <Industries />
        <Pricing />
        <Implementation />
        <FAQ />
        <BlogSection />
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;

