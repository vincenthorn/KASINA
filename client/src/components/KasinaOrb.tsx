import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { useKasina } from "../lib/stores/useKasina";
import { KASINA_TYPES, KASINA_COLORS, KASINA_BACKGROUNDS } from "../lib/constants";
import { KasinaType } from "../lib/types";

// Shader materials for the elemental kasinas
const waterShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#0065b3") }, // Deeper water base color
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;
    
    // Add slight vertex displacement for more dynamic water surface
    void main() {
      vUv = uv;
      vPosition = position;
      
      // Apply subtle vertex displacement for wave effect
      vec3 pos = position;
      
      // Only deform surface slightly, not too much to keep spherical shape
      float deformAmount = 0.025; // 2.5% deformation
      
      // Gentle wave motion on the surface
      pos += normal * sin(position.x * 2.0 + position.y * 3.0 + time * 0.7) * deformAmount;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;
    varying vec3 vPosition;
    
    // Hash function for noise
    float hash(float n) {
      return fract(sin(n) * 43758.5453);
    }
    
    // 3D noise function
    float noise(vec3 x) {
      vec3 p = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      
      float n = p.x + p.y * 57.0 + p.z * 113.0;
      return mix(
        mix(
          mix(hash(n), hash(n + 1.0), f.x),
          mix(hash(n + 57.0), hash(n + 58.0), f.x),
          f.y),
        mix(
          mix(hash(n + 113.0), hash(n + 114.0), f.x),
          mix(hash(n + 170.0), hash(n + 171.0), f.x),
          f.y),
        f.z);
    }
    
    // Wave movement function
    vec3 waveDisplacement(vec3 p, float t) {
      // Convert to spherical coordinates for smooth mapping
      float radius = length(p);
      float theta = acos(p.z / radius);
      float phi = atan(p.y, p.x);
      
      // Create wave patterns
      // Fast primary wave
      float wave1 = sin(phi * 3.0 + theta * 4.0 + t * 0.6) * 0.5 + 0.5;
      // Secondary intersecting wave
      float wave2 = sin(phi * 5.0 - theta * 2.0 + t * 0.4) * 0.5 + 0.5;
      // Slow undulating wave
      float wave3 = sin(phi * 1.0 + t * 0.2) * 0.5 + 0.5;
      
      // Combine waves with different strengths for natural water movement
      float wave = wave1 * 0.6 + wave2 * 0.3 + wave3 * 0.1;
      
      // Return wave displacement vector
      return vec3(wave);
    }
    
    // Function to create fluid water currents
    float waterFlow(vec3 p, float t) {
      // Get basic wave displacement
      vec3 wave = waveDisplacement(p, t);
      
      // Convert to spherical for base mapping
      float radius = length(p);
      float theta = acos(p.z / radius);
      float phi = atan(p.y, p.x);
      
      // Apply wave displacement to coordinates for fluid motion
      phi += sin(wave.x * 3.1415) * 0.2; // Displace angle based on wave
      theta += cos(wave.y * 3.1415) * 0.15; // Displace another angle
      
      // Build layered water currents
      float flow = 0.0;
      
      // Add several layers of flowing noise
      for (float i = 1.0; i <= 4.0; i++) {
        // Faster flow speeds for more layers
        float speed = 0.4 - 0.05 * i;
        float scale = pow(1.8, i - 1.0);
        float intensity = pow(0.7, i); // Higher intensity for water currents
        
        // Create flowing water currents
        vec3 flowCoord = vec3(
          phi * 2.5 * scale + t * speed * sin(theta),
          theta * 2.5 * scale + t * speed * 0.5,
          radius * scale + t * speed
        );
        
        // Add noise layer with flowing water effect
        flow += noise(flowCoord) * intensity;
      }
      
      return flow * 0.6; // Adjust flow intensity
    }
    
    void main() {
      // Get dynamic water current flows
      float flowValue = waterFlow(vPosition, time);
      
      // Create a palette of vibrant water colors
      vec3 deepOceanBlue = vec3(0.0, 0.2, 0.5);     // Deep ocean blue
      vec3 midnightBlue = vec3(0.05, 0.25, 0.6);    // Midnight ocean blue
      vec3 azureBlue = vec3(0.1, 0.4, 0.75);        // Azure water blue
      vec3 caribbeanBlue = vec3(0.0, 0.5, 0.8);     // Caribbean blue
      vec3 tropicalBlue = vec3(0.2, 0.65, 0.9);     // Tropical turquoise
      
      // Build complex wave patterns
      vec3 p = normalize(vPosition); // Use normalized position
      
      // Create dynamic wave patterns with different frequencies
      float waves = 0.0;
      waves += sin(p.x * 8.0 + p.y * 4.0 + time * 0.8) * 0.08;
      waves += sin(p.y * 7.0 - p.z * 5.0 + time * 0.6) * 0.06;
      waves += sin(p.z * 6.0 + p.x * 3.0 + time * 0.4) * 0.04;
      
      // Add waves to flowValue for more complex patterns
      flowValue += waves;
      
      // Calculate water color based on flow patterns
      vec3 waterColor;
      if (flowValue < 0.25) {
        float t = flowValue / 0.25;
        waterColor = mix(deepOceanBlue, midnightBlue, t);
      } else if (flowValue < 0.5) {
        float t = (flowValue - 0.25) / 0.25;
        waterColor = mix(midnightBlue, azureBlue, t);
      } else if (flowValue < 0.75) {
        float t = (flowValue - 0.5) / 0.25;
        waterColor = mix(azureBlue, caribbeanBlue, t);
      } else {
        float t = (flowValue - 0.75) / 0.25;
        waterColor = mix(caribbeanBlue, tropicalBlue, t);
      }
      
      // Add specular highlights for water surface
      float fresnel = pow(1.0 - max(0.0, dot(normalize(vPosition), vec3(0.0, 0.0, 1.0))), 2.0);
      
      // Surface ripples and circular wave patterns
      float ripples = 0.0;
      // Small fast ripples
      ripples += sin(length(p) * 40.0 - time * 1.0) * 0.01;
      // Medium ripples
      ripples += sin(p.x * 15.0 + p.y * 15.0 + time * 0.8) * sin(p.y * 10.0 + p.z * 10.0 + time * 1.2) * 0.025;
      
      // Add soft underwater glow/light rays
      float glow = pow(1.0 - length(vPosition) * 0.5, 2.0) * 0.15;
      
      // Add water surface highlights based on viewing angle
      float highlight = fresnel * 0.15;
      
      // Final water color with all effects combined
      vec3 finalColor = waterColor + ripples + glow + highlight;
      
      // Final color with slightly enhanced transparency for water
      gl_FragColor = vec4(finalColor, opacity * 0.9);
    }
  `
};

const fireShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#ff6600") }, // Fiery orange base color
    opacity: { value: 1.0 }
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
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;
    varying vec3 vPosition;
    
    // Improved Perlin-like noise without visible patterns
    float hash(float n) {
      return fract(sin(n) * 43758.5453);
    }
    
    float noise(vec3 x) {
      // The noise function returns a value in the range -1.0 -> 1.0
      vec3 p = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      
      float n = p.x + p.y * 57.0 + p.z * 113.0;
      return mix(
        mix(
          mix(hash(n), hash(n + 1.0), f.x),
          mix(hash(n + 57.0), hash(n + 58.0), f.x),
          f.y),
        mix(
          mix(hash(n + 113.0), hash(n + 114.0), f.x),
          mix(hash(n + 170.0), hash(n + 171.0), f.x),
          f.y),
        f.z);
    }
    
    vec3 sphericalToCartesian(float radius, float polar, float azimuthal) {
      return vec3(
        radius * sin(polar) * cos(azimuthal),
        radius * sin(polar) * sin(azimuthal),
        radius * cos(polar)
      );
    }
    
    // Flame value calculation without seams
    float flame(vec3 pos, float time) {
      // Convert position to spherical coordinates to ensure smooth noise across sphere
      float radius = length(pos);
      float theta = acos(pos.z / radius);
      float phi = atan(pos.y, pos.x);
      
      // Generate seamless noise based on spherical coordinates
      float noiseVal = 0.0;
      
      // Use 3D noise over spherical coordinates to avoid seams
      vec3 noiseCoord = vec3(radius, theta * 10.0, phi * 10.0);
      
      // Create multi-layered noise (extremely slow animation)
      for(float i = 1.0; i < 4.0; i++) {
        float scale = pow(2.0, i);
        float intensity = pow(0.5, i) * 0.5; // Reduced intensity by half
        // Drastically reduced time factor from 0.1 to 0.025, and sine wave frequency from 0.2 to 0.05
        noiseVal += noise(noiseCoord * scale + time * 0.025 * vec3(1.0, 2.0, 1.0) * (0.5 + 0.5 * sin(time * 0.05 * i))) * intensity;
      }
      
      // Create extremely gentle pulsing using sine wave (bare minimum intensity)
      float pulseFactor = (sin(time * 0.1) * 0.5 + 0.5) * 0.0375; // Only 0.0 to 0.0375 range - 4x less than original
      
      // Combine flame base with noise and extremely subtle pulse
      return clamp(0.5 + noiseVal * 0.1 + pulseFactor, 0.0, 1.0);
    }
    
    void main() {
      // Use position for 3D noise calculation to avoid seams
      float flameIntensity = flame(vPosition, time);
      
      // Base orange color
      vec3 baseColor = color; // Orange
      
      // Yellow color for mid-intensity
      vec3 yellowColor = vec3(1.0, 0.9, 0.2); // Bright yellow
      
      // White color for highest intensity
      vec3 whiteColor = vec3(1.0, 1.0, 1.0); // Pure white
      
      // Mix colors based on flame intensity - use narrower ranges for more subtle transitions
      vec3 finalColor;
      if (flameIntensity > 0.85) {
        // Highest intensity - blend between yellow and white
        finalColor = mix(yellowColor, whiteColor, (flameIntensity - 0.85) / 0.15);
      } else if (flameIntensity > 0.6) {
        // Medium intensity - blend between orange and yellow
        finalColor = mix(baseColor, yellowColor, (flameIntensity - 0.6) / 0.25);
      } else {
        // Lower intensity - pure orange base color
        finalColor = baseColor * (0.7 + flameIntensity * 0.3); // Keep minimum brightness
      }
      
      // Output final color with opacity
      gl_FragColor = vec4(finalColor, opacity);
    }
  `
};

const airShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#d3f0ff") },
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    varying vec2 vUv;
    
    void main() {
      vec2 p = -1.0 + 2.0 * vUv;
      float a = time * 0.05;
      float s = sin(a * 2.0);
      float c = cos(a * 2.0);
      
      float d = pow(1.0 - length(p), 2.0);
      vec2 q = vec2(p.x * c - p.y * s, p.x * s + p.y * c) * d;
      
      float f = 0.0;
      for(float i = 1.0; i < 6.0; i++) {
        float t = time * (0.1 + 0.05 * i);
        f += sin(q.x * i + t) * sin(q.y * i + t);
      }
      
      vec3 finalColor = color + 0.15 * sin(f);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

const earthShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#613a00") },
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    varying vec2 vUv;
    
    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
      vec2 uv = vUv;
      vec3 baseColor = color;
      
      // Add some texture and variation
      float noise = rand(floor(uv * 30.0 + time * 0.1));
      float d = length(uv - vec2(0.5, 0.5));
      
      vec3 finalColor = mix(baseColor, baseColor * 1.2, noise * (1.0 - d));
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

const spaceShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#000000") }, // Black color for the inverted space orb
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    varying vec2 vUv;
    
    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
      vec2 uv = vUv;
      vec3 baseColor = color;
      
      // Center dark effect for black orb
      float d = length(uv - vec2(0.5, 0.5));
      
      // Subtle purple edge glow for the black orb
      float edgeGlow = smoothstep(0.45, 0.5, d);
      vec3 edgeColor = vec3(0.16, 0.0, 0.33); // Dark purple tint
      
      // Add very subtle ripple effect
      float ripple = sin(d * 20.0 - time * 0.2) * 0.02;
      float intensity = smoothstep(0.0, 0.5, d + ripple);
      
      // Mix with a subtle deep purple at the edges
      vec3 finalColor = mix(baseColor, edgeColor, intensity * edgeGlow);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

const lightShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#fffcf0") },
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    varying vec2 vUv;
    
    void main() {
      vec2 uv = vUv;
      float d = length(uv - vec2(0.5, 0.5));
      
      // Radial gradient for a sun/light effect
      float brightness = 1.0 - smoothstep(0.0, 0.5, d);
      brightness = pow(brightness, 0.8);
      
      // Pulsing effect
      float pulse = 0.05 * sin(time * 2.0);
      
      vec3 finalColor = color * (brightness + pulse);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

// Dynamic Orb component with shader materials
const DynamicOrb: React.FC<{ remainingTime?: number | null }> = ({ remainingTime = null }) => {
  const { selectedKasina } = useKasina();
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial | THREE.MeshBasicMaterial | null>(null);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      // Gentle rotation
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.1;
      
      // Shrinking effect for end of session (when remaining time is <= 60 seconds)
      if (remainingTime !== null && remainingTime <= 60) {
        // Calculate scale factor: from 1.0 (at 60s) to 0.0 (at 0s)
        // This creates a smooth shrinking effect over the last 60 seconds
        const endingScale = remainingTime / 60;
        
        // Apply the shrinking scale
        meshRef.current.scale.set(endingScale, endingScale, endingScale);
        
        // Optional: make the orb fade out as well
        if (materialRef.current) {
          if ('opacity' in materialRef.current) {
            (materialRef.current as THREE.MeshBasicMaterial).opacity = endingScale;
            (materialRef.current as THREE.MeshBasicMaterial).transparent = true;
          } else if ('uniforms' in materialRef.current && 
                    (materialRef.current as THREE.ShaderMaterial).uniforms.opacity) {
            (materialRef.current as THREE.ShaderMaterial).uniforms.opacity.value = endingScale;
            (materialRef.current as THREE.ShaderMaterial).transparent = true;
          }
        }
        
        // Log the shrinking effect (for debugging)
        // console.log(`Shrinking kasina: ${remainingTime}s remaining, scale: ${endingScale.toFixed(2)} (of 60s fade)`);
      } 
      // Breathing effects for Space kasina and Fire kasina when not in end-of-session shrinking
      else if ((selectedKasina === KASINA_TYPES.SPACE || selectedKasina === KASINA_TYPES.FIRE) && 
              (remainingTime === null || remainingTime > 60)) {
        const time = clock.getElapsedTime();
        
        // Use cubic-bezier-like timing function for smoother animation
        // Different timing for each kasina type
        let breatheCycle = 0;
        let breatheFactor = 1;

        if (selectedKasina === KASINA_TYPES.SPACE) {
          // Space kasina: Subtle 10-second breathing cycle
          const t = time % 10 / 10; // Normalized time in the cycle (0-1) - 10 second cycle
          const easeValue = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          breatheCycle = Math.sin(easeValue * Math.PI);
          
          // Extremely subtle scale factor (0.98 to 1.02 = 4% change, matching CSS animation)
          breatheFactor = 1 + breatheCycle * 0.04; 
          
          // Apply a micro-subtle scaling effect
          meshRef.current.scale.set(breatheFactor, breatheFactor, breatheFactor);
          
          // Apply an extremely subtle pulsing effect to the orb's position
          meshRef.current.position.z = breatheCycle * 0.05; // Minimal movement in z-direction
        } 
        else if (selectedKasina === KASINA_TYPES.FIRE) {
          // Fire kasina: Extremely slow 16-second breathing cycle with very subtle flame-like pulsation
          const t = time % 16 / 16; // Normalized time in the cycle (0-1) - 16 second cycle (4x slower than original)
          
          // A more asymmetric easing function to mimic flame behavior but extremely subtle
          // Quick expansion, slower contraction 
          const fireEase = t < 0.3 
            ? t / 0.3 // Fast rise (0-0.3 of cycle)
            : 1.0 - ((t - 0.3) / 0.7); // Slower fall (0.3-1.0 of cycle)
            
          breatheCycle = Math.pow(fireEase, 1.6); // Increased power for even smoother fire-like behavior
          
          // Extremely subtle scale factor (0.9925 to 1.0075 = 1.5% change, down from 3%)
          // This creates an almost imperceptible flame pulsation effect
          breatheFactor = 0.9925 + breatheCycle * 0.015;
          
          // Apply the very subtle fire pulsing effect
          meshRef.current.scale.set(breatheFactor, breatheFactor, breatheFactor);
          
          // Add barely perceptible flame-like wobble
          const wobble = Math.sin(time * 0.5) * 0.0025; // Reduced frequency (1.0 to 0.5) and amplitude (0.005 to 0.0025)
          meshRef.current.rotation.z = wobble;
        }
        
        // Try to adjust any shader uniforms that might be available
        if (materialRef.current && 'uniforms' in materialRef.current) {
          try {
            // Attempt to modify any shader uniforms that might affect the appearance
            const material = materialRef.current as THREE.ShaderMaterial;
            
            if (selectedKasina === KASINA_TYPES.SPACE) {
              if (material.uniforms.glowIntensity !== undefined) {
                material.uniforms.glowIntensity.value = 0.5 + breatheCycle * 0.3;
              }
              
              if (material.uniforms.intensity !== undefined) {
                material.uniforms.intensity.value = 0.5 + breatheCycle * 0.3;
              }
              
              // Update opacity to create a pulsing effect
              if (material.uniforms.opacity !== undefined) {
                material.uniforms.opacity.value = 0.8 + breatheCycle * 0.2;
              }
            }
            else if (selectedKasina === KASINA_TYPES.FIRE) {
              // Fire-specific adjustments to shader uniforms
              // Flame color pulsation
              if (material.uniforms.color !== undefined) {
                // Extremely subtle transition from orange to slightly yellower orange
                // This creates an almost imperceptible color shift
                const baseColor = new THREE.Color("#ff6600"); // Base orange
                const peakColor = new THREE.Color("#ff8800"); // Slightly yellower orange (much less dramatic than before)
                material.uniforms.color.value.copy(baseColor).lerp(peakColor, breatheCycle * 0.25); // Halved interpolation factor
              }
            }
          } catch (e) {
            // Silently catch errors if uniforms don't exist
          }
        }
      }
      // Reset scale to normal for all other cases
      else if (remainingTime === null || remainingTime > 60) {
        // Make sure the orb is at normal scale when not in shrinking mode
        meshRef.current.scale.set(1, 1, 1);
        
        // Reset opacity if needed
        if (materialRef.current) {
          if ('opacity' in materialRef.current) {
            (materialRef.current as THREE.MeshBasicMaterial).opacity = 1;
          } else if ('uniforms' in materialRef.current && 
                    (materialRef.current as THREE.ShaderMaterial).uniforms.opacity) {
            (materialRef.current as THREE.ShaderMaterial).uniforms.opacity.value = 1;
          }
        }
      }
    }
    
    // Update time uniform for shader materials
    if (materialRef.current && 'uniforms' in materialRef.current) {
      (materialRef.current as THREE.ShaderMaterial).uniforms.time.value = clock.getElapsedTime();
    }
  });

  const getShaderMaterial = () => {
    switch (selectedKasina) {
      case KASINA_TYPES.WATER:
        return new THREE.ShaderMaterial({...waterShader, transparent: true});
      case KASINA_TYPES.FIRE:
        return new THREE.ShaderMaterial({...fireShader, transparent: true});
      case KASINA_TYPES.AIR:
        return new THREE.ShaderMaterial({...airShader, transparent: true});
      case KASINA_TYPES.EARTH:
        return new THREE.ShaderMaterial({...earthShader, transparent: true});
      case KASINA_TYPES.SPACE:
        return new THREE.ShaderMaterial({...spaceShader, transparent: true});
      case KASINA_TYPES.LIGHT:
        return new THREE.ShaderMaterial({...lightShader, transparent: true});
      default:
        // For basic color kasinas
        return new THREE.MeshBasicMaterial({ 
          color: KASINA_COLORS[selectedKasina],
          transparent: true
        });
    }
  };

  useEffect(() => {
    if (meshRef.current) {
      const material = getShaderMaterial();
      meshRef.current.material = material;
      materialRef.current = material;
    }
  }, [selectedKasina]);

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
    </mesh>
  );
};

