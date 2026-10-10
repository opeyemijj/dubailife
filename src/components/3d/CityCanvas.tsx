"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Environment, PerspectiveCamera, Sparkles, Html } from "@react-three/drei";
import { useRef, useState } from "react";
import * as THREE from "three";
import { MapPin } from "lucide-react";

// --- LANDMARKS ---

function BurjKhalifa({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 4, 0]}>
        <cylinderGeometry args={[2, 2.5, 8, 6]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.1} metalness={0.9} emissive="#1e3a8a" emissiveIntensity={0.2} />
      </mesh>
      {/* Middle Tier 1 */}
      <mesh position={[0, 10, 0]}>
        <cylinderGeometry args={[1.5, 2, 6, 6]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.1} metalness={0.9} emissive="#1e3a8a" emissiveIntensity={0.2} />
      </mesh>
      {/* Middle Tier 2 */}
      <mesh position={[0, 15, 0]}>
        <cylinderGeometry args={[1, 1.5, 6, 6]} />
        <meshStandardMaterial color="#60a5fa" roughness={0.1} metalness={0.9} />
      </mesh>
      {/* Spire */}
      <mesh position={[0, 21, 0]}>
        <cylinderGeometry args={[0.1, 1, 8, 6]} />
        <meshStandardMaterial color="#93c5fd" roughness={0.1} metalness={0.9} emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function BurjAlArab({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, -Math.PI / 4, 0]}>
      {/* Island */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[3, 3.5, 1, 16]} />
        <meshStandardMaterial color="#d4d4d8" roughness={0.8} />
      </mesh>
      {/* Sail */}
      <mesh position={[0, 5, 0]}>
        <coneGeometry args={[2, 10, 3, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.5} emissive="#ffffff" emissiveIntensity={0.1} side={THREE.DoubleSide} />
      </mesh>
      {/* Helipad */}
      <mesh position={[1.5, 8, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 0.2, 16]} />
        <meshStandardMaterial color="#10b981" />
      </mesh>
    </group>
  );
}

function AinDubai({ position }: { position: [number, number, number] }) {
  const wheelRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (wheelRef.current) {
      wheelRef.current.rotation.z = state.clock.elapsedTime * -0.1;
    }
  });

  return (
    <group position={position} rotation={[0, Math.PI / 3, 0]}>
      {/* Supports */}
      <mesh position={[-1.5, 3, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.2, 0.2, 8]} />
        <meshStandardMaterial color="#a1a1aa" metalness={0.8} />
      </mesh>
      <mesh position={[1.5, 3, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.2, 0.2, 8]} />
        <meshStandardMaterial color="#a1a1aa" metalness={0.8} />
      </mesh>
      {/* Wheel */}
      <group ref={wheelRef} position={[0, 6, 0]}>
        <mesh>
          <torusGeometry args={[4, 0.2, 16, 64]} />
          <meshStandardMaterial color="#ffffff" metalness={0.6} emissive="#3b82f6" emissiveIntensity={0.3} />
        </mesh>
        {/* Spokes */}
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <cylinderGeometry args={[0.05, 0.05, 8]} />
          <meshStandardMaterial color="#d4d4d8" />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 4]}>
          <cylinderGeometry args={[0.05, 0.05, 8]} />
          <meshStandardMaterial color="#d4d4d8" />
        </mesh>
      </group>
    </group>
  );
}

function GenericBuilding({ position, scale, color }: { position: [number, number, number], scale: [number, number, number], color: string }) {
  return (
    <mesh position={position}>
      <boxGeometry args={scale} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.7} emissive={color} emissiveIntensity={0.1} />
    </mesh>
  );
}

function LocationMarker({ position, label, district, isHot }: { position: [number, number, number], label: string, district: string, isHot?: boolean }) {
  const [hovered, setHovered] = useState(false);
  
  return (
    <Html position={position} center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
      <div 
        className={`pointer-events-auto cursor-pointer transition-all duration-300 ${hovered ? 'scale-110 z-50 relative' : 'scale-100 opacity-80'} flex flex-col items-center`}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <div className={`p-2 rounded-2xl backdrop-blur-md border shadow-2xl flex flex-col gap-1 min-w-max ${
          isHot ? 'bg-blue-600/30 border-blue-400/50' : 'bg-black/60 border-white/20'
        }`}>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">{district}</div>
          <div className="text-sm font-bold text-white whitespace-nowrap leading-none flex items-center gap-1.5">
            <MapPin className={`w-3.5 h-3.5 ${isHot ? 'text-blue-400' : 'text-gray-400'}`} />
            {label}
          </div>
        </div>
        <div className={`w-0.5 h-6 ${isHot ? 'bg-gradient-to-b from-blue-400/50 to-transparent' : 'bg-gradient-to-b from-white/30 to-transparent'}`} />
      </div>
    </Html>
  );
}

