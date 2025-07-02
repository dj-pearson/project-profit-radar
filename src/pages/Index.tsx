import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SocialProof from "@/components/SocialProof";
import ProblemSolution from "@/components/ProblemSolution";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import Implementation from "@/components/Implementation";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <SocialProof />
      <ProblemSolution />
      <Features />
      <Pricing />
      <Implementation />
      <Footer />
    </div>
  );
};

export default Index;
