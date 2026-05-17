"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";

function BikePlaceholder() {
  const { selectedParts } = useConfiguratorStore();

  return (
    <group position={[0, -1, 0]}>
      {/* Frame Main Body (angled) */}
      <group position={[0, 1.2, 0]}>
        <mesh rotation={[-Math.PI / 6, 0, 0]}>
          <boxGeometry args={[0.2, 0.2, 1.2]} />
          <meshStandardMaterial color={selectedParts.frame ? "#3b82f6" : "#27272a"} metalness={0.8} roughness={0.2} />
        </mesh>
        
        {/* Frame Swingarm */}
        <mesh position={[0, -0.4, -0.5]} rotation={[Math.PI / 8, 0, 0]}>
          <boxGeometry args={[0.25, 0.15, 0.8]} />
          <meshStandardMaterial color={selectedParts.frame ? "#3b82f6" : "#27272a"} metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Battery (Inside the frame) */}
      <group position={[0, 1.0, 0.2]}>
        <mesh rotation={[-Math.PI / 6, 0, 0]}>
          <boxGeometry args={[0.18, 0.4, 0.6]} />
          <meshStandardMaterial color={selectedParts.battery ? "#ef4444" : "#18181b"} roughness={0.8} />
        </mesh>
      </group>

      {/* Controller (Mounted on the front) */}
      <group position={[0, 1.3, 0.7]}>
        <mesh rotation={[-Math.PI / 4, 0, 0]}>
          <boxGeometry args={[0.15, 0.3, 0.1]} />
          <meshStandardMaterial color={selectedParts.controller ? "#10b981" : "#3f3f46"} metalness={0.5} roughness={0.5} />
        </mesh>
      </group>

      {/* Motor (At the bottom bracket) */}
      <group position={[0, 0.7, 0.1]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 0.25, 32]} />
          <meshStandardMaterial color={selectedParts.motor ? "#eab308" : "#3f3f46"} metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Front Wheel */}
      <mesh position={[0, 0.6, 1.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.6, 0.6, 0.1, 32]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Rear Wheel */}
      <mesh position={[0, 0.6, -1.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.6, 0.6, 0.1, 32]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </group>
  );
}

export function Scene() {
  return (
    <Canvas camera={{ position: [4, 2, 4], fov: 45 }}>
      <color attach="background" args={["#09090b"]} />
      
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={2} 
      />
      {/* Fallback lighting instead of Environment preset to avoid WebGL crashes */}
      <pointLight position={[-10, -10, -10]} intensity={1} />
      <pointLight position={[10, 0, -10]} intensity={1} />

      <BikePlaceholder />
      
      <OrbitControls 
        makeDefault
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2 + 0.1}
        enablePan={false}
        minDistance={3}
        maxDistance={10}
      />
    </Canvas>
  );
}