// --- CITY ASSEMBLY ---

function StylizedDubai({ interactive }: { interactive: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current && !interactive) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  // Generate generic skyline clusters
  const downtownCluster = Array.from({ length: 15 }).map((_, i) => {
    const x = -5 + Math.random() * 10;
    const z = -5 + Math.random() * 10;
    const height = 2 + Math.random() * 10;
    return <GenericBuilding key={`dt-${i}`} position={[x, height/2, z]} scale={[1, height, 1.5]} color="#1e293b" />;
  });

  const marinaCluster = Array.from({ length: 25 }).map((_, i) => {
    const x = 12 + Math.random() * 8;
    const z = 8 + Math.random() * 15;
    const height = 3 + Math.random() * 12;
    return <GenericBuilding key={`marina-${i}`} position={[x, height/2, z]} scale={[1.2, height, 1.2]} color="#0f172a" />;
  });

  return (
    <group ref={groupRef}>
      {/* Ground (Stylized Sand / Asphalt) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.9} metalness={0.1} />
      </mesh>
      
      {/* Water (Arabian Gulf) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[20, -0.05, 0]}>
        <planeGeometry args={[40, 100]} />
        <meshStandardMaterial color="#0ea5e9" roughness={0.1} metalness={0.8} opacity={0.3} transparent />
      </mesh>

      {/* Downtown Dubai */}
      <group position={[-5, 0, -5]}>
        {downtownCluster}
        <BurjKhalifa position={[0, 0, 0]} />
        {interactive && <LocationMarker position={[0, 26, 0]} label="Burj Khalifa" district="Downtown Dubai" isHot />}
        {interactive && <LocationMarker position={[3, 5, -2]} label="Dubai Mall" district="Downtown Dubai" />}
      </group>

      {/* Jumeirah / Beachfront */}
      <group position={[8, 0, -8]}>
        <BurjAlArab position={[0, 0, 0]} />
        {interactive && <LocationMarker position={[0, 12, 0]} label="Burj Al Arab" district="Jumeirah" />}
      </group>

      {/* Bluewaters / Marina */}
      <group position={[15, 0, 10]}>
        {marinaCluster}
        <AinDubai position={[5, 0, 5]} />
        {interactive && <LocationMarker position={[5, 12, 5]} label="Ain Dubai" district="Bluewaters" />}
        {interactive && <LocationMarker position={[-2, 10, 2]} label="Vibe Nation Club" district="Dubai Marina" isHot />}
      </group>

    </group>
  );
}

export default function CityCanvas({ interactive = false }: { interactive?: boolean }) {
  return (
    <div className={`absolute inset-0 z-0 ${!interactive ? 'pointer-events-none opacity-40' : 'opacity-100'}`}>
      <Canvas>
        <PerspectiveCamera makeDefault position={interactive ? [-20, 25, 30] : [-15, 15, 25]} fov={45} />
        <OrbitControls 
          enableZoom={interactive} 
          enablePan={interactive} 
          autoRotate={!interactive} 
          autoRotateSpeed={0.3} 
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={5}
          maxDistance={80}
          target={[5, 0, 0]}
        />
        
        <ambientLight intensity={0.3} />
        <directionalLight position={[20, 30, 10]} intensity={1.5} color="#60a5fa" />
        <directionalLight position={[-20, 10, -20]} intensity={1} color="#c084fc" />
        <pointLight position={[0, 5, 0]} intensity={2} color="#4ade80" />
        
        <StylizedDubai interactive={interactive} />
        
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        
        <Environment preset="night" />
        
        <fog attach="fog" args={["#000000", interactive ? 20 : 15, interactive ? 80 : 60]} />
      </Canvas>
    </div>
  );
}
