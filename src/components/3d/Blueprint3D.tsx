import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Group, Vector3, BufferGeometry, BoxGeometry, MeshStandardMaterial } from 'three';
import { useTouchGestures } from '@/hooks/useTouchGestures';

interface ConstructionPhase {
  name: string;
  progress: number;
  color: string;
}

const phases: ConstructionPhase[] = [
  { name: 'Foundation', progress: 0.2, color: '#8B5CF6' },
  { name: 'Structure', progress: 0.5, color: '#06B6D4' },
  { name: 'Walls', progress: 0.7, color: '#10B981' },
  { name: 'Finishing', progress: 1.0, color: '#F59E0B' }
];

const BuildingModel: React.FC<{ progress: number; wireframe: boolean }> = ({ progress, wireframe }) => {
  const groupRef = useRef<Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  const foundationHeight = Math.min(progress * 5, 1);
  const structureHeight = Math.max(0, Math.min((progress - 0.2) * 5, 2));
  const wallsHeight = Math.max(0, Math.min((progress - 0.5) * 5, 2));
  const roofHeight = Math.max(0, Math.min((progress - 0.7) * 5, 0.5));

  // Material configurations
  const foundationMaterial = wireframe 
    ? { color: "#8B5CF6", wireframe: true, transparent: true, opacity: 0.8 }
    : { color: "#6B7280", roughness: 0.9, metalness: 0.1 }; // Concrete gray

  const structureMaterial = wireframe
    ? { color: "#06B6D4", wireframe: true, transparent: true, opacity: 0.9 }
    : { color: "#92400E", roughness: 0.8, metalness: 0.2 }; // Steel/wood brown

  const wallMaterial = wireframe
    ? { color: "#10B981", wireframe: true, transparent: true, opacity: 0.8 }
    : { color: "#DC2626", roughness: 0.7, metalness: 0.1 }; // Brick red

  const roofMaterial = wireframe
    ? { color: "#F59E0B", wireframe: true, transparent: true, opacity: 0.9 }
    : { color: "#374151", roughness: 0.6, metalness: 0.3 }; // Dark gray shingles

  return (
    <group ref={groupRef}>
      {/* Foundation */}
      {foundationHeight > 0 && (
        <mesh position={[0, foundationHeight / 2 - 0.5, 0]}>
          <boxGeometry args={[4, foundationHeight, 3]} />
          <meshStandardMaterial {...foundationMaterial} />
        </mesh>
      )}

      {/* Structure Pillars */}
      {structureHeight > 0 && (
        <>
          <mesh position={[-1.5, structureHeight / 2 + 0.5, -1]}>
            <boxGeometry args={[0.3, structureHeight, 0.3]} />
            <meshStandardMaterial {...structureMaterial} />
          </mesh>
          <mesh position={[1.5, structureHeight / 2 + 0.5, -1]}>
            <boxGeometry args={[0.3, structureHeight, 0.3]} />
            <meshStandardMaterial {...structureMaterial} />
          </mesh>
          <mesh position={[-1.5, structureHeight / 2 + 0.5, 1]}>
            <boxGeometry args={[0.3, structureHeight, 0.3]} />
            <meshStandardMaterial {...structureMaterial} />
          </mesh>
          <mesh position={[1.5, structureHeight / 2 + 0.5, 1]}>
            <boxGeometry args={[0.3, structureHeight, 0.3]} />
            <meshStandardMaterial {...structureMaterial} />
          </mesh>
        </>
      )}

      {/* Walls */}
      {wallsHeight > 0 && (
        <>
          {/* Front wall with door opening */}
          <mesh position={[-0.8, wallsHeight / 2 + 0.5, -1.4]}>
            <boxGeometry args={[1.5, wallsHeight, 0.2]} />
            <meshStandardMaterial {...wallMaterial} />
          </mesh>
          <mesh position={[0.8, wallsHeight / 2 + 0.5, -1.4]}>
            <boxGeometry args={[1.5, wallsHeight, 0.2]} />
            <meshStandardMaterial {...wallMaterial} />
          </mesh>
          <mesh position={[0, wallsHeight * 0.8 + 0.5, -1.4]}>
            <boxGeometry args={[0.8, wallsHeight * 0.4, 0.2]} />
            <meshStandardMaterial {...wallMaterial} />
          </mesh>
          
          {/* Back wall */}
          <mesh position={[0, wallsHeight / 2 + 0.5, 1.4]}>
            <boxGeometry args={[3.7, wallsHeight, 0.2]} />
            <meshStandardMaterial {...wallMaterial} />
          </mesh>
          
          {/* Side wall with window opening */}
          <mesh position={[-1.9, wallsHeight / 2 + 0.5, 0]}>
            <boxGeometry args={[0.2, wallsHeight, 2.6]} />
            <meshStandardMaterial {...wallMaterial} />
          </mesh>
          
          {/* Right side wall - open for visibility */}
        </>
      )}

      {/* Windows (only in realistic mode) */}
      {wallsHeight > 0 && !wireframe && (
        <>
          {/* Front door */}
          <mesh position={[0, 0.9, -1.3]}>
            <boxGeometry args={[0.8, 1.8, 0.1]} />
            <meshStandardMaterial color="#8B4513" roughness={0.8} />
          </mesh>
          
          {/* Side window */}
          <mesh position={[-1.8, 1.2, 0]}>
            <boxGeometry args={[0.1, 0.8, 1.0]} />
            <meshStandardMaterial color="#87CEEB" transparent opacity={0.7} />
          </mesh>
        </>
      )}

      {/* Enhanced Roof with proper slope */}
      {roofHeight > 0 && (
        <>
          {/* Main roof */}
          <mesh position={[0, 2.7, 0]} rotation={[0, 0, 0]}>
            <boxGeometry args={[4.4, 0.3, 3.4]} />
            <meshStandardMaterial {...roofMaterial} />
          </mesh>
          
          {/* Roof details (only in realistic mode) */}
          {!wireframe && (
            <>
              {/* Chimney */}
              <mesh position={[1.2, 3.2, 0.8]}>
                <boxGeometry args={[0.4, 0.8, 0.4]} />
                <meshStandardMaterial color="#8B4513" roughness={0.9} />
              </mesh>
              
              {/* Roof ridge */}
              <mesh position={[0, 2.85, 0]}>
                <boxGeometry args={[4.5, 0.1, 0.2]} />
                <meshStandardMaterial color="#2D3748" />
              </mesh>
            </>
          )}
        </>
      )}

      {/* Ground/landscaping (only in realistic mode and when complete) */}
      {!wireframe && progress > 0.8 && (
        <>
          {/* Driveway */}
          <mesh position={[0, -0.45, -3]}>
            <boxGeometry args={[1.5, 0.1, 2]} />
            <meshStandardMaterial color="#4A5568" roughness={0.8} />
          </mesh>
          
          {/* Grass areas */}
          <mesh position={[-3, -0.45, 0]}>
            <boxGeometry args={[2, 0.05, 6]} />
            <meshStandardMaterial color="#22543D" roughness={1.0} />
          </mesh>
          <mesh position={[3, -0.45, 0]}>
            <boxGeometry args={[2, 0.05, 6]} />
            <meshStandardMaterial color="#22543D" roughness={1.0} />
          </mesh>
        </>
      )}

      {/* Blueprint Grid */}
      {wireframe && <GridLines />}
    </group>
  );
};

