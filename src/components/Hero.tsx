import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import InteractiveDashboard from "@/components/InteractiveDashboard";

const Hero = () => {
  return (
    <section className="bg-gradient-to-br from-background via-background to-secondary py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold text-construction-dark leading-tight">
                Construction Management 
                <span className="block text-construction-orange">Built for Growing Teams</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-xl">
                Stop losing money on delays, change orders, and administrative overhead. 
                Get real-time project visibility without enterprise complexity.
              </p>
            </div>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" className="group" asChild>
                <Link to="/auth">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
            
            {/* Trial Info */}
            <p className="text-sm text-muted-foreground">
              ✓ 14-day free trial • ✓ No credit card required • ✓ Setup in under 30 minutes
            </p>
          </div>
          
          {/* Interactive Dashboard */}
          <div className="relative">
            <InteractiveDashboard />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;