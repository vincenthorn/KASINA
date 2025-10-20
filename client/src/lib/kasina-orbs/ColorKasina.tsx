import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial, SphereGeometry, Mesh, Vector3 } from "three";

interface ColorKasinaProps {
  color: string;
  emissive?: string;
  speed?: number;
  pulsate?: boolean;
}

const ColorKasina = ({ 
  color, 
  emissive = color, 
  speed = 0.4, 
  pulsate = true 
}: ColorKasinaProps) => {
  const meshRef = useRef<Mesh>(null);
  const initialScale = new Vector3(1, 1, 1);
  
  // Animation loop
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    
    const time = clock.getElapsedTime();
    
    // No rotation for color kasinas - keeping them completely static as requested
    // Only subtle pulsing if enabled
    if (pulsate) {
      const pulse = Math.sin(time * speed) * 0.05 + 1;
      meshRef.current.scale.copy(initialScale.clone().multiplyScalar(pulse));
    }
  });
  
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial 
        color={color} 
        emissive={emissive} 
        emissiveIntensity={0.6}
        roughness={0.2} 
        metalness={0.3}
      />
    </mesh>
  );
};

export default ColorKasina;
