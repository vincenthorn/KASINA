import { useEffect, useState, useRef } from "react";
import { KasinaType } from "../types";
import ColorKasina from "./ColorKasina";
import ElementalKasina from "./ElementalKasina";
import { useFrame } from "@react-three/fiber";
import { Mesh, MeshStandardMaterial, Color, Group } from "three";

// Special optimized water kasina component to solve the seam issue
// Uses multiple nested spheres with different opacity and rotation to create a seamless appearance
interface WaterKasinaProps {
  color: string;
  emissive?: string;
  speed?: number;
}

const WaterKasina = ({ 
  color, 
  emissive = color, 
  speed = 0.5 
}: WaterKasinaProps) => {
  const groupRef = useRef<Group>(null);
  
  // Use bright blue if color is too dark to ensure visibility
  const actualColor = new Color(color).getHSL({ h: 0, s: 0, l: 0 }).l < 0.5 
    ? "#0088ff" 
    : color;
    
  // Use a box geometry for a completely different approach
  // This will explicitly avoid the spherical seam issue
  
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    
    const time = clock.getElapsedTime();
    
    // Create a gentle flowing rotation that gives the appearance of moving water
    groupRef.current.rotation.y = time * speed * 0.2;
    groupRef.current.rotation.x = Math.sin(time * speed * 0.15) * 0.2;
    groupRef.current.rotation.z = Math.cos(time * speed * 0.1) * 0.1;
  });
  
  return (
    <group ref={groupRef}>
      {/* Create a cube with rounded corners instead of a sphere */}
      <mesh>
        <boxGeometry args={[1.8, 1.8, 1.8, 1, 1, 1]} />
        <meshStandardMaterial 
          color={actualColor}
          emissive={emissive}
          emissiveIntensity={0.5}
          roughness={0.1}
          metalness={0.9}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Add a slightly larger, more transparent cube at a different rotation */}
      <mesh rotation={[Math.PI/4, Math.PI/4, 0]}>
        <boxGeometry args={[1.9, 1.9, 1.9, 1, 1, 1]} />
        <meshStandardMaterial 
          color={actualColor}
          emissive={emissive}
          emissiveIntensity={0.3}
          transparent
          opacity={0.3}
          roughness={0.05}
          metalness={0.8}
        />
      </mesh>
      
      {/* Add a third layer with octahedron for more complexity */}
      <mesh rotation={[Math.PI/3, Math.PI/5, Math.PI/6]}>
        <octahedronGeometry args={[1.4, 0]} />
        <meshStandardMaterial 
          color={actualColor}
          emissive={emissive}
          emissiveIntensity={0.4}
          transparent
          opacity={0.5}
          roughness={0.1}
          metalness={0.7}
        />
      </mesh>
      
      {/* Add a small inner dodecahedron core */}
      <mesh>
        <dodecahedronGeometry args={[0.9, 0]} />
        <meshStandardMaterial 
          color={actualColor}
          emissive={emissive}
          emissiveIntensity={0.6}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>
    </group>
  );
};

interface KasinaOrbProps {
  type: KasinaType;
  color: string;
  emissive?: string;
  speed?: number;
  complexity?: number;
}

const KasinaOrb = ({ 
  type,
  color,
  emissive,
  speed = 0.5,
  complexity = 2
}: KasinaOrbProps) => {
  // Determine if this is a color or elemental kasina
  const isColorKasina = ["white", "blue", "red", "yellow"].includes(type);
  const isElementalKasina = ["water", "air", "fire", "earth", "space", "light"].includes(type);
  
  // Special case for water kasina to avoid seam issues
  if (type === "water") {
    return <WaterKasina color={color} emissive={emissive} speed={speed} />;
  }
  
  if (isColorKasina) {
    return (
      <ColorKasina
        color={color}
        emissive={emissive}
        speed={speed}
        pulsate={true}
      />
    );
  }
  
  if (isElementalKasina) {
    return (
      <ElementalKasina
        type={type as any}
        color={color}
        emissive={emissive}
        speed={speed}
        complexity={complexity}
      />
    );
  }
  
  // Fallback to blue color kasina if type is not recognized
  return <ColorKasina color="#0000FF" speed={0.4} />;
};

export default KasinaOrb;