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
  
  // Create glow materials with bloom effect for each color
  const redGlowMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color("#ff0000"),
      transparent: true,
      opacity: 0.9,
    });
  }, []);
  
  const orangeGlowMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color("#ff8800"),
      transparent: true,
      opacity: 0.9,
    });
  }, []);
  
  const yellowGlowMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color("#ffff00"),
      transparent: true,
      opacity: 0.9,
    });
  }, []);
  
  const greenGlowMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color("#00cc00"),
      transparent: true,
      opacity: 0.9,
    });
  }, []);
  
  // Create lower opacity versions for the blur/glow effect
  const redBlurMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color("#ff0000"),
      transparent: true,
      opacity: 0.5,
    });
  }, []);
  
  const orangeBlurMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color("#ff8800"),
      transparent: true,
      opacity: 0.5,
    });
  }, []);
  
  const yellowBlurMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color("#ffff00"),
      transparent: true,
      opacity: 0.5,
    });
  }, []);
  
  const greenBlurMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color("#00cc00"),
      transparent: true,
      opacity: 0.5,
    });
  }, []);

  return (
    <group ref={groupRef}>
      {/* Brighter blue-violet background that fills the entire kasina */}
      <mesh position={[0, 0, -0.008]}>
        <circleGeometry args={[1.0, 64]} />
        <meshBasicMaterial color="#2200cc" />
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
      
      {/* Blue-violet center */}
      <mesh position={[0, 0, 0.001]}>
        <circleGeometry args={[0.51, 64]} />
        <meshBasicMaterial color="#2200cc" />
      </mesh>
    </group>
  );
};

export default RainbowKasina;