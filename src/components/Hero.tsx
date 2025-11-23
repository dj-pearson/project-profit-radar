import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Ruler } from "lucide-react";
import { Link } from "react-router-dom";
import PremiumBlueprint3D from "@/components/3d/PremiumBlueprint3D";
import { ResponsiveContainer, ResponsiveGrid } from "@/components/layout/ResponsiveContainer";

const Hero = () => {
  const [isBuildMode, setIsBuildMode] = useState(false);

  return (
    <section className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-background via-background to-secondary/30 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-construction-orange/5 rounded-full blur-3xl" />
        <div className="absolute top-[20%] right-[0%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <ResponsiveContainer className="relative z-10 py-12 sm:py-20 lg:py-0">
        <ResponsiveGrid cols={{ default: 1, lg: 2 }} gap="xl" className="items-center min-h-[600px]">
          {/* Content */}
          <div className="space-y-8 text-center lg:text-left order-2 lg:order-1">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 backdrop-blur-sm">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-construction-orange opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-construction-orange"></span>
                </span>
                <span className="text-sm font-medium text-muted-foreground">New: AI-Powered Estimation</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-construction-dark leading-[1.1] tracking-tight">
                Build Smarter. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-construction-orange to-orange-600">
                  Profit Faster.
                </span>
              </h1>

              <p className="text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Stop guessing your margins. Track every dollar in real-time with the only financial-first platform built for modern contractors.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="xl" className="group text-lg px-8" asChild>
                <Link to="/auth">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>

              <Button
                variant="outline"
                size="xl"
                className="group text-lg px-8"
                onClick={() => setIsBuildMode(!isBuildMode)}
              >
                {isBuildMode ? (
                  <>
                    <Play className="mr-2 h-5 w-5" />
                    See Render
                  </>
                ) : (
                  <>
                    <Ruler className="mr-2 h-5 w-5" />
                    View Blueprint
                  </>
                )}
              </Button>
            </div>

            {/* Social Proof */}
            <div className="pt-8 border-t border-border/50">
              <p className="text-sm text-muted-foreground mb-4">Trusted by 2,000+ innovative builders</p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-x-8 gap-y-4 grayscale opacity-60">
                {/* Simple text placeholders for logos to keep it clean */}
                <span className="font-bold text-lg">ACME Build</span>
                <span className="font-bold text-lg">ConstructCo</span>
                <span className="font-bold text-lg">UrbanSpaces</span>
                <span className="font-bold text-lg">NextLevel</span>
              </div>
            </div>
          </div>

          {/* Interactive 3D Experience */}
          <div className="relative order-1 lg:order-2 h-[400px] sm:h-[500px] lg:h-[700px] w-full">
            <div className="absolute inset-0 bg-gradient-to-tr from-construction-orange/10 to-blue-500/10 rounded-[2rem] transform rotate-3 scale-95 blur-2xl -z-10" />
            <PremiumBlueprint3D isBuildMode={isBuildMode} onToggleMode={() => setIsBuildMode(!isBuildMode)} />
          </div>
        </ResponsiveGrid>
      </ResponsiveContainer>
    </section>
  );
};

export default Hero;