// Scene setup component
const Scene: React.FC<{ enableZoom?: boolean, remainingTime?: number | null }> = ({ 
  enableZoom = false,
  remainingTime = null
}) => {
  const { gl, camera } = useThree();
  const { selectedKasina } = useKasina();
  
  // Debug mount/unmount for troubleshooting
  useEffect(() => {
    console.log("Scene component mounted with kasina:", selectedKasina);
    
    // Helper function to clean up WebGL resources
    const cleanupWebGL = () => {
      try {
        // Clear any render lists
        gl.renderLists.dispose();
        
        // Reset renderer state to avoid memory leaks
        gl.info.reset();
        
        // Force garbage collection hint (though browser decides when to run GC)
        if (typeof window !== 'undefined' && window.gc) {
          window.gc();
        }
      } catch (err) {
        console.error("Error cleaning up WebGL resources", err);
      }
    };
    
    // Make sure to clean up WebGL resources properly when scene unmounts
    return () => {
      console.log("Scene component unmounted, releasing resources");
      cleanupWebGL();
    };
  }, []);
  
  // Set the background color based on the selected kasina
  useEffect(() => {
    const bgColor = KASINA_BACKGROUNDS[selectedKasina as KasinaType] || "#000000";
    gl.setClearColor(new THREE.Color(bgColor), 1);
  }, [gl, selectedKasina]);

  // Add camera ref to work with zoom 
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  useEffect(() => {
    // When zoom is enabled, set a slightly larger initial distance
    if (enableZoom && cameraRef.current) {
      cameraRef.current.position.z = 4;
    }
  }, [enableZoom]);

  // Add a dynamic light that follows the camera
  const [cameraLight, setCameraLight] = useState(new THREE.Vector3(0, 0, 5));
  
  useFrame(() => {
    if (cameraRef.current) {
      // Update light position to follow camera
      setCameraLight(cameraRef.current.position.clone());
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 3]} fov={50} ref={cameraRef} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      <pointLight position={cameraLight} intensity={0.8} distance={10} />
      <DynamicOrb remainingTime={remainingTime} />
      <OrbitControls 
        enableZoom={enableZoom} 
        enablePan={false} 
        rotateSpeed={0.5}
        minDistance={0.05}  // Allow zooming in very close
        maxDistance={20}    // Allow zooming out quite far
        zoomSpeed={0.08}    // Adjusted zoom speed to exact value requested
      />
    </>
  );
};

