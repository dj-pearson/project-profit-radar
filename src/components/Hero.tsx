import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import heroImage from "../assets/hero-dashboard.jpg";

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
              <Button variant="hero" className="group">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" className="text-construction-blue border-construction-blue hover:bg-construction-blue hover:text-white">
                <Play className="mr-2 h-4 w-4" />
                Watch 2-Minute Demo
              </Button>
            </div>
            
            {/* Trial Info */}
            <p className="text-sm text-muted-foreground">
              ✓ 14-day free trial • ✓ No credit card required • ✓ Setup in under 30 minutes
            </p>
          </div>
          
          {/* Hero Image */}
          <div className="relative">
            <div className="relative z-10">
              <img 
                src={heroImage} 
                alt="Construction management dashboard showing project timelines and cost tracking" 
                className="rounded-lg shadow-2xl"
              />
            </div>
            {/* Background decoration */}
            <div className="absolute -top-4 -right-4 w-full h-full bg-construction-orange/20 rounded-lg -z-10"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;