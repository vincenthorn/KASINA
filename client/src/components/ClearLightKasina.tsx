import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ClearLightKasina: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (meshRef.current) {
      // Gentle rotation
      meshRef.current.rotation.y = time * 0.1;
      meshRef.current.rotation.z = Math.sin(time * 0.3) * 0.1;
      
      // Subtle pulsing scale effect
      const scale = 1 + Math.sin(time * 0.8) * 0.05;
      meshRef.current.scale.setScalar(scale);
    }
    
    if (glowRef.current) {
      // Glow effect rotation
      glowRef.current.rotation.y = -time * 0.05;
      
      // Pulsing glow intensity
      const glowScale = 1.3 + Math.sin(time * 0.6) * 0.1;
      glowRef.current.scale.setScalar(glowScale);
    }
  });

  return (
    <group>
      {/* Main Clear Light orb */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhongMaterial 
          color="#FFD700"
          emissive="#FFFF88"
          emissiveIntensity={0.3}
          shininess={100}
          transparent={true}
          opacity={0.9}
        />
      </mesh>
      
      {/* Outer glow effect */}
      <mesh ref={glowRef} position={[0, 0, 0]}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshBasicMaterial 
          color="#FFFF99"
          transparent={true}
          opacity={0.2}
          side={THREE.BackSide}
        />
      </mesh>
      
      {/* Inner light core */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshBasicMaterial 
          color="#FFFFFF"
          transparent={true}
          opacity={0.6}
        />
      </mesh>
      
      {/* Radial light rays */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const x = Math.cos(angle) * 1.5;
        const z = Math.sin(angle) * 1.5;
        
        return (
          <mesh key={i} position={[x, 0, z]} rotation={[0, angle, 0]}>
            <planeGeometry args={[0.1, 2]} />
            <meshBasicMaterial 
              color="#FFFF88"
              transparent={true}
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
      
      {/* Point light for illumination */}
      <pointLight 
        position={[0, 0, 0]} 
        color="#FFFF99" 
        intensity={0.8} 
        distance={10} 
      />
    </group>
  );
};

export default ClearLightKasina;