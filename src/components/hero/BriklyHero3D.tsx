import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Float, OrbitControls } from '@react-three/drei';
import { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import * as THREE from 'three';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, MousePointer2, Move } from 'lucide-react';
import { AmbientParticles } from './BackgroundEffects';

// Interface for shared state
interface AnimationState {
  progress: number;
  setProgress: (p: number) => void;
}

// Component to display the live cost based on shared progress
const CostCounter = ({ progress }: { progress: number }) => {
  const maxCost = 5240000; // $5.24M Project Value
  const remaining = 1 - progress;
  const currentCost = Math.floor(maxCost * remaining);

  return (
    <div className="glass-panel-dark rounded-xl p-6 backdrop-blur-xl border border-slate-700/50 bg-slate-900/60">
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Live Project Value</p>
      <div className="text-4xl sm:text-5xl font-bold text-white font-mono tracking-tight tabular-nums">
        {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0
        }).format(currentCost)}
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-green-400">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span>Interactive Visualization</span>
      </div>
    </div>
  );
};

// Building Blocks Component - Controlled via prop
function ConstructionBlocks({ progress }: { progress: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = 3000; 
  const gridSize = Math.ceil(Math.pow(count, 1/3));

  // BuildDesk brand colors
  const colors = useMemo(() => [
    new THREE.Color('#1A2332'), // Navy
    new THREE.Color('#516170'), // Steel gray
    new THREE.Color('#FF6B35'), // Safety orange
    new THREE.Color('#E3F2FD'), // Light blue accent
  ], []);

  // Generate initial data (colors and grid positions)
  const { colorArray, initialPositions } = useMemo(() => {
    const colorsArr = new Float32Array(count * 3);
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      // Colors
      const color = colors[Math.floor(Math.random() * colors.length)];
      colorsArr[i * 3] = color.r;
      colorsArr[i * 3 + 1] = color.g;
      colorsArr[i * 3 + 2] = color.b;

      // Grid Position (Assembled State)
      // Center the grid
      const x = (i % gridSize) - gridSize / 2;
      const y = Math.floor(i / gridSize) % gridSize - gridSize / 2;
      const z = Math.floor(i / (gridSize * gridSize)) - gridSize / 2;
      
      positions[i * 3] = x * 0.6;
      positions[i * 3 + 1] = y * 0.6;
      positions[i * 3 + 2] = z * 0.6;
    }
    return { colorArray: colorsArr, initialPositions: positions };
  }, [count, gridSize, colors]);

  useFrame((state) => {
    if (!meshRef.current) return;

    // gentle rotation of the whole building
    const baseRotation = state.clock.elapsedTime * 0.1;
    meshRef.current.rotation.y = baseRotation;

    for (let i = 0; i < count; i++) {
      const ix = initialPositions[i * 3];
      const iy = initialPositions[i * 3 + 1];
      const iz = initialPositions[i * 3 + 2];

      // Calculate normalized height of this block (0 bottom, 1 top)
      const gridHeight = gridSize * 0.6;
      const normalizedY = (iy + gridHeight/2) / gridHeight; // 0 to 1

      // Dismantle Logic:
      // Activation threshold: when does this block start moving?
      const startThreshold = (1 - normalizedY) * 0.6;
      
      let activeDist = 0;
      let activeScale = 0.25; // Default scale

      if (progress > startThreshold) {
        // Calculate how far past the threshold we are
        const moveProgress = (progress - startThreshold) / (1 - startThreshold);
        // Apply easing
        const ease = moveProgress * moveProgress; // Quadratic ease in
        
        // Move up and out
        activeDist = ease * 30; // Fly up 30 units
        activeScale = Math.max(0, 0.25 - ease * 0.25); // Shrink to 0
      }

      // Set position
      // Assembled position + vertical lift + slight outward expansion
      dummy.position.set(
        ix * (1 + activeDist * 0.1), // Slight expansion X
        iy + activeDist,             // Lift Y
        iz * (1 + activeDist * 0.1)  // Slight expansion Z
      );

      // Rotate as they fly away
      dummy.rotation.set(
        activeDist * 0.2,
        activeDist * 0.1,
        activeDist * 0.3
      );

      dummy.scale.setScalar(activeScale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.4, 0.4, 0.4]} />
      <meshStandardMaterial
        metalness={0.3}
        roughness={0.4}
      />
      <instancedBufferAttribute
        attach="attributes-color"
        args={[colorArray, 3]}
      />
    </instancedMesh>
  );
}

// Glass Accent Element
function GlassAccent({ progress }: { progress: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
      meshRef.current.rotation.y += 0.01;
      
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      if (material) {
        material.opacity = Math.max(0, 0.6 - progress);
      }
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh ref={meshRef} position={[0, 0, -2]} scale={1.5}>
        <torusGeometry args={[1, 0.3, 64, 32]} />
        <meshStandardMaterial
          color="#E3F2FD"
          transparent
          opacity={0.6}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
    </Float>
  );
}

// Separate content component
function HeroContent({ progress, setProgress }: { progress: number, setProgress: (p: number) => void }) {
  return (
    <div className="relative z-10 h-full flex flex-col justify-center">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Column: Text Content */}
        <div className="lg:col-span-7 pointer-events-none">
          {/* Glass morphism card - Pointer events enabled for children */}
          <div className="glass-panel-dark rounded-2xl p-8 sm:p-12 shadow-2xl backdrop-blur-md pointer-events-auto">
            <div className="border-l-4 border-construction-orange pl-4 sm:pl-6">
              <p className="text-construction-orange font-semibold text-xs sm:text-sm uppercase tracking-wide mb-3">
                For Commercial Contractors
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Real-Time Job Costing.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-300">
                  Zero Spreadsheets.
                </span>
              </h1>
              <p className="text-xl sm:text-2xl text-slate-300 mb-8 leading-relaxed">
                BuildDesk gives you live financial intelligence on every project.
                Know your margins before the invoice hits.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Button
                  variant="hero"
                  size="lg"
                  className="group w-full sm:w-auto"
                  asChild
                >
                  <Link to="/auth">
                    Request Demo
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto bg-slate-800/80 backdrop-blur-xl border-slate-600/50 text-white hover:bg-slate-700/80"
                  asChild
                >
                  <Link to="/roi-calculator">
                    Watch Video
                  </Link>
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  SOC 2 Certified
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  No Credit Card Required
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Cost Counter & Controls */}
        <div className="lg:col-span-5 flex flex-col items-center lg:items-end pointer-events-auto gap-6">
           <div className="transform lg:translate-y-12 transition-all duration-500 hover:scale-105 w-full max-w-xs">
             <CostCounter progress={progress} />
           </div>

           {/* Manual Controls */}
           <div className="glass-panel-dark p-4 rounded-xl w-full max-w-xs backdrop-blur-md border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Dismantle Control</span>
                <MousePointer2 className="w-4 h-4 text-construction-orange" />
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={progress}
                onChange={(e) => setProgress(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-construction-orange"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>Assembled</span>
                <span>Dismantled</span>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}

// Main Hero Component
export default function BuildDeskHero3D() {
  const [hasWebGL, setHasWebGL] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLElement>(null);
  
  // Shared progress state (0 = assembled, 1 = dismantled)
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Scroll hijacking logic - only when mouse is over the section
  useEffect(() => {
    const container = containerRef.current;
    if (!container || isMobile) return; // Disable on mobile to prevent scroll lock issues

    let isMouseOver = false;

    const handleMouseEnter = () => {
      isMouseOver = true;
      document.body.style.cursor = 'grab';
    };

    const handleMouseLeave = () => {
      isMouseOver = false;
      document.body.style.cursor = 'default';
    };

    const handleWheel = (e: WheelEvent) => {
      // Only hijack scroll if mouse is over the container
      if (!isMouseOver) {
        return;
      }

      
      // preventDefault stops the page from scrolling
      e.preventDefault();

      // Sensitivity factor - adjust to make animation faster/slower
      const sensitivity = 0.0015;
      
      // DeltaY > 0 means scrolling down -> Dismantle (Increase progress)
      // DeltaY < 0 means scrolling up -> Assemble (Decrease progress)
      const delta = e.deltaY;
      
      setProgress(current => {
        const newProgress = current + (delta * sensitivity);
        return Math.min(Math.max(newProgress, 0), 1);
      });
    };

    // Listen to mouse enter/leave
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    // We must use { passive: false } to be able to preventDefault
    // Attach to window to catch all scroll events
    window.addEventListener('wheel', handleWheel, { passive: false });


    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('wheel', handleWheel);
      document.body.style.cursor = 'default';
    };
  }, [isMobile]);

  // Static fallback
  if (!hasWebGL || prefersReducedMotion) {
    return (
      <section className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="max-w-5xl px-4 sm:px-8 w-full">
            <HeroContent progress={0} setProgress={() => {}} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section 
      ref={containerRef}
      className="relative h-screen overflow-hidden" 
      id="hero-section"
    >
      <Canvas
        className="absolute inset-0"
        onCreated={({ gl }) => {
          if (!gl) setHasWebGL(false);
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance'
        }}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 12]} fov={75} />
        
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          autoRotate={false}
          maxPolarAngle={Math.PI / 1.5}
          minPolarAngle={Math.PI / 3}
        />

        <Suspense fallback={null}>
          <ConstructionBlocks progress={progress} />
          {!isMobile && <GlassAccent progress={progress} />}
          <AmbientParticles count={isMobile ? 500 : 2000} />
          <Environment preset="city" />
        </Suspense>

        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} color="#FF6B35" />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#E3F2FD" />
      </Canvas>

      {/* HTML Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="max-w-7xl px-4 sm:px-8 w-full h-full pointer-events-auto">
          <HeroContent progress={progress} setProgress={setProgress} />
        </div>
      </div>
      
      {/* Scroll Hint */}
      <div className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 transition-opacity duration-500 ${progress > 0.1 ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex flex-col items-center gap-2 animate-bounce text-slate-400">
          <span className="text-xs uppercase tracking-widest">Scroll to Dismantle</span>
          <Move className="w-5 h-5" />
        </div>
      </div>
    </section>
  );
}
