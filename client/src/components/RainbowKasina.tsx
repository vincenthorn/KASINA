import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimpleTimer } from '../lib/stores/useSimpleTimer';

// Standalone component to render the Rainbow Kasina - a glowing rainbow circle
// with green on the inside, followed by yellow, orange, red, with blue-violet background
const RainbowKasina = () => {
  // Create refs for meshes so we can animate them
  const groupRef = React.useRef<THREE.Group>(null);
  
  // Animation to make the orb face the camera and handle timer countdown
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
      // Keep the kasina stationary
      groupRef.current.position.y = 0;
      groupRef.current.position.x = 0;
      
      // Very minimal pulsing effect
      const pulse = 1.0 + Math.sin(time * 0.2) * 0.01;
      groupRef.current.scale.set(pulse, pulse, pulse);
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Brighter blue-violet background that fills the entire kasina */}
      <mesh position={[0, 0, -0.006]}>
        <circleGeometry args={[1.0, 64]} />
        <meshBasicMaterial color="#2200cc" />
      </mesh>
      
      {/* Ultra-compressed rainbow rings - 30x more compressed than original */}
      
      {/* Red outer ring of the rainbow */}
      <mesh position={[0, 0, -0.005]}>
        <circleGeometry args={[0.55, 64]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      
      {/* Orange ring */}
      <mesh position={[0, 0, -0.004]}>
        <circleGeometry args={[0.54, 64]} />
        <meshBasicMaterial color="#ff8800" />
      </mesh>
      
      {/* Yellow ring */}
      <mesh position={[0, 0, -0.003]}>
        <circleGeometry args={[0.53, 64]} />
        <meshBasicMaterial color="#ffff00" />
      </mesh>
      
      {/* Green inner ring */}
      <mesh position={[0, 0, -0.002]}>
        <circleGeometry args={[0.52, 64]} />
        <meshBasicMaterial color="#00cc00" />
      </mesh>
      
      {/* Blue-violet center */}
      <mesh position={[0, 0, -0.001]}>
        <circleGeometry args={[0.51, 64]} />
        <meshBasicMaterial color="#2200cc" />
      </mesh>
    </group>
  );
};

export default RainbowKasina;