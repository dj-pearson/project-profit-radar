import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Ruler } from "lucide-react";
import { Link } from "react-router-dom";
import PremiumBlueprint3D from "@/components/3d/PremiumBlueprint3D";
import { ResponsiveContainer, ResponsiveGrid } from "@/components/layout/ResponsiveContainer";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

const Hero = () => {
  const [isBuildMode, setIsBuildMode] = useState(false);
  const containerRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.from(badgeRef.current, {
      y: -20,
      opacity: 0,
      duration: 0.6,
    })
    .from(headlineRef.current, {
      y: 30,
      opacity: 0,
      duration: 0.8,
    }, "-=0.4")
    .from(textRef.current, {
      y: 20,
      opacity: 0,
      duration: 0.6,
    }, "-=0.6")
    .from(ctaRef.current, {
      y: 20,
      opacity: 0,
      duration: 0.6,
    }, "-=0.4");

    // Parallax effect on mouse move
    const handleMouseMove = (e: MouseEvent) => {
        const { clientX, clientY } = e;
        const x = (clientX / window.innerWidth - 0.5) * 20;
        const y = (clientY / window.innerHeight - 0.5) * 20;

        gsap.to(".hero-blob", {
            x: x,
            y: y,
            duration: 2,
            ease: "power2.out",
        });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);

  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="relative min-h-[90vh] flex items-center bg-background overflow-hidden">
      {/* Enhanced Background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.4] pointer-events-none" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="hero-blob absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-construction-orange-light/10 rounded-full blur-[100px] mix-blend-multiply filter dark:mix-blend-normal dark:opacity-20" />
        <div className="hero-blob absolute top-[10%] -right-[10%] w-[50%] h-[50%] bg-construction-blue-light/10 rounded-full blur-[100px] mix-blend-multiply filter dark:mix-blend-normal dark:opacity-20" />
        <div className="hero-blob absolute -bottom-[20%] left-[20%] w-[40%] h-[40%] bg-gray-200/20 rounded-full blur-[100px] mix-blend-multiply filter dark:mix-blend-normal dark:opacity-10" />
      </div>

      <ResponsiveContainer className="relative z-10 py-12 sm:py-20 lg:py-0">
        <ResponsiveGrid cols={{ default: 1, lg: 2 }} gap="xl" className="items-center min-h-[600px]">
          {/* Content */}
          <div className="space-y-8 text-center lg:text-left order-2 lg:order-1">
            <div className="space-y-6">
              <div ref={badgeRef} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 backdrop-blur-sm">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-construction-orange opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-construction-orange"></span>
                </span>
                <span className="text-sm font-medium text-muted-foreground">New: AI-Powered Estimation</span>
              </div>

              <h1 ref={headlineRef} className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-construction-dark dark:text-white leading-[1.1] tracking-tight">
                Build Smarter. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-construction-orange to-orange-600">
                  Profit Faster.
                </span>
              </h1>

              <p ref={textRef} className="text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Stop guessing your margins. Track every dollar in real-time with the only financial-first platform built for modern contractors.
              </p>
            </div>

            {/* CTAs */}
            <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="xl" className="group text-lg px-8 shadow-construction hover:shadow-lg transition-all duration-300" asChild>
                <Link to="/auth">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>

              <Button
                variant="outline"
                size="xl"
                className="group text-lg px-8 bg-white/50 backdrop-blur-sm border-border/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40"
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
          <div className="relative order-1 lg:order-2 h-[500px] lg:h-[700px] w-full">
            <div className="absolute inset-0 bg-gradient-to-tr from-construction-orange/5 to-blue-500/5 rounded-[2rem] transform rotate-3 scale-95 blur-2xl -z-10" />
            <PremiumBlueprint3D isBuildMode={isBuildMode} onToggleMode={() => setIsBuildMode(!isBuildMode)} />
          </div>
        </ResponsiveGrid>
      </ResponsiveContainer>
    </section>
  );
};

export default Hero;