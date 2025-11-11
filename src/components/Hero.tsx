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
                Know Your Profitability
                <span className="block text-construction-orange">in Real-Time, Not at Tax Time</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0">
                Financial command center for construction companies. See every project's profit margin instantly,
                predict cost overruns weeks early, and close your books in 5 minutes instead of 3 days.
                <span className="block mt-3 font-semibold text-construction-orange">
                  ✓ Real-time job costing • ✓ Predictive cost alerts • ✓ 5-minute month-end close
                </span>
                <span className="block mt-2 text-base">
                  Join 500+ contractors who eliminated financial surprises and improved margins by 4%+
                </span>
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
              ✓ 14-day free trial • ✓ No credit card required • ✓ See real-time profit margins from day one
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