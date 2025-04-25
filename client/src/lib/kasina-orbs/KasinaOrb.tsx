import { useEffect, useState, useRef } from "react";
import { KasinaType } from "../types";
import ColorKasina from "./ColorKasina";
import ElementalKasina from "./ElementalKasina";
import { useFrame } from "@react-three/fiber";
import { Mesh, MeshStandardMaterial, Color, Group } from "three";

// Special optimized water kasina component to solve the seam issue
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

// Fire kasina with expanding/contracting orange sunspots
interface FireKasinaProps {
  color: string;
  emissive?: string;
  speed?: number;
}

const FireKasina = ({ 
  color, 
  emissive = color, 
  speed = 0.5 
}: FireKasinaProps) => {
  const groupRef = useRef<Group>(null);
  const coreRef = useRef<Mesh>(null);
  const spotsRef = useRef<Group>(null);
  const [sunspots, setSunspots] = useState<{ position: [number, number, number], scale: number }[]>([]);
  
  // Generate sunspots at consistent positions
  useEffect(() => {
    const spots = [];
    // Create 5 sunspots at various positions on the sphere
    spots.push({ position: [0.4, 0.6, 0.7], scale: 0.25 });
    spots.push({ position: [-0.6, 0.4, 0.5], scale: 0.3 });
    spots.push({ position: [0.3, -0.5, 0.6], scale: 0.2 });
    spots.push({ position: [-0.5, -0.3, 0.7], scale: 0.35 });
    spots.push({ position: [0.1, 0.2, 0.9], scale: 0.28 });
    
    // Normalize all positions to lie on the sphere surface
    const normalizedSpots = spots.map(spot => {
      const pos = spot.position;
      const length = Math.sqrt(pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2]);
      return {
        position: [pos[0] / length, pos[1] / length, pos[2] / length] as [number, number, number],
        scale: spot.scale
      };
    });
    
    setSunspots(normalizedSpots);
  }, []);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !coreRef.current || !spotsRef.current) return;
    
    const time = clock.getElapsedTime();
    
    // Long cycle over 15 seconds for expanding/contracting (as requested: 10-20 seconds)
    const cycleLength = 15;
    const expandFactor = (Math.sin(time * Math.PI / cycleLength) + 1) / 2; // 0 to 1 range
    
    // Gentle rotation for the entire fire orb
    groupRef.current.rotation.y = time * speed * 0.15;
    groupRef.current.rotation.x = Math.sin(time * speed * 0.08) * 0.1;
    
    // Animate the core with a flickering effect
    const flicker = 1 + Math.sin(time * 5) * 0.03; // Fast subtle flicker
    coreRef.current.scale.set(flicker, flicker, flicker);
    
    // Update each sunspot in the group
    if (spotsRef.current.children.length > 0) {
      // Expand each spot based on the cycle
      spotsRef.current.children.forEach((child, i) => {
        const mesh = child as Mesh;
        
        // Varying expansion factor for each spot to create natural looking non-uniform growth
        const spotTime = time + i * 0.7; // Offset time for each spot
        const localExpand = (Math.sin(spotTime * Math.PI / cycleLength) + 1) / 2;
        
        // Calculate spot scale from almost nothing to full coverage
        // Base scale is the initial value, maxScale is how big it can get
        const baseScale = sunspots[i]?.scale || 0.2;
        const maxScale = 0.8 + (i * 0.1); // Each spot can get large enough to cover most of the orb
        
        // Combined scale varies from base to max
        const finalScale = baseScale + (maxScale - baseScale) * localExpand;
        mesh.scale.set(finalScale, finalScale, finalScale);
        
        // Pulse each spot differently to create dynamic fire effect
        const pulse = 1 + Math.sin(spotTime * 3) * 0.1;
        
        // Get the material and update its emissive intensity
        const material = mesh.material as MeshStandardMaterial;
        if (material) {
          // Make spots more intense during expansion
          material.emissiveIntensity = 0.6 + (localExpand * 0.8);
        }
      });
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Base fire sphere */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.96, 32, 32]} />
        <meshStandardMaterial 
          color="#8B0000" // Dark red base
          emissive={emissive || "#FF4500"} // Bright orange-red emissive
          emissiveIntensity={0.5}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>
      
      {/* Group for sunspots */}
      <group ref={spotsRef}>
        {sunspots.map((spot, i) => (
          <mesh 
            key={i} 
            position={[
              spot.position[0] * 0.96, // Position on the surface of the core
              spot.position[1] * 0.96, 
              spot.position[2] * 0.96
            ]}
          >
            {/* Each sunspot is a small sphere positioned on the surface */}
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial 
              color="#FF6600" // Bright orange for the sunspots
              emissive="#FF8C00" // Slightly lighter emissive orange
              emissiveIntensity={0.8}
              roughness={0.4}
              transparent
              opacity={0.9}
            />
          </mesh>
        ))}
      </group>
      
      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[1.05, 32, 32]} />
        <meshStandardMaterial 
          color="#FF4500" // Orange-red
          emissive="#FF8C00" // Light orange
          emissiveIntensity={0.3}
          transparent
          opacity={0.2}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      
      {/* Fire particles will be added by ElementalKasina */}
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
  
  // Special case for fire kasina to add dynamic expanding/contracting sunspots
  if (type === "fire") {
    return <FireKasina color={color} emissive={emissive} speed={speed} />;
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