// Main KasinaOrb component
interface KasinaOrbProps {
  enableZoom?: boolean;
  type?: KasinaType;     // Kasina type (water, fire, etc.)
  color?: string;        // Color code for the orb
  speed?: number;        // Animation speed
  complexity?: number;   // Detail level for the orb
  remainingTime?: number | null; // Remaining time in seconds, used for end-session effects
}

const KasinaOrb: React.FC<KasinaOrbProps> = ({ 
  enableZoom = false,
  type,
  color,
  speed,
  complexity,
  remainingTime = null
}) => {
  // Get access to the current selectedKasina
  const { selectedKasina } = useKasina();
  
  // If type is provided, update the selected kasina in the store
  useEffect(() => {
    if (type) {
      const kasinaStore = useKasina.getState();
      kasinaStore.setSelectedKasina(type);
      console.log("KasinaOrb: Setting kasina type to", type);
    }
  }, [type]);
  
  // When component mounts or unmounts, log for debugging
  useEffect(() => {
    console.log("KasinaOrb component mounted with type:", type || selectedKasina);
    
    return () => {
      console.log("KasinaOrb component unmounted, had type:", type || selectedKasina);
    };
  }, []);
  
  // Get the background color for the selected kasina
  const bgColor = KASINA_BACKGROUNDS[selectedKasina as KasinaType] || "#000000";
  
  return (
    <div 
      className="w-full h-full orb-content"
      style={{ backgroundColor: bgColor }}
    >
      <Canvas>
        <Scene enableZoom={enableZoom} remainingTime={remainingTime} />
      </Canvas>
    </div>
  );
};

export default KasinaOrb;
