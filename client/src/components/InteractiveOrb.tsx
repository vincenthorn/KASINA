import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Text } from '@react-three/drei';
import * as THREE from 'three';

interface InteractiveOrbProps {
  color?: string;
  size?: number;
  breathingRate?: number;
  userInteraction?: boolean;
  onInteraction?: (intensity: number) => void;
}

function AnimatedSphere({ color, size, breathingRate, onInteraction }: {
  color: string;
  size: number;
  breathingRate: number;
  onInteraction?: (intensity: number) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [pulseIntensity, setPulseIntensity] = useState(1);

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      
      // Breathing animation
      const breathScale = 1 + Math.sin(time * breathingRate) * 0.2;
      
      // Interactive pulse
      const interactionScale = clicked ? 1.3 : (hovered ? 1.1 : 1);
      
      // Combine animations
      const finalScale = breathScale * interactionScale * pulseIntensity;
      meshRef.current.scale.setScalar(finalScale);
      
      // Gentle rotation
      meshRef.current.rotation.y = time * 0.1;
      meshRef.current.rotation.x = Math.sin(time * 0.2) * 0.1;
    }
  });

  const handleClick = () => {
    setClicked(true);
    setPulseIntensity(1.5);
    
    // Create ripple effect
    setTimeout(() => {
      setPulseIntensity(1);
      setClicked(false);
    }, 300);
    
    onInteraction?.(pulseIntensity);
  };

  return (
    <Sphere
      ref={meshRef}
      args={[size, 32, 32]}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.8}
        emissive={color}
        emissiveIntensity={hovered ? 0.3 : 0.1}
      />
    </Sphere>
  );
}

function ParticleField() {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 100;

  useEffect(() => {
    if (particlesRef.current) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      
      for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 20;
        positions[i + 1] = (Math.random() - 0.5) * 20;
        positions[i + 2] = (Math.random() - 0.5) * 20;
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particlesRef.current.geometry = geometry;
    }
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <points ref={particlesRef}>
      <pointsMaterial size={0.05} color="#ffffff" transparent opacity={0.6} />
    </points>
  );
}

export default function InteractiveOrb({
  color = "#4A90E2",
  size = 1,
  breathingRate = 1,
  userInteraction = true,
  onInteraction
}: InteractiveOrbProps) {
  const [interactionCount, setInteractionCount] = useState(0);

  const handleInteraction = (intensity: number) => {
    setInteractionCount(prev => prev + 1);
    onInteraction?.(intensity);
  };

  return (
    <div className="w-full h-96 relative">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff6b6b" />
        
        <ParticleField />
        <AnimatedSphere
          color={color}
          size={size}
          breathingRate={breathingRate}
          onInteraction={handleInteraction}
        />
        
        {userInteraction && (
          <Text
            position={[0, -2.5, 0]}
            fontSize={0.3}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {interactionCount > 0 ? `Interactions: ${interactionCount}` : "Click to interact"}
          </Text>
        )}
        
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
}