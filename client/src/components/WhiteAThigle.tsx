import React, { useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimpleTimer } from '../lib/stores/useSimpleTimer';

// Standalone component to render the White A Thigle kasina
const WhiteAThigle = () => {
  // Create refs for meshes so we can animate them
  const groupRef = React.useRef<THREE.Group>(null);
  
  // Get timer state to connect with the countdown animation
  const { 
    isRunning, 
    timeRemaining,
    duration 
  } = useSimpleTimer((state) => ({
    isRunning: state.isRunning,
    timeRemaining: state.timeRemaining,
    duration: state.duration
  }));
  
  // State to track if we're in the final countdown phase (0-60 seconds)
  const [inFinalCountdown, setInFinalCountdown] = useState(false);
  const [countdownScale, setCountdownScale] = useState(1.0);
  
  // Use a simple approach to track the countdown and update visuals
  useEffect(() => {
    // Gracefully handle the case where timeRemaining is null
    if (timeRemaining === null) {
      // If timer is not set, make sure we're showing the full-size kasina
      if (inFinalCountdown) {
        setInFinalCountdown(false);
      }
      if (countdownScale !== 1.0) {
        setCountdownScale(1.0);
      }
      return;
    }
    
    // Check if we're in the final countdown period (60 seconds or less)
    const shouldBeInFinalCountdown = isRunning && timeRemaining <= 60 && timeRemaining > 0;
    
    // Only update if state needs to change
    if (shouldBeInFinalCountdown !== inFinalCountdown) {
      setInFinalCountdown(shouldBeInFinalCountdown);
    }
    
    // Update scale during final countdown
    if (shouldBeInFinalCountdown) {
      // Scale from 1.0 down to 0.1 as timeRemaining goes from 60 to 0
      const newScale = Math.max(0.1, timeRemaining / 60);
      
      // Avoid excessive re-renders by only updating when scale changes significantly
      if (Math.abs(newScale - countdownScale) > 0.01) {
        setCountdownScale(newScale);
      }
    } else if (countdownScale !== 1.0) {
      // Reset to full size when not in final countdown
      setCountdownScale(1.0);
    }
  }, [timeRemaining, isRunning, inFinalCountdown, countdownScale]);
  
  // Animation to make the orb float and face the camera
  useFrame(({ clock, camera }) => {
    if (groupRef.current) {
      const time = clock.getElapsedTime();
      
      // Make the group always face the camera
      groupRef.current.lookAt(camera.position);
      
      // Gentle floating motion (disabled during final countdown)
      if (!inFinalCountdown) {
        groupRef.current.position.y = Math.sin(time * 0.5) * 0.08;
        groupRef.current.position.x = Math.sin(time * 0.3) * 0.04;
        
        // Subtle breathing/pulsing effect
        const pulse = 1.0 + Math.sin(time * 0.4) * 0.02;
        groupRef.current.scale.set(pulse, pulse, pulse);
      } else {
        // During final countdown, apply shrinking scale
        groupRef.current.position.y = 0;
        groupRef.current.position.x = 0;
        groupRef.current.scale.set(countdownScale, countdownScale, countdownScale);
      }
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