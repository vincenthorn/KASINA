import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimpleTimer } from '../lib/stores/useSimpleTimer';
import { useTexture } from '@react-three/drei';

// Standalone component to render the White A Kasina - using Clear Light Thigle colors
// but with Tibetan letter "A" replacing the white dot in center
const WhiteAKasina = () => {
  // Create refs for meshes so we can animate them
  const groupRef = React.useRef<THREE.Group>(null);
  
  // Load the Tibetan 'A' syllable texture - uses actual Tibetan script character
  const aTexture = useTexture('/images/vajrayana/letter-a-thun.svg');
  
  // Animation to make the orb face the camera
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
      
      // Very subtle pulsing effect
      const pulse = 1.0 + Math.sin(time * 0.2) * 0.01;
      groupRef.current.scale.set(pulse, pulse, pulse);
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Blue background - use a larger circle for the entire background */}
      <mesh position={[0, 0, -0.006]}>
        <circleGeometry args={[1.0, 64]} />
        <meshBasicMaterial color="#0055ff" />
      </mesh>
      
      {/* Yellow ring - use full circles instead of rings to avoid gaps */}
      <mesh position={[0, 0, -0.005]}>
        <circleGeometry args={[0.95, 64]} />
        <meshBasicMaterial color="#ffff00" />
      </mesh>
      
      {/* Red ring */}
      <mesh position={[0, 0, -0.004]}>
        <circleGeometry args={[0.81, 64]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      
      {/* White ring */}
      <mesh position={[0, 0, -0.003]}>
        <circleGeometry args={[0.67, 64]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      {/* Green ring */}
      <mesh position={[0, 0, -0.002]}>
        <circleGeometry args={[0.53, 64]} />
        <meshBasicMaterial color="#00cc00" />
      </mesh>
      
      {/* Blue center - 40% larger */}
      <mesh position={[0, 0, -0.001]}>
        <circleGeometry args={[0.39, 64]} />
        <meshBasicMaterial color="#0055ff" />
      </mesh>
      
      {/* 3D Shadow effect for Tibetan 'A' symbol */}
      <mesh position={[0.03, -0.03, 0.002]}>
        <planeGeometry args={[0.9, 0.9]} />
        <meshBasicMaterial 
          map={aTexture} 
          transparent={true}
          opacity={0.5}
          color="#000066"
        />
      </mesh>
      
      {/* Tibetan 'A' symbol - 12x larger than original */}
      <mesh position={[0, 0, 0.003]}>
        <planeGeometry args={[0.9, 0.9]} />
        <meshBasicMaterial 
          map={aTexture} 
          transparent={true}
          opacity={1}
          color="#ffffff"
        />
      </mesh>
    </group>
  );
};

export default WhiteAKasina;