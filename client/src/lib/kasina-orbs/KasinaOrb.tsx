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
  const innerRef = useRef<Mesh>(null);
  const middleRef = useRef<Mesh>(null);
  const outerRef = useRef<Mesh>(null);
  
  // Use bright blue if color is too dark to ensure visibility
  const actualColor = new Color(color).getHSL({ h: 0, s: 0, l: 0 }).l < 0.5 
    ? "#0088ff" 
    : color;
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !innerRef.current || !middleRef.current || !outerRef.current) return;
    
    const time = clock.getElapsedTime();
    
    // Inner sphere animation - slow rotation
    innerRef.current.rotation.x = time * speed * 0.07;
    innerRef.current.rotation.y = time * speed * 0.09;
    innerRef.current.rotation.z = time * speed * 0.05;
    
    // Inner pulse
    const innerPulse = 1 + Math.sin(time * speed * 0.3) * 0.04;
    innerRef.current.scale.set(innerPulse, innerPulse, innerPulse);
    
    // Middle sphere - different rotation
    middleRef.current.rotation.x = time * speed * 0.06 + Math.PI/4;
    middleRef.current.rotation.y = -time * speed * 0.08;
    middleRef.current.rotation.z = time * speed * 0.04 + Math.PI/5;
    
    // Outer sphere - gentle pulsing
    const outerPulse = 1 + Math.sin(time * speed * 0.2 + Math.PI/3) * 0.05;
    outerRef.current.scale.set(outerPulse, outerPulse, outerPulse);
    
    // Very slight overall group rotation
    groupRef.current.rotation.y = time * speed * 0.03;
    groupRef.current.rotation.x = Math.sin(time * speed * 0.025) * 0.02;
  });
  
  return (
    <group ref={groupRef}>
      {/* Inner sphere */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.96, 64, 64]} />
        <meshStandardMaterial 
          color={actualColor}
          emissive={emissive}
          emissiveIntensity={0.5}
          roughness={0.1}
          metalness={0.8}
          envMapIntensity={1.5}
        />
      </mesh>
      
      {/* Middle sphere */}
      <mesh ref={middleRef}>
        <sphereGeometry args={[0.98, 64, 64]} />
        <meshStandardMaterial 
          color={actualColor}
          emissive={emissive}
          emissiveIntensity={0.3}
          transparent
          opacity={0.4}
          roughness={0.05}
          metalness={0.9}
          envMapIntensity={1.3}
        />
      </mesh>
      
      {/* Outer sphere */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[1.02, 64, 64]} />
        <meshStandardMaterial 
          color={actualColor}
          emissive={emissive}
          emissiveIntensity={0.2}
          transparent
          opacity={0.2}
          roughness={0.05}
          metalness={0.7}
          envMapIntensity={1.0}
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