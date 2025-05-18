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
        innerRadius: { value: 0.48 },
        outerRadius: { value: 0.57 },
        rainbowWidth: { value: 0.09 },
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
          vec3 bgColor = vec3(0.123, 0.0, 0.8); // blue-violet
          
          // Initialize with background color
          vec3 finalColor = bgColor;
          float alpha = 1.0;
          
          // Rainbow ring parameters
          float ringCenter = (innerRadius + outerRadius) * 0.5;
          float normalizedPos = (dist - innerRadius) / rainbowWidth;
          
          // Base glow effect around the ring
          float glow = smoothstep(outerRadius + 0.05, outerRadius - 0.05, dist) - 
                       smoothstep(innerRadius + 0.05, innerRadius - 0.05, dist);
          glow = pow(glow, 1.5) * glowStrength;
          
          // Soft falloff at edges
          float edgeFade = smoothstep(outerRadius + 0.02, outerRadius - 0.02, dist) - 
                           smoothstep(innerRadius + 0.02, innerRadius - 0.02, dist);
          
          // Only render rainbow in the ring area
          if (dist >= innerRadius && dist <= outerRadius) {
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
            
            // Create soft blur effect by adding glow
            rainbowColor += glow * 0.5;
            
            // Blend with background based on edge fade
            finalColor = mix(bgColor, rainbowColor, edgeFade);
          } else {
            // Add subtle glow outside the ring
            finalColor += glow * mix(vec3(1.0, 0.4, 0.2), vec3(0.4, 0.8, 0.0), 0.5) * 0.25;
          }
          
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
      // Get the integer and fractional parts of the remaining time for smooth animation
      const remainingSecs = timeRemaining as number;
      const prevSecond = Math.ceil(remainingSecs);
      const nextSecond = Math.floor(remainingSecs);
      const fraction = remainingSecs - nextSecond;
      
      // Calculate a smooth scale that changes continuously rather than in steps
      // This now includes the fractional part of the remaining time
      const nextScale = Math.max(0.1, nextSecond / 60);
      const prevScale = Math.max(0.1, prevSecond / 60);
      scale = prevScale * fraction + nextScale * (1 - fraction);
      
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

  return (
    <group ref={groupRef}>
      {/* Single mesh with shader material for entire rainbow kasina */}
      <mesh position={[0, 0, 0]}>
        <circleGeometry args={[1.0, 64]} />
        <primitive object={shaderMaterial} />
      </mesh>
    </group>
  );
};

export default RainbowKasina;