import React, { useRef, useState, useEffect, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Html, useProgress } from '@react-three/drei';
import * as THREE from 'three';

// --- Types ---
interface BlueprintProps {
    isBuildMode: boolean;
    onToggleMode: () => void;
}

// --- Advanced Materials ---
const createMaterials = (isBuildMode: boolean) => {
    const blueprintColor = new THREE.Color('#00aaff');
    const blueprintLine = new THREE.Color('#ffffff');

    if (isBuildMode) {
        const blueprintMat = new THREE.MeshBasicMaterial({
            color: blueprintColor,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        const wireframeMat = new THREE.MeshBasicMaterial({
            color: blueprintLine,
            wireframe: true,
            transparent: true,
            opacity: 0.3,
        });
        return {
            concrete: blueprintMat,
            wood: blueprintMat,
            metal: wireframeMat,
            glass: new THREE.MeshBasicMaterial({
                color: blueprintColor,
                transparent: true,
                opacity: 0.05,
                wireframe: true
            }),
            highlight: new THREE.MeshBasicMaterial({ color: '#ffaa00', wireframe: true }),
            wireframe: wireframeMat
        };
    }

    return {
        concrete: new THREE.MeshStandardMaterial({
            color: '#b0b0b0', // Darker grey
            roughness: 0.8,
            metalness: 0.1,
        }),
        wood: new THREE.MeshStandardMaterial({
            color: '#a05a2c', // Richer wood color
            roughness: 0.6,
            metalness: 0.0,
        }),
        metal: new THREE.MeshStandardMaterial({
            color: '#202020', // Near black steel
            roughness: 0.4,
            metalness: 0.7,
        }),
        glass: new THREE.MeshPhysicalMaterial({
            color: '#eef6ff',
            metalness: 0.0,
            roughness: 0.0,
            transmission: 0.95, // Clearer
            thickness: 0.1,
            transparent: true,
            opacity: 0.3,
            ior: 1.5,
        }),
        highlight: new THREE.MeshStandardMaterial({ color: '#ff6b35', emissive: '#ff6b35', emissiveIntensity: 0.5 }),
        wireframe: null
    };
};

// --- Architectural Components ---

const FramingStuds = ({ position, count, height, width, depth, material }: any) => {
    const studs = useMemo(() => {
        const items = [];
        const spacing = width / count;
        for (let i = 0; i <= count; i++) {
            items.push(
                <mesh key={i} position={[i * spacing - width / 2, 0, 0]} castShadow receiveShadow material={material}>
                    <boxGeometry args={[0.05, height, depth]} />
                </mesh>
            );
        }
        return items;
    }, [count, height, width, depth, material]);

    return <group position={position}>{studs}</group>;
};

const IBeam = ({ length, material, ...props }: any) => (
    <group {...props}>
        {/* Top Flange */}
        <mesh position={[0, 0.1, 0]} castShadow receiveShadow material={material}>
            <boxGeometry args={[length, 0.02, 0.15]} />
        </mesh>
        {/* Web */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow material={material}>
            <boxGeometry args={[length, 0.2, 0.02]} />
        </mesh>
        {/* Bottom Flange */}
        <mesh position={[0, -0.1, 0]} castShadow receiveShadow material={material}>
            <boxGeometry args={[length, 0.02, 0.15]} />
        </mesh>
    </group>
);

const Staircase = ({ position, steps = 12, width = 1.2, height = 2.5, depth = 2.5, material, stringerMaterial }: any) => {
    const stepHeight = height / steps;
    const stepDepth = depth / steps;
    const angle = Math.atan2(height, depth);
    const length = Math.sqrt(height * height + depth * depth);
    
    return (
        <group position={position}>
            {Array.from({ length: steps }).map((_, i) => (
                <mesh 
                    key={i} 
                    position={[0, i * stepHeight + stepHeight/2, i * stepDepth + stepDepth/2]} 
                    receiveShadow 
                    castShadow 
                    material={material}
                >
                    <boxGeometry args={[width, 0.05, stepDepth]} />
                </mesh>
            ))}
            
            {/* Left Stringer */}
            <mesh 
                position={[-width/2 + 0.05, height/2, depth/2]} 
                rotation={[-angle, 0, 0]} 
                receiveShadow 
                material={stringerMaterial}
            >
                <boxGeometry args={[0.1, 0.3, length + 0.2]} />
            </mesh>

            {/* Right Stringer */}
            <mesh 
                position={[width/2 - 0.05, height/2, depth/2]} 
                rotation={[-angle, 0, 0]} 
                receiveShadow 
                material={stringerMaterial}
            >
                <boxGeometry args={[0.1, 0.3, length + 0.2]} />
            </mesh>
        </group>
    );
};

const WoodPanelWall = ({ width, height, depth = 0.1, material }: any) => {
    // Create horizontal planks
    const plankHeight = 0.2;
    const planks = Math.ceil(height / plankHeight);
    
    return (
        <group>
            {Array.from({ length: planks }).map((_, i) => (
                <mesh 
                    key={i} 
                    position={[0, i * plankHeight - height/2 + plankHeight/2, 0]} 
                    receiveShadow 
                    castShadow 
                    material={material}
                >
                    <boxGeometry args={[width, plankHeight - 0.01, depth]} />
                </mesh>
            ))}
        </group>
    );
};

const WindowFrame = ({ width, height, material, glassMaterial }: any) => (
    <group>
        {/* Frame */}
        <mesh position={[0, height/2, 0]} material={material}>
            <boxGeometry args={[width, 0.1, 0.1]} />
        </mesh>
        <mesh position={[0, -height/2, 0]} material={material}>
            <boxGeometry args={[width, 0.1, 0.1]} />
        </mesh>
        <mesh position={[width/2, 0, 0]} material={material}>
            <boxGeometry args={[0.1, height, 0.1]} />
        </mesh>
        <mesh position={[-width/2, 0, 0]} material={material}>
            <boxGeometry args={[0.1, height, 0.1]} />
        </mesh>
        {/* Mullions */}
        <mesh position={[-width/4, 0, 0]} material={material}>
            <boxGeometry args={[0.05, height, 0.05]} />
        </mesh>
        <mesh position={[width/4, 0, 0]} material={material}>
            <boxGeometry args={[0.05, height, 0.05]} />
        </mesh>
        {/* Glass */}
        <mesh position={[0, 0, 0]} material={glassMaterial}>
            <planeGeometry args={[width - 0.2, height - 0.2]} />
        </mesh>
    </group>
);

const DetailedHouse = ({ isBuildMode, scrollProgress }: { isBuildMode: boolean; scrollProgress: number }) => {
    const group = useRef<THREE.Group>(null);
    const mats = useMemo(() => createMaterials(isBuildMode), [isBuildMode]);

    // Animation Refs for Exploded View
    const roofRef = useRef<THREE.Group>(null);
    const secondFloorRef = useRef<THREE.Group>(null);
    const wallsRef = useRef<THREE.Group>(null);
    const glassRef = useRef<THREE.Group>(null);
    const structureRef = useRef<THREE.Group>(null);
    const stairsRef = useRef<THREE.Group>(null);
    const interiorRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (!group.current) return;

        // Smooth rotation
        group.current.rotation.y = THREE.MathUtils.lerp(
            group.current.rotation.y,
            state.clock.elapsedTime * 0.1 + (scrollProgress * Math.PI / 4), 
            0.05
        );

        // Exploded View Animation Logic
        const explodeFactor = scrollProgress * 5; // Increased for more expansion

        if (roofRef.current) roofRef.current.position.y = THREE.MathUtils.lerp(roofRef.current.position.y, 4.5 + explodeFactor * 2.5, 0.1);
        if (secondFloorRef.current) secondFloorRef.current.position.y = THREE.MathUtils.lerp(secondFloorRef.current.position.y, 3.25 + explodeFactor * 1.5, 0.1);
        
        // Move glass walls forward
        if (wallsRef.current) {
            wallsRef.current.position.y = THREE.MathUtils.lerp(wallsRef.current.position.y, 1.5 + explodeFactor * 0.4, 0.1);
            wallsRef.current.position.z = THREE.MathUtils.lerp(wallsRef.current.position.z, 0 + explodeFactor * 1.2, 0.1); 
        }
        
        // Move interior walls backward to avoid collision
        if (interiorRef.current) {
            interiorRef.current.position.y = THREE.MathUtils.lerp(interiorRef.current.position.y, 1.5 + explodeFactor * 0.4, 0.1);
            interiorRef.current.position.z = THREE.MathUtils.lerp(interiorRef.current.position.z, 0 - explodeFactor * 1.0, 0.1); 
        }

        if (glassRef.current) glassRef.current.position.z = THREE.MathUtils.lerp(glassRef.current.position.z, 3.51 + explodeFactor * 1.8, 0.1);
        if (structureRef.current) structureRef.current.position.y = THREE.MathUtils.lerp(structureRef.current.position.y, 0, 0.1);
        if (stairsRef.current) stairsRef.current.position.x = THREE.MathUtils.lerp(stairsRef.current.position.x, 0 - explodeFactor * 0.8, 0.1);
    });

    return (
        <group ref={group}>
            {/* --- Foundation Level --- */}
            <group position={[0, 0, 0]}>
                {/* Main Slab with "Tiled" look */}
                <mesh position={[0, 0.25, 0]} castShadow receiveShadow material={mats.concrete}>
                    <boxGeometry args={[6.5, 0.5, 6.5]} />
                </mesh>
                 {/* Perimeter Footing */}
                 <mesh position={[0, 0.1, 0]} castShadow material={mats.metal}>
                    <boxGeometry args={[6.6, 0.2, 6.6]} />
                </mesh>
            </group>

            {/* --- Structural Steel (Skeleton) --- */}
            <group ref={structureRef}>
                {/* Columns - H-Beams */}
                {[-2.5, 2.5].map(x => [-2.5, 2.5].map(z => (
                    <group key={`${x}-${z}`} position={[x, 2, z]}>
                        <mesh castShadow material={mats.metal}>
                            <boxGeometry args={[0.2, 4, 0.2]} />
                        </mesh>
                        {/* Base Plate */}
                        <mesh position={[0, -1.95, 0]} material={mats.metal}>
                            <boxGeometry args={[0.4, 0.1, 0.4]} />
                        </mesh>
                    </group>
                )))}

                {/* Main Beams */}
                <IBeam position={[0, 4, -2.5]} length={5.3} material={mats.metal} />
                <IBeam position={[0, 4, 2.5]} length={5.3} material={mats.metal} />
                <IBeam position={[-2.5, 4, 0]} length={5.3} rotation={[0, Math.PI / 2, 0]} material={mats.metal} />
                <IBeam position={[2.5, 4, 0]} length={5.3} rotation={[0, Math.PI / 2, 0]} material={mats.metal} />
                
                {/* Cross Bracing */}
                {isBuildMode && (
                    <mesh position={[0, 2, -2.5]} rotation={[0, 0, Math.PI/4]} material={mats.wireframe}>
                        <cylinderGeometry args={[0.05, 0.05, 5, 8]} />
                    </mesh>
                )}
            </group>

            {/* --- Interior Elements --- */}
            <group ref={stairsRef}>
                 {/* Adjusted position to not collide */}
                 <Staircase 
                    position={[0, 0.5, 0]} 
                    steps={12} 
                    height={2.5} 
                    width={1.2} 
                    depth={2.5} 
                    material={mats.concrete} 
                    stringerMaterial={mats.metal}
                 />
            </group>

            {/* --- First Floor Glass Walls --- */}
            <group ref={wallsRef} position={[0, 1.5, 0]}>
                {/* Glass Curtain Wall System - Centered properly */}
                <group position={[-1.2, 0, 2.4]}>
                    <WindowFrame width={2.4} height={2.8} material={mats.metal} glassMaterial={mats.glass} />
                    <group position={[2.4, 0, 0]}>
                         <WindowFrame width={2.4} height={2.8} material={mats.metal} glassMaterial={mats.glass} />
                    </group>
                </group>
            </group>

            {/* --- First Floor Interior Partition Walls --- */}
            <group ref={interiorRef} position={[0, 1.5, 0]}>
                {/* Interior Partition with Wood Panels */}
                <group position={[0, 0, -1]}>
                     <WoodPanelWall width={4} height={2.8} depth={0.1} material={mats.wood} />
                </group>
                <group position={[-2, 0, -1]}>
                     <mesh material={mats.wood}>
                        <boxGeometry args={[0.2, 2.8, 3]} />
                     </mesh>
                </group>
            </group>

            {/* --- Second Floor --- */}
            <group ref={secondFloorRef} position={[0, 3.25, 0]}>
                {/* Floor Slab */}
                <mesh position={[-0.5, 0, 0.5]} castShadow receiveShadow material={mats.concrete}>
                    <boxGeometry args={[5.5, 0.3, 7.5]} />
                </mesh>

                {/* Upper Volume Walls with Wood Panels */}
                <group position={[-0.5, 1.15, 0]}>
                    {/* Back Wall */}
                    <group position={[0, 0, -3.4]}>
                         <WoodPanelWall width={5} height={2} depth={0.2} material={mats.wood} />
                    </group>
                    
                    {/* Side Walls */}
                    <mesh position={[-2.4, 0, 0]} material={mats.wood}>
                        <boxGeometry args={[0.2, 2, 7]} />
                    </mesh>
                    <mesh position={[2.4, 0, 0]} material={mats.wood}>
                        <boxGeometry args={[0.2, 2, 7]} />
                    </mesh>
                </group>

                {/* Framing Detail */}
                {(isBuildMode || scrollProgress > 0.1) && (
                    <FramingStuds position={[-0.5, 1, 3.4]} count={12} height={2} width={5} depth={0.1} material={mats.metal} />
                )}
            </group>

            {/* --- Large Window Feature --- */}
            <group ref={glassRef} position={[-0.5, 3.25, 3.51]}>
                 <WindowFrame width={4.8} height={1.8} material={mats.metal} glassMaterial={mats.glass} />
            </group>

            {/* --- Roof --- */}
            <group ref={roofRef} position={[-0.5, 4.5, 0]}>
                <mesh castShadow receiveShadow material={mats.metal}>
                    <boxGeometry args={[6, 0.2, 8]} />
                </mesh>
                {/* Parapet */}
                <mesh position={[0, 0.2, 0]} material={mats.metal}>
                     <boxGeometry args={[5.8, 0.2, 7.8]} />
                </mesh>
                
                {/* HVAC Unit Fixed - Dark Metal Grill */}
                <group position={[1, 0.4, -1]}>
                    <mesh castShadow material={mats.metal}>
                        <boxGeometry args={[1.2, 0.8, 1.2]} />
                    </mesh>
                    {/* Fan Grill - Recessed and dark */}
                    <mesh position={[0, 0.41, 0]} rotation={[Math.PI/2, 0, 0]}>
                         <cylinderGeometry args={[0.4, 0.4, 0.05, 16]} />
                         <meshStandardMaterial color="#111" roughness={0.8} />
                    </mesh>
                </group>
            </group>
        </group>
    );
};

const Scene = ({ isBuildMode, scrollProgress }: { isBuildMode: boolean; scrollProgress: number }) => {
    return (
        <>
            <PerspectiveCamera makeDefault position={[10, 8, 12]} fov={40} />
            <OrbitControls
                enablePan={false}
                enableZoom={false}
                minPolarAngle={Math.PI / 4}
                maxPolarAngle={Math.PI / 2.2}
                autoRotate={!isBuildMode && scrollProgress < 0.1} // Stop rotation when scrolling/exploding
                autoRotateSpeed={1}
            />

            <Environment preset={isBuildMode ? "city" : "dawn"} blur={0.5} />

            <ambientLight intensity={isBuildMode ? 0.8 : 0.4} />
            <directionalLight
                position={[10, 15, 10]}
                intensity={isBuildMode ? 0.5 : 1.5}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-bias={-0.0001}
            />
            {/* Rim light for premium feel */}
            <spotLight position={[-10, 10, -5]} intensity={2} color="#4faaff" distance={20} />

            <DetailedHouse isBuildMode={isBuildMode} scrollProgress={scrollProgress} />

            <ContactShadows
                position={[0, -0.1, 0]}
                opacity={0.4}
                scale={30}
                blur={2.5}
                far={5}
                color="#000000"
            />

            {/* Grid for Build Mode */}
            {isBuildMode && (
                <group position={[0, -0.05, 0]}>
                    <gridHelper args={[30, 30, '#00aaff', '#1a1a1a']} />
                    <axesHelper args={[2]} />
                </group>
            )}
        </>
    );
};

const Loader = () => {
    const { progress } = useProgress();
    return (
        <Html center>
            <div className="text-white font-mono text-sm bg-black/50 px-4 py-2 rounded backdrop-blur-sm">
                {progress.toFixed(0)}% LOADED
            </div>
        </Html>
    );
};

const PremiumBlueprint3D: React.FC<BlueprintProps> = ({ isBuildMode, onToggleMode }) => {
    const [scrollProgress, setScrollProgress] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Scroll Hijacking - only when mouse is over the 3D container
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let isMouseOver = false;

        const handleMouseEnter = () => {
            isMouseOver = true;
        };

        const handleMouseLeave = () => {
            isMouseOver = false;
        };

        const handleWheel = (e: WheelEvent) => {
            // Only hijack scroll if mouse is over the container
            if (!isMouseOver) return;

            
            // preventDefault stops the page from scrolling
            e.preventDefault();

            // Sensitivity factor
            const sensitivity = 0.0015;
            
            // DeltaY > 0 means scrolling down -> Dismantle (Increase progress)
            const delta = e.deltaY;
            
            setScrollProgress(current => {
                const newProgress = current + (delta * sensitivity);
                return Math.min(Math.max(newProgress, 0), 1);
            });
        };

        // Listen to mouse enter/leave
        container.addEventListener('mouseenter', handleMouseEnter);
        container.addEventListener('mouseleave', handleMouseLeave);

        // Attach wheel listener to window with passive: false
        window.addEventListener('wheel', handleWheel, { passive: false });


        return () => {
            container.removeEventListener('mouseenter', handleMouseEnter);
            container.removeEventListener('mouseleave', handleMouseLeave);
            window.removeEventListener('wheel', handleWheel);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative rounded-[2rem] overflow-hidden transition-all duration-700 shadow-2xl border border-white/10"
        >
            {/* Dynamic Background */}
            <div className={`absolute inset-0 transition-colors duration-1000 ${isBuildMode
                    ? 'bg-[#0a0f1c]' // Deep blueprint blue/black
                    : 'bg-gradient-to-br from-slate-900 via-[#1a2333] to-slate-900' // Premium dark mode
                }`} />

            {/* Decorative Gradients */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[100px] pointer-events-none" />

            <Canvas shadows dpr={[1, 2]} className="z-10">
                <Suspense fallback={<Loader />}>
                    <Scene isBuildMode={isBuildMode} scrollProgress={scrollProgress} />
                </Suspense>
            </Canvas>

            {/* Interactive Overlay UI */}
            <div className="absolute bottom-4 sm:bottom-8 right-4 sm:right-8 z-20 flex flex-col gap-2 sm:gap-4 items-end">
                {/* Scroll Indicator */}
                <div className={`
          transition-opacity duration-500 flex items-center gap-2 sm:gap-3 text-white/50 text-xs font-mono
          ${scrollProgress > 0.1 ? 'opacity-0' : 'opacity-100'}
        `}>
                    <span className="animate-bounce">↓</span>
                    <span className="hidden sm:inline">SCROLL TO DISMANTLE</span>
                </div>

                <button
                    onClick={onToggleMode}
                    className={`
            group relative px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 shadow-lg border
            flex items-center gap-2 sm:gap-3 overflow-hidden
            ${isBuildMode
                            ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-400 hover:bg-cyan-900/90'
                            : 'bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-md'
                        }
          `}
                >
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity ${isBuildMode ? 'bg-cyan-400' : 'bg-white'
                        }`} />

                    {isBuildMode ? (
                        <>
                            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-pulse" />
                            <span className="hidden sm:inline">EXIT BLUEPRINT</span>
                            <span className="sm:hidden">EXIT</span>
                        </>
                    ) : (
                        <>
                            <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
                            <span className="hidden sm:inline">VIEW BLUEPRINT</span>
                            <span className="sm:hidden">BLUEPRINT</span>
                        </>
                    )}
                </button>
            </div>

            {/* System Status HUD */}
            <div className="absolute top-4 sm:top-8 left-4 sm:left-8 z-20 pointer-events-none">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="h-[1px] w-6 sm:w-8 bg-white/30" />
                        <span className="text-[8px] sm:text-[10px] font-mono tracking-[0.2em] text-white/50 uppercase">
                            Project: Profit Radar
                        </span>
                    </div>
                    <h3 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                        Modern Office <span className="text-white/30">v2.0</span>
                    </h3>

                    {/* Live Cost Ticker Simulation */}
                    <div className={`
            mt-2 sm:mt-4 p-3 sm:p-4 rounded-lg border backdrop-blur-md transition-all duration-500 w-52 sm:w-64
            ${isBuildMode
                            ? 'bg-cyan-950/50 border-cyan-500/30'
                            : 'bg-black/30 border-white/10'
                        }
          `}>
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-[10px] sm:text-xs text-white/60 font-mono">ESTIMATED COST</span>
                            <span className={`text-base sm:text-lg font-bold font-mono ${isBuildMode ? 'text-cyan-400' : 'text-orange-400'}`}>
                                ${(500000 - scrollProgress * 500000).toLocaleString()}
                            </span>
                        </div>
                        <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${isBuildMode ? 'bg-cyan-500' : 'bg-orange-500'}`}
                                style={{ width: `${45 + scrollProgress * 30}%` }}
                            />
                        </div>
                        <div className="mt-2 text-[9px] sm:text-[10px] text-white/40 font-mono flex justify-between">
                            <span>MATERIALS: 45%</span>
                            <span>LABOR: 30%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PremiumBlueprint3D;