const GridLines: React.FC = () => {
  const points = [];
  
  // Horizontal lines
  for (let i = -5; i <= 5; i++) {
    points.push(new Vector3(-5, 0, i), new Vector3(5, 0, i));
  }
  
  // Vertical lines
  for (let i = -5; i <= 5; i++) {
    points.push(new Vector3(i, 0, -5), new Vector3(i, 0, 5));
  }

  const geometry = new BufferGeometry().setFromPoints(points);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#64748B" transparent opacity={0.3} />
    </lineSegments>
  );
};

const Scene: React.FC<{ progress: number; wireframe: boolean }> = ({ progress, wireframe }) => {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(8, 6, 8);
  }, [camera]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[8, 6, 8]} />
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={15}
        maxPolarAngle={Math.PI / 2.2}
        autoRotate={!wireframe}
        autoRotateSpeed={0.5}
      />
      
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-10, -10, -10]} intensity={0.3} />
      
      <BuildingModel progress={progress} wireframe={wireframe} />
      
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <shadowMaterial transparent opacity={0.2} />
      </mesh>
    </>
  );
};

const LoadingFallback: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-construction-orange/5 rounded-2xl">
    <div className="text-center space-y-4">
      <div className="w-16 h-16 mx-auto border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-muted-foreground">Loading 3D Preview...</p>
    </div>
  </div>
);

