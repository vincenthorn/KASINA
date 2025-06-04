import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Cloud } from '@react-three/drei';
import * as THREE from 'three';

interface EnvironmentProps {
  meditationDepth: number;
  breathingRate: number;
  focusLevel: number;
  timeOfDay: 'dawn' | 'day' | 'dusk' | 'night';
  environment: 'forest' | 'ocean' | 'space' | 'mountain';
}

function FloatingParticles({ count, color, speed }: { count: number; color: string; speed: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  const positionsRef = useRef<Float32Array>();

  useEffect(() => {
    if (particlesRef.current) {
      const positions = new Float32Array(count * 3);
      const velocities = new Float32Array(count * 3);
      
      for (let i = 0; i < count * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 20;
        positions[i + 1] = (Math.random() - 0.5) * 20;
        positions[i + 2] = (Math.random() - 0.5) * 20;
        
        velocities[i] = (Math.random() - 0.5) * 0.02;
        velocities[i + 1] = (Math.random() - 0.5) * 0.02;
        velocities[i + 2] = (Math.random() - 0.5) * 0.02;
      }
      
      particlesRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particlesRef.current.userData = { velocities };
      positionsRef.current = positions;
    }
  }, [count]);

  useFrame(() => {
    if (particlesRef.current && positionsRef.current) {
      const positions = positionsRef.current;
      const velocities = particlesRef.current.userData.velocities;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i] * speed;
        positions[i + 1] += velocities[i + 1] * speed;
        positions[i + 2] += velocities[i + 2] * speed;
        
        // Wrap around boundaries
        if (Math.abs(positions[i]) > 10) velocities[i] *= -1;
        if (Math.abs(positions[i + 1]) > 10) velocities[i + 1] *= -1;
        if (Math.abs(positions[i + 2]) > 10) velocities[i + 2] *= -1;
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry />
      <pointsMaterial size={0.1} color={color} transparent opacity={0.8} />
    </points>
  );
}

function BreathingOrb({ intensity, color }: { intensity: number; color: string }) {
  const orbRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (orbRef.current) {
      const time = state.clock.getElapsedTime();
      const breathScale = 1 + Math.sin(time * intensity) * 0.3;
      orbRef.current.scale.setScalar(breathScale);
      
      const material = orbRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.2 + Math.sin(time * intensity) * 0.1;
    }
  });

  return (
    <mesh ref={orbRef} position={[0, 0, 0]}>
      <sphereGeometry args={[0.8, 32, 32]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.7}
        emissive={color}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}

function DynamicLighting({ timeOfDay, focusLevel }: { timeOfDay: string; focusLevel: number }) {
  const lightRef = useRef<THREE.DirectionalLight>(null);

  useFrame((state) => {
    if (lightRef.current) {
      const time = state.clock.getElapsedTime();
      const flickerIntensity = 0.8 + Math.sin(time * 2) * 0.1 * (focusLevel / 100);
      lightRef.current.intensity = flickerIntensity;
    }
  });

  const getLightColor = () => {
    switch (timeOfDay) {
      case 'dawn': return '#ffa94d';
      case 'day': return '#ffffff';
      case 'dusk': return '#ff6b6b';
      case 'night': return '#4c6ef5';
      default: return '#ffffff';
    }
  };

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight
        ref={lightRef}
        position={[5, 5, 5]}
        intensity={0.8}
        color={getLightColor()}
      />
      <pointLight position={[-5, -5, -5]} intensity={0.4} color="#9775fa" />
    </>
  );
}

function EnvironmentElements({ environment, depth }: { environment: string; depth: number }) {
  const particleCount = Math.floor(50 + depth * 2);
  
  const getEnvironmentConfig = () => {
    switch (environment) {
      case 'forest':
        return { color: '#51cf66', speed: 0.5, bgColor: '#2d5016' };
      case 'ocean':
        return { color: '#339af0', speed: 0.8, bgColor: '#0c4a6e' };
      case 'space':
        return { color: '#e599f7', speed: 0.3, bgColor: '#000000' };
      case 'mountain':
        return { color: '#ffd43b', speed: 0.4, bgColor: '#3c2e26' };
      default:
        return { color: '#74c0fc', speed: 0.6, bgColor: '#1e3a8a' };
    }
  };

  const config = getEnvironmentConfig();

  return (
    <>
      <FloatingParticles count={particleCount} color={config.color} speed={config.speed} />
      {environment === 'space' && <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />}
    </>
  );
}

export default function DynamicAmbientEnvironment({
  meditationDepth,
  breathingRate,
  focusLevel,
  timeOfDay,
  environment
}: EnvironmentProps) {
  const [currentDepth, setCurrentDepth] = useState(meditationDepth);
  const [isInteractive, setIsInteractive] = useState(true);

  useEffect(() => {
    setCurrentDepth(meditationDepth);
  }, [meditationDepth]);

  const getOrbColor = () => {
    if (currentDepth > 80) return '#9775fa';
    if (currentDepth > 60) return '#4c6ef5';
    if (currentDepth > 40) return '#51cf66';
    return '#ffd43b';
  };

  return (
    <div className="w-full h-96 relative rounded-lg overflow-hidden">
      <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
        <DynamicLighting timeOfDay={timeOfDay} focusLevel={focusLevel} />
        <EnvironmentElements environment={environment} depth={currentDepth} />
        <BreathingOrb intensity={breathingRate} color={getOrbColor()} />
        
        {isInteractive && (
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.5 + (currentDepth / 200)}
          />
        )}
      </Canvas>
      
      <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded text-sm">
        {environment.charAt(0).toUpperCase() + environment.slice(1)} • {timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)}
      </div>
      
      <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded text-sm">
        Depth: {Math.round(currentDepth)}%
      </div>
    </div>
  );
}