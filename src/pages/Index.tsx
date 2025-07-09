import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SocialProof from "@/components/SocialProof";
import ProblemSolution from "@/components/ProblemSolution";
import Features from "@/components/Features";
import Industries from "@/components/Industries";
import Pricing from "@/components/Pricing";
import Implementation from "@/components/Implementation";
import BlogSection from "@/components/BlogSection";
import Footer from "@/components/Footer";
import { SkipLink } from "@/components/accessibility/AccessibilityUtils";
import { SEOMetaTags, constructionSoftwareStructuredData, organizationStructuredData } from "@/components/SEOMetaTags";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title="BuildDesk - Construction Management Platform"
        description="Construction management platform built for growing teams. Real-time project visibility without enterprise complexity. Start your free trial today."
        keywords={['construction management software', 'project management', 'contractor software', 'construction app', 'building management', 'construction project tracking']}
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
        <BlogSection />
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
