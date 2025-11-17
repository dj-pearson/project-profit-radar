/**
 * Hero3D - Enhanced 3D Hero Component with Building Blocks Animation
 *
 * This is an alternative to the default Hero component that uses a more
 * sophisticated 3D animation with building blocks and glassmorphism effects.
 *
 * To use this instead of the default Hero:
 * 1. In src/pages/Index.tsx, change:
 *    import Hero from "@/components/Hero";
 *    to:
 *    import Hero from "@/components/Hero3D";
 *
 * Features:
 * - 3D building blocks animation (3000 instances)
 * - Glassmorphism UI elements
 * - Ambient particles effect
 * - Mobile-optimized (reduced complexity on mobile)
 * - Respects prefers-reduced-motion
 * - WebGL fallback to static hero
 */

import BuildDeskHero3D from './hero/BuildDeskHero3D';

const Hero3D = () => {
  return <BuildDeskHero3D />;
};

export default Hero3D;
