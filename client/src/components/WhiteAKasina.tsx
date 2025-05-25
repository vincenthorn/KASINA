import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimpleTimer } from '../lib/stores/useSimpleTimer';
import { useTexture } from '@react-three/drei';

// Standalone component to render the White A Kasina - using the complete thigle design
const WhiteAKasina = () => {
  // Create refs for meshes so we can animate them
  const groupRef = React.useRef<THREE.Group>(null);
  
  // Load the Tibetan A letter - using a working SVG file
  const aTexture = useTexture('/images/vajrayana/letter-a-thun.svg');
  
  // Store timer-related info for smooth counting
  const timerRef = React.useRef<{
    startTime: number | null;
    initialRemainingTime: number | null;
  }>({
    startTime: null,
    initialRemainingTime: null
  });
  
  // Animation to make the orb face the camera and handle countdown
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
      // TRUE SMOOTH ANIMATION APPROACH
      // Detect if we just entered the countdown or need to recalibrate
      const now = performance.now();
      if (
        timerRef.current.startTime === null || 
        timerRef.current.initialRemainingTime === null ||
        timerRef.current.initialRemainingTime !== timeRemaining
      ) {
        // Initialize or recalibrate the high-precision timer
        timerRef.current.startTime = now;
        timerRef.current.initialRemainingTime = timeRemaining;
      }
      
      // Time elapsed since we started counting the current second (in milliseconds)
      const elapsedSinceLastSecond = now - timerRef.current.startTime;
      
      // Convert to seconds for easier calculation
      const elapsedSeconds = elapsedSinceLastSecond / 1000;
      
      // Calculate precise remaining time with millisecond precision
      const preciseRemainingTime = Math.max(0, timerRef.current.initialRemainingTime - elapsedSeconds);
      
      // Calculate scale based on the precise remaining time (out of 60)
      scale = Math.max(0.1, preciseRemainingTime / 60);
      
      // Apply position and scale for countdown
      groupRef.current.position.y = 0;
      groupRef.current.position.x = 0;
      groupRef.current.scale.set(scale, scale, scale);
    } else {
      // Reset timer tracking when not in countdown
      timerRef.current.startTime = null;
      timerRef.current.initialRemainingTime = null;
      
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
      {/* Blue outer circle */}
      <mesh position={[0, 0, -0.006]}>
        <circleGeometry args={[1.0, 64]} />
        <meshBasicMaterial color="#0000ff" />
      </mesh>
      
      {/* Yellow ring */}
      <mesh position={[0, 0, -0.005]}>
        <circleGeometry args={[0.85, 64]} />
        <meshBasicMaterial color="#ffff00" />
      </mesh>
      
      {/* Red ring */}
      <mesh position={[0, 0, -0.004]}>
        <circleGeometry args={[0.7, 64]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      
      {/* White ring */}
      <mesh position={[0, 0, -0.003]}>
        <circleGeometry args={[0.55, 64]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      {/* Green ring */}
      <mesh position={[0, 0, -0.002]}>
        <circleGeometry args={[0.4, 64]} />
        <meshBasicMaterial color="#00ff00" />
      </mesh>
      
      {/* Blue center */}
      <mesh position={[0, 0, -0.001]}>
        <circleGeometry args={[0.25, 64]} />
        <meshBasicMaterial color="#0000ff" />
      </mesh>
      
      {/* Tibetan A symbol */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[0.8, 0.8]} />
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