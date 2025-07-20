import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ResponsiveContainer, ResponsiveGrid } from "@/components/layout/ResponsiveContainer";
import { lazy, Suspense } from "react";

// Lazy load heavy components for mobile
const InteractiveDashboard = lazy(() => import("@/components/InteractiveDashboard"));
const SimpleMobileDashboard = lazy(() => import("@/components/SimpleMobileDashboard"));

const MobileOptimizedHero = () => {
  return (
    <section className="critical-hero relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-construction-orange/20 to-construction-blue/20 opacity-20" />
      
      <ResponsiveContainer className="relative py-20 lg:py-32">
        <ResponsiveGrid className="items-center gap-12 lg:gap-20">
          <div className="space-y-8 text-center lg:text-left">
            <div className="space-y-4">
              <h1 className="critical-text-primary text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Construction Management{" "}
                <span className="block text-white">Built for Growing Teams</span>
              </h1>
              <p className="critical-text-primary text-lg sm:text-xl lg:text-xl max-w-2xl opacity-90">
                Stop losing money on delays, change orders, and administrative overhead. 
                Get real-time project visibility without enterprise complexity.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link to="/get-started">
                <Button size="lg" className="critical-button group w-full sm:w-auto">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/demo">
                <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white/10 text-white border-white/20 hover:bg-white/20">
                  Watch 2-Minute Demo
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center justify-center lg:justify-start space-x-6 text-sm text-white/80">
              <span>✓ 14-day free trial</span>
              <span>✓ No credit card required</span>
              <span>✓ Setup in 24 hours</span>
            </div>
          </div>
          
          <div className="relative">
            <Suspense fallback={
              <div className="aspect-[4/3] bg-white/10 rounded-lg animate-pulse" />
            }>
              <div className="hidden lg:block">
                <InteractiveDashboard />
              </div>
              <div className="block lg:hidden">
                <SimpleMobileDashboard />
              </div>
            </Suspense>
          </div>
        </ResponsiveGrid>
      </ResponsiveContainer>
    </section>
  );
};

export default MobileOptimizedHero;