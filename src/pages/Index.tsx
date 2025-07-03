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

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
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
