import { useState, useRef, useEffect, ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Ruler, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { ResponsiveContainer, ResponsiveGrid } from "@/components/layout/ResponsiveContainer";

// Type for the 3D component props
interface Blueprint3DProps {
  isBuildMode: boolean;
  onToggleMode: () => void;
}

// Mobile fallback - dashboard mockup showing real-time metrics
const Hero3DFallback = () => (
  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-construction-orange/10 to-blue-500/10 rounded-2xl p-6">
    <div className="w-full max-w-sm rounded-2xl bg-card border shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
        <span className="font-semibold text-sm text-construction-dark dark:text-white">Westside Complex</span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          LIVE
        </span>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Budget</div>
            <div className="text-sm font-bold text-construction-dark dark:text-white">$125,000</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Spent</div>
            <div className="text-sm font-bold text-construction-dark dark:text-white">$89,200</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Margin</div>
            <div className="text-sm font-bold text-green-600">28.8%</div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Budget Utilization</span>
            <span>71.4%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: '71.4%' }} />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Hook to detect mobile - SSR safe
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024 || 'ontouchstart' in window);
    };
    checkMobile();
    // Only listen on resize if not touch device
    if (!('ontouchstart' in window)) {
      window.addEventListener('resize', checkMobile, { passive: true });
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  return isMobile;
};

// Hero badge rotator. Performance / customer-count claims removed pending
// substantiation (see src/config/claims.ts and FTC §5). Re-enable specific
// numbers only after marketing verifies them and updates CLAIMS.* with
// supporting evidence.
const badgeMessages = [
  "New: AI-Powered Estimation",
  "Built for Residential & Commercial Contractors",
  "Real-Time Job Costing",
  "Mobile-First Field Operations",
];

