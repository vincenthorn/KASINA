import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimpleTimer } from '../lib/stores/useSimpleTimer';

// Rainbow Kasina with blended colors using a shader approach
const RainbowKasina = () => {
  // Create ref for the group
  const groupRef = useRef<THREE.Group>(null);
  
  // Create ref for the shader material
  const shaderRef = useRef<THREE.ShaderMaterial | null>(null);
  
  // Define the rainbow shader - this will create smooth, blended rainbow colors
  const rainbowShader = useMemo(() => {
    return {
      uniforms: {
        time: { value: 0 },
        innerRadius: { value: 0.8 },
        outerRadius: { value: 0.9 },
        rainbowWidth: { value: 0.1 },
        glowStrength: { value: 0.4 },
        pulseIntensity: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float innerRadius;
        uniform float outerRadius;
        uniform float rainbowWidth;
        uniform float glowStrength;
        uniform float pulseIntensity;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        
        // Convert HSV to RGB
        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }
        
        void main() {
          // Distance from center (0,0)
          float dist = length(vPosition.xy);
          
          // Create smooth blue-violet background (#1F00CC)
          vec3 bgColor = vec3(0.122, 0.0, 0.8); // blue-violet matching exact background
          
          // Initialize with background color - this ensures the entire geometry is the background color
          vec3 finalColor = bgColor;
          float alpha = 1.0;
          
          // Rainbow ring parameters
          float ringCenter = (innerRadius + outerRadius) * 0.5;
          float normalizedPos = clamp((dist - innerRadius) / rainbowWidth, 0.0, 1.0);
          
          // Create smooth ring mask with soft edges - no hard boundaries
          float innerEdge = smoothstep(innerRadius - 0.03, innerRadius + 0.02, dist);
          float outerEdge = 1.0 - smoothstep(outerRadius - 0.02, outerRadius + 0.03, dist);
          float ringMask = innerEdge * outerEdge;
          
          // Only calculate rainbow color where needed
          if (ringMask > 0.001) {
            // Animate hue shift over time
            float timeShift = sin(time * 0.2) * 0.01;
            
            // Create rainbow colors that blend naturally
            // Map position within the ring to hue (0-1)
            // Green in the middle, red on outside, yellow in between
            float hue = mix(0.3, 0.0, normalizedPos) + timeShift;
            
            // Make saturation and value slightly pulse
            float sat = 0.9 + sin(time * 0.5 + normalizedPos * 6.0) * 0.1;
            float val = 0.9 + sin(time * 0.3 + normalizedPos * 4.0) * 0.1;
            
            // Convert HSV to RGB
            vec3 rainbowColor = hsv2rgb(vec3(hue, sat, val));
            
            // Add subtle pulsing/breathing to the entire rainbow
            float pulse = 1.0 + sin(time * 0.3) * pulseIntensity;
            rainbowColor *= pulse;
            
            // Blend rainbow with background using the soft ring mask
            finalColor = mix(bgColor, rainbowColor, ringMask);
          }
          // Outside the ring, finalColor remains bgColor - no additional effects needed
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `
    };
  }, []);
  
  // Create the shader material
  const shaderMaterial = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: rainbowShader.uniforms,
      vertexShader: rainbowShader.vertexShader,
      fragmentShader: rainbowShader.fragmentShader,
      transparent: true,
    });
    shaderRef.current = material;
    return material;
  }, [rainbowShader]);
  
  // Store timer-related info for smooth counting
  const timerRef = useRef<{
    startTime: number | null;
    initialRemainingTime: number | null;
  }>({
    startTime: null,
    initialRemainingTime: null
  });

  // Animation to make the orb face the camera and update shader uniforms
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
    
    // Update shader time uniform
    if (shaderRef.current) {
      shaderRef.current.uniforms.time.value = time;
      
      // Add subtle pulsing effect
      shaderRef.current.uniforms.pulseIntensity.value = 0.05;
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
      
      // Keep the kasina stationary
      groupRef.current.position.y = 0;
      groupRef.current.position.x = 0;
      
      // Very minimal overall pulsing effect
      const pulse = 1.0 + Math.sin(time * 0.2) * 0.01;
      groupRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Single mesh with shader material for entire rainbow kasina */}
      {/* Extended geometry (1.5 radius) so edge anti-aliasing happens in pure background area */}
      <mesh position={[0, 0, 0]}>
        <circleGeometry args={[1.5, 128]} />
        <primitive object={shaderMaterial} />
      </mesh>
    </group>
  );
};

export default RainbowKasina;