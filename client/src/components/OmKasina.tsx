import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimpleTimer } from '../lib/stores/useSimpleTimer';
import { useTexture } from '@react-three/drei';

// Component for the OM Kasina 
// Radiant white orb with space-like properties
const OmKasina = () => {
  // Create refs for meshes so we can animate them
  const groupRef = React.useRef<THREE.Group>(null);
  
  // Load the OM syllable texture (dark blue version to match outer circle, larger size)
  const omTexture = useTexture('/images/vajrayana/om-syllable-darkblue.svg');
  
  // Get timer state directly from the store without subscription
  const timerState = useSimpleTimer.getState();
  
  // Animation to make the orb float and face the camera
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
      // Stationary position - no floating movement
      groupRef.current.position.y = 0;
      groupRef.current.position.x = 0;
      
      // Subtle radiating pulse effect - gentler than other kasinas
      const pulse = 1.0 + Math.sin(time * 0.2) * 0.03;
      groupRef.current.scale.set(pulse, pulse, pulse);
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Deep indigo background */}
      <mesh position={[0, 0, -0.006]}>
        <circleGeometry args={[1.0, 64]} />
        <meshBasicMaterial color="#000033" />
      </mesh>
      
      {/* Outer glow - space-like radiance */}
      <mesh position={[0, 0, -0.005]}>
        <circleGeometry args={[0.9, 64]} />
        <meshBasicMaterial 
          color="#3333aa" 
          transparent={true}
          opacity={0.8}
        />
      </mesh>
      
      {/* Inner white glow */}
      <mesh position={[0, 0, -0.004]}>
        <circleGeometry args={[0.7, 64]} />
        <meshBasicMaterial 
          color="#aaaaff" 
          transparent={true}
          opacity={0.9}
        />
      </mesh>
      
      {/* White orb body */}
      <mesh position={[0, 0, -0.002]}>
        <circleGeometry args={[0.5, 64]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      {/* Center OM symbol area */}
      <mesh position={[0, 0, 0.001]}>
        <circleGeometry args={[0.3, 64]} />
        <meshBasicMaterial color="#f0f0ff" />
      </mesh>
      
      {/* OM Syllable - larger and perfectly centered */}
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[0.55, 0.55]} /> 
        <meshBasicMaterial 
          map={omTexture} 
          transparent={true}
          opacity={1.0} 
        />
      </mesh>
      
      {/* Inner dot */}
      <mesh position={[0, 0, 0.001]}>
        <circleGeometry args={[0.05, 32]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
};

export default OmKasina;