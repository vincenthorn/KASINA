import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SimpleKasinaRendererProps {
  selectedKasina: string;
  sizeMultiplier: number;
  breathValue?: number;
}

// Simple, stable materials without complex shaders
const SimpleMaterials = {
  space: new THREE.MeshBasicMaterial({ color: '#1a1a2e' }),
  water: new THREE.MeshBasicMaterial({ color: '#0065b3' }),
  fire: new THREE.MeshBasicMaterial({ color: '#ff6600' }),
  air: new THREE.MeshBasicMaterial({ color: '#d3f0ff' }),
  earth: new THREE.MeshBasicMaterial({ color: '#8b4513' }),
  light: new THREE.MeshBasicMaterial({ color: '#ffffcc' })
};

const SimpleKasinaRenderer: React.FC<SimpleKasinaRendererProps> = ({
  selectedKasina,
  sizeMultiplier,
  breathValue = 1.0
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      // Simple breathing animation
      const scale = sizeMultiplier * breathValue;
      meshRef.current.scale.setScalar(scale);
      
      // Gentle rotation
      meshRef.current.rotation.y += 0.002;
    }
  });

  // Get material for selected kasina
  const getMaterial = () => {
    return SimpleMaterials[selectedKasina] || SimpleMaterials.space;
  };

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[1, 32, 32]} />
      <primitive object={getMaterial()} />
    </mesh>
  );
};

export default SimpleKasinaRenderer;