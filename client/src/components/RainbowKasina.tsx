import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimpleTimer } from '../lib/stores/useSimpleTimer';
import { extend } from '@react-three/fiber';

// Standalone component to render the Rainbow Kasina - a glowing rainbow circle
// with green on the inside, followed by yellow, orange, red, with blue-violet background
const RainbowKasina = () => {
  // Create refs for meshes so we can animate them
  const groupRef = React.useRef<THREE.Group>(null);
  
  // Materials references for animation
  const redMatRef = React.useRef<THREE.MeshBasicMaterial | null>(null);
  const orangeMatRef = React.useRef<THREE.MeshBasicMaterial | null>(null);
  const yellowMatRef = React.useRef<THREE.MeshBasicMaterial | null>(null);
  const greenMatRef = React.useRef<THREE.MeshBasicMaterial | null>(null);
  
  const redBlurRef = React.useRef<THREE.MeshBasicMaterial | null>(null);
  const orangeBlurRef = React.useRef<THREE.MeshBasicMaterial | null>(null);
  const yellowBlurRef = React.useRef<THREE.MeshBasicMaterial | null>(null);
  const greenBlurRef = React.useRef<THREE.MeshBasicMaterial | null>(null);
  
  // Animation to make the orb face the camera and handle timer countdown, plus color pulsing
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
    
    // Animate rainbow bands with rippling, pulsing effects but without position change
    if (redMatRef.current && orangeMatRef.current && yellowMatRef.current && greenMatRef.current) {
      // Vary the opacity of each color slightly over time but with different frequencies
      // This creates a subtle rippling, flowing effect through the rainbow
      const redPulse = 0.8 + Math.sin(time * 0.7) * 0.2;
      const orangePulse = 0.8 + Math.sin(time * 0.5 + 1) * 0.2;
      const yellowPulse = 0.8 + Math.sin(time * 0.9 + 2) * 0.2;
      const greenPulse = 0.8 + Math.sin(time * 0.6 + 3) * 0.2;
      
      // Applying opacity variations
      redMatRef.current.opacity = redPulse;
      orangeMatRef.current.opacity = orangePulse;
      yellowMatRef.current.opacity = yellowPulse;
      greenMatRef.current.opacity = greenPulse;
      
      // Also animate the glow/blur layers with a slightly different phase
      if (redBlurRef.current && orangeBlurRef.current && yellowBlurRef.current && greenBlurRef.current) {
        redBlurRef.current.opacity = redPulse * 0.6;
        orangeBlurRef.current.opacity = orangePulse * 0.6;
        yellowBlurRef.current.opacity = yellowPulse * 0.6;
        greenBlurRef.current.opacity = greenPulse * 0.6;
      }
      
      // Subtly shift the hue of each color over time
      // Red shifts between deeper red and brighter red
      redMatRef.current.color.setHSL(
        0, // Red hue
        1, // Full saturation
        0.4 + Math.sin(time * 0.3) * 0.1 // Brightness varies
      );
      
      // Orange shifts slightly in warmth
      orangeMatRef.current.color.setHSL(
        0.05 + Math.sin(time * 0.25) * 0.01, // Slight hue shift
        1, // Full saturation
        0.5 + Math.sin(time * 0.4 + 1) * 0.08 // Brightness varies
      );
      
      // Yellow shifts in brightness
      yellowMatRef.current.color.setHSL(
        0.15, // Yellow hue
        1, // Full saturation
        0.5 + Math.sin(time * 0.5 + 2) * 0.06 // Brightness varies
      );
      
      // Green shifts between deeper and brighter green
      greenMatRef.current.color.setHSL(
        0.33 + Math.sin(time * 0.2) * 0.02, // Slight hue shift
        1, // Full saturation
        0.4 + Math.sin(time * 0.45 + 3) * 0.08 // Brightness varies
      );
    }
    
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
      
      // Very minimal overall pulsing effect
      const pulse = 1.0 + Math.sin(time * 0.2) * 0.01;
      groupRef.current.scale.set(pulse, pulse, pulse);
    }
  });
  
  // Create glow materials with bloom effect for each color
  const redGlowMaterial = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#ff0000"),
      transparent: true,
      opacity: 0.9,
    });
    redMatRef.current = material;
    return material;
  }, []);
  
  const orangeGlowMaterial = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#ff8800"),
      transparent: true,
      opacity: 0.9,
    });
    orangeMatRef.current = material;
    return material;
  }, []);
  
  const yellowGlowMaterial = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#ffff00"),
      transparent: true,
      opacity: 0.9,
    });
    yellowMatRef.current = material;
    return material;
  }, []);
  
  const greenGlowMaterial = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#00cc00"),
      transparent: true,
      opacity: 0.9,
    });
    greenMatRef.current = material;
    return material;
  }, []);
  
  // Create lower opacity versions for the blur/glow effect
  const redBlurMaterial = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#ff0000"),
      transparent: true,
      opacity: 0.5,
    });
    redBlurRef.current = material;
    return material;
  }, []);
  
  const orangeBlurMaterial = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#ff8800"),
      transparent: true,
      opacity: 0.5,
    });
    orangeBlurRef.current = material;
    return material;
  }, []);
  
  const yellowBlurMaterial = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#ffff00"),
      transparent: true,
      opacity: 0.5,
    });
    yellowBlurRef.current = material;
    return material;
  }, []);
  
  const greenBlurMaterial = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#00cc00"),
      transparent: true,
      opacity: 0.5,
    });
    greenBlurRef.current = material;
    return material;
  }, []);

  // Create a consistent background material
  const backgroundMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color("#2200cc"),
      transparent: false,
    });
  }, []);

  return (
    <group ref={groupRef}>
      {/* Brighter blue-violet background that fills the entire kasina */}
      <mesh position={[0, 0, -0.008]}>
        <circleGeometry args={[1.0, 64]} />
        <primitive object={backgroundMaterial} />
      </mesh>
      
      {/* Ultra-compressed rainbow rings with glow effect */}
      
      {/* Red outer ring - glow effect (slightly larger) */}
      <mesh position={[0, 0, -0.007]}>
        <circleGeometry args={[0.57, 64]} />
        <primitive object={redBlurMaterial} />
      </mesh>
      
      {/* Red outer ring */}
      <mesh position={[0, 0, -0.006]}>
        <circleGeometry args={[0.55, 64]} />
        <primitive object={redGlowMaterial} />
      </mesh>
      
      {/* Orange ring - glow effect (slightly larger) */}
      <mesh position={[0, 0, -0.005]}>
        <circleGeometry args={[0.56, 64]} />
        <primitive object={orangeBlurMaterial} />
      </mesh>
      
      {/* Orange ring */}
      <mesh position={[0, 0, -0.004]}>
        <circleGeometry args={[0.54, 64]} />
        <primitive object={orangeGlowMaterial} />
      </mesh>
      
      {/* Yellow ring - glow effect (slightly larger) */}
      <mesh position={[0, 0, -0.003]}>
        <circleGeometry args={[0.55, 64]} />
        <primitive object={yellowBlurMaterial} />
      </mesh>
      
      {/* Yellow ring */}
      <mesh position={[0, 0, -0.002]}>
        <circleGeometry args={[0.53, 64]} />
        <primitive object={yellowGlowMaterial} />
      </mesh>
      
      {/* Green inner ring - glow effect (slightly larger) */}
      <mesh position={[0, 0, -0.001]}>
        <circleGeometry args={[0.54, 64]} />
        <primitive object={greenBlurMaterial} />
      </mesh>
      
      {/* Green inner ring */}
      <mesh position={[0, 0, 0]}>
        <circleGeometry args={[0.52, 64]} />
        <primitive object={greenGlowMaterial} />
      </mesh>
      
      {/* Blue-violet center - use the same consistent background material */}
      <mesh position={[0, 0, 0.001]}>
        <circleGeometry args={[0.51, 64]} />
        <primitive object={backgroundMaterial} />
      </mesh>
    </group>
  );
};

export default RainbowKasina;