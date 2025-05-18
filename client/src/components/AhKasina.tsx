import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimpleTimer } from '../lib/stores/useSimpleTimer';
import { useTexture } from '@react-three/drei';

// Component for the AH Kasina 
// Deep red orb with golden glow and fiery, ember-like core
const AhKasina = () => {
  // Create refs for meshes so we can animate them
  const groupRef = React.useRef<THREE.Group>(null);
  
  // Load the AH syllable texture
  const ahTexture = useTexture('/images/vajrayana/ah-syllable.svg');
  
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
  
  // Animation to make the orb background float but keep the AH syllable stationary
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
      // Only animate the background with subtle pulsing
      // Keep the AH syllable stationary by not changing x and y positions
      groupRef.current.position.y = 0;
      groupRef.current.position.x = 0;
      
      // Subtle fiery flickering effect with slower, gentler pulses
      const pulse = 1.0 + Math.sin(time * 0.4) * 0.02;
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
      
      {/* 3D Shadow effect for AH Syllable */}
      <mesh position={[0.008, -0.008, 0.002]}>
        <planeGeometry args={[0.8, 0.8]} />
        <meshBasicMaterial 
          map={ahTexture} 
          transparent={true}
          opacity={0.5}
          color="#222222"
        />
      </mesh>
      
      {/* AH Syllable - now larger with black color */}
      <mesh position={[0, 0, 0.003]}>
        <planeGeometry args={[0.8, 0.8]} />
        <meshBasicMaterial 
          map={ahTexture} 
          transparent={true}
          opacity={1}
          color="#000000"
        />
      </mesh>
      
      {/* Removed the yellow ember core as requested */}
    </group>
  );
};

export default AhKasina;