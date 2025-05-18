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
  const waveRef = React.useRef<THREE.Mesh>(null);
  const shimmerRef = React.useRef<THREE.Mesh>(null);
  
  // Load the HUM syllable texture
  const humTexture = useTexture('/images/vajrayana/hum-syllable.svg');
  
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
  
  // Animation for ocean/water-like wave effects
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
    
    // Animate the wave and shimmer effects when not in countdown
    if (waveRef.current) {
      // Create a gentle ocean wave effect with smooth sine wave
      const waveAmplitude = 0.02; // subtle wave
      const waveFrequency = 0.4;  // slow, breath-like
      const wave = Math.sin(time * waveFrequency) * waveAmplitude;
      
      // Apply wave effect to the oceanic layer
      waveRef.current.scale.set(
        1.0 + wave,
        1.0 + wave,
        1.0
      );
      
      // Gently vary the opacity for subtle shimmer
      const material = waveRef.current.material as THREE.MeshBasicMaterial;
      if (material) {
        // Create subtle shimmer effect with slight opacity variation
        const shimmerEffect = 0.9 + Math.sin(time * 1.2) * 0.05;
        material.opacity = shimmerEffect;
      }
    }
    
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
      // Keep the kasina stationary as requested
      groupRef.current.position.y = 0;
      groupRef.current.position.x = 0;
      
      // Smooth breath-like pulsing for the overall kasina
      const pulse = 1.0 + Math.sin(time * 0.3) * 0.015;
      groupRef.current.scale.set(pulse, pulse, pulse);
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Dark background to contrast with the blue */}
      <mesh position={[0, 0, -0.006]}>
        <circleGeometry args={[1.0, 64]} />
        <meshBasicMaterial color="#000022" />
      </mesh>
      
      {/* Outer halo - light blue aura */}
      <mesh position={[0, 0, -0.005]}>
        <circleGeometry args={[0.85, 64]} />
        <meshBasicMaterial 
          color="#99ccff" 
          transparent={true}
          opacity={0.7}
        />
      </mesh>
      
      {/* Mid glow - deep indigo/navy */}
      <mesh position={[0, 0, -0.004]}>
        <circleGeometry args={[0.7, 64]} />
        <meshBasicMaterial 
          color="#003366" 
          transparent={true}
          opacity={0.85}
        />
      </mesh>
      
      {/* Oceanic depth transition layer */}
      <mesh position={[0, 0, -0.003]} ref={waveRef}>
        <circleGeometry args={[0.55, 64]} />
        <meshBasicMaterial 
          color="#0066cc" 
          transparent={true}
          opacity={0.9}
        />
      </mesh>
      
      {/* Inner core - brilliant blue */}
      <mesh position={[0, 0, -0.002]}>
        <circleGeometry args={[0.3, 64]} />
        <meshBasicMaterial color="#3399ff" />
      </mesh>
      
      {/* White outline around the symbol */}
      <mesh position={[0, 0, -0.001]}>
        <ringGeometry args={[0.28, 0.32, 32]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      {/* HUM Syllable - without 3D effect */}
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