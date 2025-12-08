import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimpleTimer } from '../lib/stores/useSimpleTimer';

// Standalone component to render the Clear Light Thigle kasina
const WhiteAThigle = () => {
  // Create refs for meshes so we can animate them
  const groupRef = React.useRef<THREE.Group>(null);
  
  // Get timer state directly from the store without subscription
  // This prevents unnecessary re-renders
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
      
      // Keep the kasina stationary (no floating animation)
      groupRef.current.position.y = 0;
      groupRef.current.position.x = 0;
      
      // Very minimal pulsing effect
      const pulse = 1.0 + Math.sin(time * 0.2) * 0.01;
      groupRef.current.scale.set(pulse, pulse, pulse);
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Yellow outer ring - now the outermost visible element, background color handles the seamless transition */}
      <mesh position={[0, 0, -0.005]}>
        <circleGeometry args={[1.0, 64]} />
        <meshBasicMaterial color="#ffff00" />
      </mesh>
      
      {/* Red ring */}
      <mesh position={[0, 0, -0.004]}>
        <circleGeometry args={[0.73, 64]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      
      {/* White ring */}
      <mesh position={[0, 0, -0.003]}>
        <circleGeometry args={[0.53, 64]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      {/* Green ring */}
      <mesh position={[0, 0, -0.002]}>
        <circleGeometry args={[0.33, 64]} />
        <meshBasicMaterial color="#00cc00" />
      </mesh>
      
      {/* Blue center */}
      <mesh position={[0, 0, -0.001]}>
        <circleGeometry args={[0.20, 64]} />
        <meshBasicMaterial color="#0055ff" />
      </mesh>
      
      {/* White dot in center */}
      <mesh position={[0, 0, 0.001]}>
        <circleGeometry args={[0.08, 32]} />
        <meshBasicMaterial color="white" />
      </mesh>
    </group>
  );
};

export default WhiteAThigle;