const Hero = () => {
  const [isBuildMode, setIsBuildMode] = useState(false);
  const [Blueprint3D, setBlueprint3D] = useState<ComponentType<Blueprint3DProps> | null>(null);
  const [badgeIndex, setBadgeIndex] = useState(0);
  const [badgeHovered, setBadgeHovered] = useState(false);
  const containerRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  const isMobile = useIsMobile();

  // Rotating badge messages
  useEffect(() => {
    if (badgeHovered) return;
    const interval = setInterval(() => {
      setBadgeIndex((prev) => (prev + 1) % badgeMessages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [badgeHovered]);

  // Conditionally load the Three.js 3D hero only on desktop (saves ~1.3MB on
  // mobile), only when reduced-motion is NOT requested, and only once the hero
  // is actually in view — so the heavy bundle never loads for users who skip
  // straight to /dashboard or who prefer reduced motion (US-216).
  useEffect(() => {
    if (isMobile) return; // Don't load 3D on mobile devices
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return; // Decorative animated 3D — honour reduced-motion, keep the static fallback
    }

    const load3D = () => {
      import("@/components/3d/PremiumBlueprint3D")
        .then((module) => {
          setBlueprint3D(() => module.default);
        })
        .catch(() => {
          // Silently fail - fallback will be shown
        });
    };

    // Defer to idle time so it never blocks the interactive period.
    const scheduleLoad = () => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(load3D, { timeout: 3000 });
      } else {
        setTimeout(load3D, 500);
      }
    };

    // Gate the fetch on the hero being visible (true async boundary).
    const el = containerRef.current;
    if (el && typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            observer.disconnect();
            scheduleLoad();
          }
        },
        { rootMargin: '200px' }
      );
      observer.observe(el);
      return () => observer.disconnect();
    }
    scheduleLoad();
  }, [isMobile]);

  // Defer GSAP loading - only load on desktop after first paint
  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Skip animations entirely on mobile or when the user prefers reduced
    // motion. In both cases we don't even import GSAP (so it never competes for
    // the interactive period) and we reveal the content immediately.
    if (isMobile || reduceMotion) {
      [badgeRef, headlineRef, textRef, ctaRef].forEach(ref => {
        if (ref.current) {
          ref.current.style.opacity = '1';
          ref.current.style.transform = 'none';
        }
      });
      return;
    }

    // Defer GSAP loading until after first paint on desktop
    const loadGSAP = async () => {
      // Wait for idle time or next frame
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(async () => {
          const [{ useGSAP }, gsapModule] = await Promise.all([
            import("@gsap/react"),
            import("gsap")
          ]);
          const gsap = gsapModule.default;

          // Run animations
          const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

          if (badgeRef.current) {
            tl.from(badgeRef.current, { y: -20, opacity: 0, duration: 0.6 });
          }
          if (headlineRef.current) {
            tl.from(headlineRef.current, { y: 30, opacity: 0, duration: 0.8 }, "-=0.4");
          }
          if (textRef.current) {
            tl.from(textRef.current, { y: 20, opacity: 0, duration: 0.6 }, "-=0.6");
          }
          if (ctaRef.current) {
            tl.from(ctaRef.current, { y: 20, opacity: 0, duration: 0.6 }, "-=0.4");
          }

          // Parallax effect - desktop only with passive listener
          const handleMouseMove = (e: MouseEvent) => {
            const { clientX, clientY } = e;
            const x = (clientX / window.innerWidth - 0.5) * 20;
            const y = (clientY / window.innerHeight - 0.5) * 20;
            gsap.to(".hero-blob", { x, y, duration: 2, ease: "power2.out" });
          };

          window.addEventListener("mousemove", handleMouseMove, { passive: true });
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(async () => {
          const gsapModule = await import("gsap");
          const gsap = gsapModule.default;

          const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
          if (badgeRef.current) tl.from(badgeRef.current, { y: -20, opacity: 0, duration: 0.6 });
          if (headlineRef.current) tl.from(headlineRef.current, { y: 30, opacity: 0, duration: 0.8 }, "-=0.4");
          if (textRef.current) tl.from(textRef.current, { y: 20, opacity: 0, duration: 0.6 }, "-=0.6");
          if (ctaRef.current) tl.from(ctaRef.current, { y: 20, opacity: 0, duration: 0.6 }, "-=0.4");
        }, 100);
      }
    };

    loadGSAP();
  }, [isMobile]);

  return (
    <section ref={containerRef} className="relative min-h-[90vh] flex items-center bg-background overflow-hidden">
      {/* Enhanced Background - decorative only */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.4] pointer-events-none" aria-hidden="true" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="hero-blob absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-construction-orange-light/10 rounded-full blur-[100px] mix-blend-multiply filter dark:mix-blend-normal dark:opacity-20" />
        <div className="hero-blob absolute top-[10%] -right-[10%] w-[50%] h-[50%] bg-construction-blue-light/10 rounded-full blur-[100px] mix-blend-multiply filter dark:mix-blend-normal dark:opacity-20" />
        <div className="hero-blob absolute -bottom-[20%] left-[20%] w-[40%] h-[40%] bg-gray-200/20 rounded-full blur-[100px] mix-blend-multiply filter dark:mix-blend-normal dark:opacity-10" />
      </div>

      <ResponsiveContainer className="relative z-10 py-12 sm:py-20 lg:py-0">
        <ResponsiveGrid cols={{ default: 1, lg: 2 }} gap="xl" className="items-center min-h-[600px]">
          {/* Content */}
          <div className="space-y-8 text-center lg:text-left order-2 lg:order-1">
            <div className="space-y-6">
              <div
                ref={badgeRef}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 backdrop-blur-sm"
                onMouseEnter={() => setBadgeHovered(true)}
                onMouseLeave={() => setBadgeHovered(false)}
              >
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-construction-orange opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-construction-orange"></span>
                </span>
                <span className="text-sm font-medium text-muted-foreground transition-opacity duration-300">
                  {badgeMessages[badgeIndex]}
                </span>
              </div>

              <h1 ref={headlineRef} className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-construction-dark dark:text-white leading-[1.1] tracking-tight">
                Know Your Real <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-construction-orange to-orange-600">
                  Profit Margins. Every Day.
                </span>
              </h1>

              <p ref={textRef} className="text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Catch $40K+ cost overruns weeks before they happen. The only financial-first platform built for contractors who refuse to fly blind.
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

            {/* Trust Signals */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-6 gap-y-2 justify-center lg:justify-start">
              {[
                "14-day free trial",
                "No credit card required",
                "Cancel anytime",
                "Setup in 30 minutes",
              ].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>

            {/* Social Proof */}
            <div className="pt-8 border-t border-border/50">
              <p className="text-sm text-muted-foreground mb-4">Trusted by 2,000+ innovative builders</p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                {["ACME Build", "ConstructCo", "UrbanSpaces", "NextLevel"].map((name) => (
                  <span
                    key={name}
                    className="bg-secondary/30 border border-border/50 rounded-lg px-4 py-2 font-bold tracking-wider uppercase text-sm hover:bg-secondary/50 transition-colors"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive 3D Experience - Only loads on desktop to save ~1.3MB on mobile */}
          <div className="relative order-1 lg:order-2 h-[400px] sm:h-[500px] lg:h-[700px] w-full">
            <div className="absolute inset-0 bg-gradient-to-tr from-construction-orange/5 to-blue-500/5 rounded-[2rem] transform rotate-3 scale-95 blur-2xl -z-10" />
            {Blueprint3D ? (
              <Blueprint3D isBuildMode={isBuildMode} onToggleMode={() => setIsBuildMode(!isBuildMode)} />
            ) : (
              <Hero3DFallback />
            )}
          </div>
        </ResponsiveGrid>
      </ResponsiveContainer>
    </section>
  );
};

export default Hero;