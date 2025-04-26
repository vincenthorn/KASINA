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
    color: { value: new THREE.Color("#0099ff") },
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
      float a = time * 0.1;
      float d = 0.0;
      
      for(float i = 1.0; i < 5.0; i++) {
        float t = a + i * 1.5;
        d += sin(t + i * p.x) * sin(t + i * p.y);
      }
      
      vec3 finalColor = vec3(color.r + 0.2 * sin(d), color.g + 0.2 * sin(d), color.b + 0.2 * sin(d + 0.5));
      gl_FragColor = vec4(finalColor, 1.0);
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
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;
    
    // Improved noise function for more flame-like appearance
    float noise(vec2 p) {
      return sin(p.x * 10.0) * sin(p.y * 10.0);
    }
    
    // Flame value calculation
    float flame(vec2 uv, float time) {
      // Distance from center
      float d = length(uv - vec2(0.5, 0.5));
      
      // Create baseline pulsing using sine wave
      float pulseFactor = (sin(time * 0.8) * 0.5 + 0.5) * 0.7; // 0.0 to 0.7 range
      
      // Base flame value
      float flameVal = 1.0 - d * 2.0;
      
      // Add noise for flame texture
      float noiseVal = 0.0;
      for(float i = 0.0; i < 3.0; i++) {
        noiseVal += noise(uv * (3.0 + i) + vec2(time * 0.1 + i * 0.3, time * 0.05)) * (0.3 - i * 0.1);
      }
      
      // Combine flame base with noise and pulse
      return clamp(flameVal + noiseVal * 0.6 + pulseFactor, 0.0, 1.0);
    }
    
    void main() {
      vec2 uv = vUv;
      float d = length(uv - vec2(0.5, 0.5));
      
      // Get flame value
      float flameIntensity = flame(uv, time);
      
      // Base orange color
      vec3 baseColor = color; // Orange
      
      // Yellow color for mid-intensity
      vec3 yellowColor = vec3(1.0, 0.9, 0.2); // Bright yellow
      
      // White color for highest intensity
      vec3 whiteColor = vec3(1.0, 1.0, 1.0); // Pure white
      
      // Mix colors based on flame intensity
      vec3 finalColor;
      if (flameIntensity > 0.85) {
        // Highest intensity - blend between yellow and white
        finalColor = mix(yellowColor, whiteColor, (flameIntensity - 0.85) / 0.15);
      } else if (flameIntensity > 0.5) {
        // Medium intensity - blend between orange and yellow
        finalColor = mix(baseColor, yellowColor, (flameIntensity - 0.5) / 0.35);
      } else {
        // Lower intensity - pure orange base color
        finalColor = baseColor * flameIntensity;
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
      
      // Shrinking effect for end of session (when remaining time is <= 30 seconds)
      if (remainingTime !== null && remainingTime <= 30) {
        // Calculate scale factor: from 1.0 (at 30s) to 0.0 (at 0s)
        // This creates a smooth shrinking effect over the last 30 seconds
        const endingScale = remainingTime / 30;
        
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
        // console.log(`Shrinking kasina: ${remainingTime}s remaining, scale: ${endingScale.toFixed(2)}`);
      } 
      // Breathing effects for Space kasina and Fire kasina when not in end-of-session shrinking
      else if ((selectedKasina === KASINA_TYPES.SPACE || selectedKasina === KASINA_TYPES.FIRE) && 
              (remainingTime === null || remainingTime > 30)) {
        const time = clock.getElapsedTime();
        
        // Use cubic-bezier-like timing function for smoother animation
        // Different timing for each kasina type
        let t, easeValue, breatheCycle, breatheFactor;

        if (selectedKasina === KASINA_TYPES.SPACE) {
          // Space kasina: Subtle 10-second breathing cycle
          t = time % 10 / 10; // Normalized time in the cycle (0-1) - 10 second cycle
          easeValue = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          breatheCycle = Math.sin(easeValue * Math.PI);
          
          // Extremely subtle scale factor (0.98 to 1.02 = 4% change, matching CSS animation)
          breatheFactor = 1 + breatheCycle * 0.04; 
          
          // Apply a micro-subtle scaling effect
          meshRef.current.scale.set(breatheFactor, breatheFactor, breatheFactor);
          
          // Apply an extremely subtle pulsing effect to the orb's position
          meshRef.current.position.z = breatheCycle * 0.05; // Minimal movement in z-direction
        } 
        else if (selectedKasina === KASINA_TYPES.FIRE) {
          // Fire kasina: More rapid 4-second breathing cycle with flame-like pulsation
          t = time % 4 / 4; // Normalized time in the cycle (0-1) - 4 second cycle
          
          // A more asymmetric easing function to mimic flame behavior
          // Quick expansion, slower contraction
          const fireEase = t < 0.3 
            ? t / 0.3 // Fast rise (0-0.3 of cycle)
            : 1.0 - ((t - 0.3) / 0.7); // Slower fall (0.3-1.0 of cycle)
            
          breatheCycle = Math.pow(fireEase, 1.2); // Power for more fire-like behavior
          
          // More pronounced scale factor for fire (0.85 to 1.15 = 30% change)
          breatheFactor = 0.85 + breatheCycle * 0.3;
          
          // Apply the fire pulsing effect
          meshRef.current.scale.set(breatheFactor, breatheFactor, breatheFactor);
          
          // Add slight flame-like wobble
          const wobble = Math.sin(time * 3.0) * 0.03;
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
                // Transition from orange to yellow-white at peak intensity
                // This enhances the shader's built-in color blending
                const baseColor = new THREE.Color("#ff6600"); // Base orange
                const peakColor = new THREE.Color("#ffcc00"); // Peak yellow
                material.uniforms.color.value.copy(baseColor).lerp(peakColor, breatheCycle * 0.7);
              }
            }
          } catch (e) {
            // Silently catch errors if uniforms don't exist
          }
        }
      }
      // Reset scale to normal for all other cases
      else if (remainingTime === null || remainingTime > 30) {
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
    }
  }, [type]);
  
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
