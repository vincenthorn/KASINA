import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimpleTimer } from '../lib/stores/useSimpleTimer';
import { useTexture } from '@react-three/drei';

// Component for the HUM Kasina 
// Deep blue orb with pulsing inner light
const HumKasina = () => {
  // Create refs for meshes so we can animate them
  const groupRef = React.useRef<THREE.Group>(null);
  
  // Load the HUM syllable texture
  const humTexture = useTexture('/images/vajrayana/hum-syllable.svg');
  
  // Get timer state directly from the store without subscription
  const timerState = useSimpleTimer.getState();
  
  // Animation to make the orb face the camera but stay stationary
  useFrame(({ clock, camera }) => {
    if (!groupRef.current) return;
    
    // Always make the group face the camera
    groupRef.current.lookAt(camera.position);
    
    // Get current timer state in each frame
    const currentState = useSimpleTimer.getState();
    const { isRunning, timeRemaining } = currentState;
    
    // Calculate time and animation values
    const time = clock.getElapsedTime();
    let scale = 1.0;
    
    // Check if we should show the countdown animation
    const inFinalCountdown = isRunning && 
                         timeRemaining !== null && 
                         timeRemaining <= 60 && 
                         timeRemaining > 0;
    
    if (inFinalCountdown) {
      // During final countdown, calculate scale based on remaining time
      scale = Math.max(0.1, (timeRemaining as number) / 60);
      
      // Apply position and scale for countdown
      groupRef.current.position.y = 0;
      groupRef.current.position.x = 0;
      groupRef.current.scale.set(scale, scale, scale);
    } else {
      // Keep the kasina stationary as requested
      groupRef.current.position.y = 0;
      groupRef.current.position.x = 0;
      
      // Very subtle pulsing effect
      const pulse = 1.0 + Math.sin(time * 0.2) * 0.01;
      groupRef.current.scale.set(pulse, pulse, pulse);
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Black background with hint of blue */}
      <mesh position={[0, 0, -0.006]}>
        <circleGeometry args={[1.0, 64]} />
        <meshBasicMaterial color="#000022" />
      </mesh>
      
      {/* Outer dark blue aura */}
      <mesh position={[0, 0, -0.005]}>
        <circleGeometry args={[0.85, 64]} />
        <meshBasicMaterial 
          color="#000066" 
          transparent={true}
          opacity={0.7}
        />
      </mesh>
      
      {/* Medium blue layer */}
      <mesh position={[0, 0, -0.004]}>
        <circleGeometry args={[0.7, 64]} />
        <meshBasicMaterial 
          color="#0000aa" 
          transparent={true}
          opacity={0.85}
        />
      </mesh>
      
      {/* Deep blue orb body */}
      <mesh position={[0, 0, -0.003]}>
        <circleGeometry args={[0.55, 64]} />
        <meshBasicMaterial color="#0022aa" />
      </mesh>
      
      {/* HUM symbol area - electric blue */}
      <mesh position={[0, 0, -0.002]}>
        <circleGeometry args={[0.3, 64]} />
        <meshBasicMaterial color="#0044ff" />
      </mesh>
      
      {/* White outline around the symbol */}
      <mesh position={[0, 0, -0.001]}>
        <ringGeometry args={[0.28, 0.32, 32]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      {/* 3D Shadow effect for HUM Syllable */}
      <mesh position={[0.008, -0.008, 0.002]}>
        <planeGeometry args={[0.8, 0.8]} />
        <meshBasicMaterial 
          map={humTexture} 
          transparent={true}
          opacity={0.6}
          color="#000044"
        />
      </mesh>
      
      {/* HUM Syllable - larger with 3D effect */}
      <mesh position={[0, 0, 0.003]}>
        <planeGeometry args={[0.8, 0.8]} />
        <meshBasicMaterial 
          map={humTexture} 
          transparent={true}
          opacity={1}
          color="#ffffff"
        />
      </mesh>
      
      {/* Removed the inner core blue dot as requested */}
    </group>
  );
};

export default HumKasina;