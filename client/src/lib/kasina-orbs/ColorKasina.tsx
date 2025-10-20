import { useRef } from "react";
import { Mesh } from "three";

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
  
  // No animation for color kasinas - keeping them completely static without pulsing
  
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
