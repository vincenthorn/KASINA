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
      // Calmer floating movement - more meditative, breath-like
      groupRef.current.position.y = Math.sin(time * 0.4) * 0.06;
      groupRef.current.position.x = Math.sin(time * 0.3) * 0.02;
      
      // Breath-synchronized pulsing effect (slower, deeper pulse)
      // 4-second breathing cycle (approximately)
      const breatheCycle = Math.sin(time * 1.5);
      const pulse = 1.0 + breatheCycle * 0.03;
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
      
      {/* Inner core */}
      <mesh position={[0, 0, 0.001]}>
        <circleGeometry args={[0.08, 32]} />
        <meshBasicMaterial color="#aaddff" />
      </mesh>
    </group>
  );
};

export default HumKasina;