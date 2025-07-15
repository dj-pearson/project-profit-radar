import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ResponsiveContainer, ResponsiveGrid } from "@/components/layout/ResponsiveContainer";

// Lazy load the heavy Interactive Dashboard component
const InteractiveDashboard = lazy(() => import("@/components/InteractiveDashboard"));

const Hero = () => {
  return (
    <section className="bg-gradient-to-br from-background via-background to-secondary py-12 sm:py-20 lg:py-32">
      <ResponsiveContainer>
        <ResponsiveGrid cols={{ default: 1, lg: 2 }} gap="lg" className="items-center">
          {/* Content */}
          <div className="space-y-6 sm:space-y-8 text-center lg:text-left order-2 lg:order-1">
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-construction-dark leading-tight">
                Construction Management Software 
                <span className="block text-construction-orange">for Small & Medium Contractors</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0">
                Stop losing money on delays and budget overruns. Get real-time job costing, 
                mobile field management, and OSHA compliance without enterprise complexity. 
                <span className="block mt-2 font-semibold text-construction-orange">Join 500+ contractors saving $50K+ annually.</span>
              </p>
            </div>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button variant="hero" className="group w-full sm:w-auto" asChild>
                <Link to="/auth">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
                <Link to="/roi-calculator">
                  Calculate ROI
                </Link>
              </Button>
            </div>
            
            {/* Trial Info */}
            <p className="text-sm text-muted-foreground">
              ✓ 14-day free trial • ✓ No credit card required • ✓ Setup in under 30 minutes
            </p>
          </div>
          
          {/* Interactive Dashboard */}
          <div className="relative order-1 lg:order-2">
            <Suspense fallback={
              <div className="w-full max-w-4xl mx-auto h-96 bg-card rounded-lg border animate-pulse flex items-center justify-center">
                <div className="text-muted-foreground">Loading dashboard demo...</div>
              </div>
            }>
              <InteractiveDashboard />
            </Suspense>
          </div>
        </ResponsiveGrid>
      </ResponsiveContainer>
    </section>
  );
};

export default Hero;