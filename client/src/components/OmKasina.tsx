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
  
  // Load the OM syllable texture with adjusted color and position
  const omTexture = useTexture('/images/vajrayana/om-syllable-final.svg');
  
  // Get timer state directly from the store without subscription
  const timerState = useSimpleTimer.getState();
  
  // Store timer-related info for smooth counting
  const timerRef = React.useRef<{
    startTime: number | null;
    initialRemainingTime: number | null;
  }>({
    startTime: null,
    initialRemainingTime: null
  });
  
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
      
      {/* 3D Shadow effect for OM Syllable - adjusted vertical position */}
      <mesh position={[0.008, -0.058, 0.001]}>
        <planeGeometry args={[0.8, 0.8]} /> 
        <meshBasicMaterial 
          map={omTexture} 
          transparent={true}
          opacity={0.5}
          color="#222266"
        />
      </mesh>
      
      {/* OM Syllable - larger and vertically centered in the inner circle */}
      <mesh position={[0, -0.05, 0.002]}>
        <planeGeometry args={[0.8, 0.8]} /> 
        <meshBasicMaterial 
          map={omTexture} 
          transparent={true}
          opacity={1.0}
          color="#0033aa" 
        />
      </mesh>
      
      {/* Inner dot - keeping it as part of the design */}
      <mesh position={[0, 0, 0.001]}>
        <circleGeometry args={[0.05, 32]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
};

export default OmKasina;