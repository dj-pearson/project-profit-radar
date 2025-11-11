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
              <div className="inline-block px-4 py-2 bg-construction-orange/10 rounded-full mb-4">
                <span className="text-sm font-semibold text-construction-orange">Financial Intelligence Platform</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-construction-dark leading-tight">
                Know Your Profit on Every Job
                <span className="block text-construction-orange">Before It's Too Late</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0">
                The only construction platform with <strong className="text-construction-dark">predictive financial intelligence</strong> that warns you weeks before problems hit your bottom line.
                Real-time job costing, AI-powered cost predictions, and automated month-end close in 5 minutes.
                <span className="block mt-3 font-semibold text-construction-orange">Modern architecture. Predictive insights. 2-3 year competitive advantage.</span>
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