const Blueprint3D: React.FC = () => {
  const [progress, setProgress] = useState(0.3);
  const [wireframe, setWireframe] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Auto-play animation
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 0.02;
        if (newProgress >= 1) {
          setIsPlaying(false);
          return 1;
        }
        return newProgress;
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Update current phase based on progress
  useEffect(() => {
    const phaseIndex = phases.findIndex(phase => progress <= phase.progress);
    setCurrentPhase(phaseIndex === -1 ? phases.length - 1 : phaseIndex);
  }, [progress]);

  // Touch gestures for mobile
  useTouchGestures(canvasRef, {
    onSwipe: (gesture) => {
      if (gesture.direction === 'left') {
        setProgress(prev => Math.min(1, prev + 0.1));
      } else if (gesture.direction === 'right') {
        setProgress(prev => Math.max(0, prev - 0.1));
      }
    },
    onTap: () => setWireframe(prev => !prev),
  });

  const handleTimelineClick = (phaseProgress: number) => {
    setProgress(phaseProgress);
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (progress >= 1) {
      setProgress(0);
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="w-full h-[500px] lg:h-[600px] relative bg-gradient-to-br from-background to-secondary/20 rounded-2xl overflow-hidden border border-border/50 shadow-2xl">
      {/* 3D Canvas */}
      <div ref={canvasRef} className="w-full h-full">
        <Suspense fallback={<LoadingFallback />}>
          <Canvas
            shadows
            camera={{ position: [8, 6, 8], fov: 50 }}
            className="w-full h-full"
            performance={{ min: 0.5 }}
          >
            <Scene progress={progress} wireframe={wireframe} />
          </Canvas>
        </Suspense>
      </div>

      {/* Control Panel */}
      <div className="absolute bottom-4 left-4 right-4 bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl p-4 space-y-4">
        {/* Timeline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Construction Progress</span>
            <span className="font-medium text-construction-orange">
              {phases[currentPhase]?.name || 'Complete'} - {Math.round(progress * 100)}%
            </span>
          </div>
          
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-construction-orange transition-all duration-300 ease-out"
              style={{ width: `${progress * 100}%` }}
            />
            
            {/* Phase markers */}
            {phases.map((phase, index) => (
              <button
                key={phase.name}
                onClick={() => handleTimelineClick(phase.progress)}
                className="absolute top-0 w-4 h-2 -translate-x-2 hover:scale-125 transition-transform"
                style={{ left: `${phase.progress * 100}%` }}
              >
                <div 
                  className="w-full h-full rounded-full border-2 border-background"
                  style={{ backgroundColor: phase.color }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlayback}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              {isPlaying ? 'Pause' : progress >= 1 ? 'Restart' : 'Play'}
            </button>
            
            <button
              onClick={() => setWireframe(!wireframe)}
              className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors text-sm font-medium"
            >
              {wireframe ? 'Realistic' : 'Blueprint'}
            </button>
          </div>
          
          <div className="text-xs text-muted-foreground hidden sm:block">
            Click timeline • Drag to rotate • Scroll to zoom
          </div>
          <div className="text-xs text-muted-foreground block sm:hidden">
            Tap to switch views • Swipe for progress
          </div>
        </div>
      </div>

      {/* Mobile hint */}
      <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2 text-xs text-muted-foreground sm:hidden">
        Tap & swipe to interact
      </div>
    </div>
  );
};

export default Blueprint3D;