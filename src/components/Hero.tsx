import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Blueprint3D from "@/components/3d/Blueprint3D";
import { ResponsiveContainer, ResponsiveGrid } from "@/components/layout/ResponsiveContainer";

const Hero = () => {
  return (
    <section className="bg-gradient-to-br from-background via-background to-secondary py-12 sm:py-20 lg:py-32">
      <ResponsiveContainer>
        <ResponsiveGrid cols={{ default: 1, lg: 2 }} gap="lg" className="items-center">
          {/* Content */}
          <div className="space-y-6 sm:space-y-8 text-center lg:text-left order-2 lg:order-1">
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-construction-dark leading-tight">
                Construction Management Built 
                <span className="block text-construction-orange">for Growing Teams</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0">
                Stop losing money on delays, change orders, and administrative overhead. Get real-time project visibility 
                without enterprise complexity. Job costing, scheduling, daily logs, OSHA reporting, and time tracking in one simple tool for U.S. contractors.
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
          
          {/* Interactive 3D Blueprint */}
          <div className="relative order-1 lg:order-2">
            <Blueprint3D />
          </div>
        </ResponsiveGrid>
      </ResponsiveContainer>
    </section>
  );
};

export default Hero;