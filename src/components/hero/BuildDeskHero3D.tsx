import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Float } from '@react-three/drei';
import { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import * as THREE from 'three';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { AmbientParticles } from './BackgroundEffects';

// Building Blocks Component - 5000 instances in single draw call
function ConstructionBlocks() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = new THREE.Object3D();
  const count = 3000; // Reduced for better performance

  // BuildDesk brand colors
  const colors = useMemo(() => [
    new THREE.Color('#1A2332'), // Navy
    new THREE.Color('#516170'), // Steel gray
    new THREE.Color('#FF6B35'), // Safety orange (construction-orange)
    new THREE.Color('#E3F2FD'), // Light blue accent
  ], []);

  const colorArray = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      arr[i * 3] = color.r;
      arr[i * 3 + 1] = color.g;
      arr[i * 3 + 2] = color.b;
    }
    return arr;
  }, [colors, count]);

  useEffect(() => {
    if (!meshRef.current) return;

    // Initial scattered positions
    for (let i = 0; i < count; i++) {
      tempObject.position.set(
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50
      );
      tempObject.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      tempObject.scale.setScalar(Math.random() * 0.3 + 0.2);
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;

    // Animate to organized structure over 2 seconds
    const timeout = setTimeout(() => {
      const gridSize = Math.ceil(Math.pow(count, 1/3));
      for (let i = 0; i < count; i++) {
        const x = (i % gridSize) - gridSize / 2;
        const y = Math.floor(i / gridSize) % gridSize - gridSize / 2;
        const z = Math.floor(i / (gridSize * gridSize)) - gridSize / 2;

        tempObject.position.set(x * 0.6, y * 0.6, z * 0.6);
        tempObject.rotation.set(0, 0, 0);
        tempObject.scale.setScalar(0.25);
        tempObject.updateMatrix();

        // Stagger animation based on index
        const delay = (i / count) * 500;
        setTimeout(() => {
          if (meshRef.current) {
            meshRef.current.setMatrixAt(i, tempObject.matrix);
            meshRef.current.instanceMatrix.needsUpdate = true;
          }
        }, delay);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [count]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
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

// Glass Accent Element - subtle premium touch (disabled on mobile for performance)
function GlassAccent() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
      meshRef.current.rotation.y += 0.01;
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

// Loading fallback
function LoadingState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-white text-xl animate-pulse">Initializing BuildDesk...</div>
    </div>
  );
}

// Separate content component for reusability
function HeroContent() {
  return (
    <div className="relative z-10">
      {/* Glass morphism card */}
      <div className="glass-panel-dark rounded-2xl p-8 sm:p-12 shadow-2xl">
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
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              2,000+ Contractors
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

  // Static fallback for no WebGL or reduced motion
  if (!hasWebGL || prefersReducedMotion) {
    return (
      <section className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="max-w-5xl px-4 sm:px-8 w-full">
            <HeroContent />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen overflow-hidden">
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

        <Suspense fallback={null}>
          <ConstructionBlocks />
          {!isMobile && <GlassAccent />}
          <AmbientParticles count={isMobile ? 500 : 2000} />
          <Environment preset="city" />
        </Suspense>

        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} color="#FF6B35" />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#E3F2FD" />
      </Canvas>

      {/* HTML Overlay - Accessible, SEO-friendly */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="max-w-5xl px-4 sm:px-8 w-full pointer-events-auto">
          <HeroContent />
        </div>
      </div>
    </section>
  );
}
