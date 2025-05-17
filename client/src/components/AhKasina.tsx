import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimpleTimer } from '../lib/stores/useSimpleTimer';

// Component for the AH Kasina 
// Deep red orb with golden glow and fiery, ember-like core
const AhKasina = () => {
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
      // Ember-like fluctuation - quicker, fire-like motion
      groupRef.current.position.y = Math.sin(time * 0.7) * 0.06;
      groupRef.current.position.x = Math.sin(time * 0.5) * 0.04;
      
      // Fiery flickering effect with faster, more dynamic pulses
      const pulse = 1.0 + Math.sin(time * 0.8) * 0.03 + Math.sin(time * 1.2) * 0.015;
      groupRef.current.scale.set(pulse, pulse, pulse);
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Dark background - black with hint of red */}
      <mesh position={[0, 0, -0.006]}>
        <circleGeometry args={[1.0, 64]} />
        <meshBasicMaterial color="#220000" />
      </mesh>
      
      {/* Outer golden glow */}
      <mesh position={[0, 0, -0.005]}>
        <circleGeometry args={[0.9, 64]} />
        <meshBasicMaterial 
          color="#663300" 
          transparent={true}
          opacity={0.7}
        />
      </mesh>
      
      {/* Inner golden glow */}
      <mesh position={[0, 0, -0.004]}>
        <circleGeometry args={[0.75, 64]} />
        <meshBasicMaterial 
          color="#995500" 
          transparent={true}
          opacity={0.85}
        />
      </mesh>
      
      {/* Deep red orb body */}
      <mesh position={[0, 0, -0.003]}>
        <circleGeometry args={[0.6, 64]} />
        <meshBasicMaterial color="#cc0000" />
      </mesh>
      
      {/* Brighter fiery core */}
      <mesh position={[0, 0, -0.002]}>
        <circleGeometry args={[0.45, 64]} />
        <meshBasicMaterial color="#ff2200" />
      </mesh>
      
      {/* Center AH symbol area */}
      <mesh position={[0, 0, -0.001]}>
        <circleGeometry args={[0.3, 64]} />
        <meshBasicMaterial color="#ff3300" />
      </mesh>
      
      {/* Ember core */}
      <mesh position={[0, 0, 0.001]}>
        <circleGeometry args={[0.1, 32]} />
        <meshBasicMaterial color="#ffdd00" />
      </mesh>
    </group>
  );
};

export default AhKasina;