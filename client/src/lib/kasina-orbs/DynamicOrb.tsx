import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { KasinaType } from "../types";
import { KASINA_TYPES, KASINA_COLORS } from "../constants";

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
    
    float hash(float n) {
      return fract(sin(n) * 43758.5453);
    }
    
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
    
    void main() {
      float flowValue = noise(vPosition * 5.0 + time * 0.5);
      
      vec3 deepOceanBlue = vec3(0.0, 0.2, 0.5);
      vec3 azureBlue = vec3(0.1, 0.4, 0.75);
      vec3 tropicalBlue = vec3(0.2, 0.65, 0.9);
      
      vec3 waterColor;
      if (flowValue < 0.4) {
        float t = flowValue / 0.4;
        waterColor = mix(deepOceanBlue, azureBlue, t);
      } else {
        float t = (flowValue - 0.4) / 0.6;
        waterColor = mix(azureBlue, tropicalBlue, t);
      }
      
      gl_FragColor = vec4(waterColor, opacity);
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
    
    float hash(float n) {
      return fract(sin(n) * 43758.5453);
    }
    
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
    
    void main() {
      float flameIntensity = noise(vPosition * 5.0 + time * 0.5);
      
      vec3 baseColor = color;
      vec3 yellowColor = vec3(1.0, 0.9, 0.2);
      vec3 whiteColor = vec3(1.0, 1.0, 1.0);
      
      vec3 finalColor;
      if (flameIntensity > 0.8) {
        finalColor = mix(yellowColor, whiteColor, (flameIntensity - 0.8) / 0.2);
      } else if (flameIntensity > 0.5) {
        finalColor = mix(baseColor, yellowColor, (flameIntensity - 0.5) / 0.3);
      } else {
        finalColor = baseColor * (0.7 + flameIntensity * 0.3);
      }
      
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
      float d = pow(1.0 - length(p), 2.0);
      
      float f = 0.0;
      for(float i = 1.0; i < 6.0; i++) {
        float t = time * (0.1 + 0.05 * i);
        f += sin(p.x * i + t) * sin(p.y * i + t);
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
    color: { value: new THREE.Color("#000000") },
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
      
      float d = length(uv - vec2(0.5, 0.5));
      
      float edgeGlow = smoothstep(0.45, 0.5, d);
      vec3 edgeColor = vec3(0.16, 0.0, 0.33);
      
      float ripple = sin(d * 20.0 - time * 0.2) * 0.02;
      float intensity = smoothstep(0.0, 0.5, d + ripple);
      
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
      
      float brightness = 1.0 - smoothstep(0.0, 0.5, d);
      brightness = pow(brightness, 0.8);
      
      float pulse = 0.05 * sin(time * 2.0);
      
      vec3 finalColor = color * (brightness + pulse);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

// Dynamic Orb component
interface DynamicOrbProps {
  remainingTime?: number | null;
  kasinaType: KasinaType;
  color?: string;
  speed?: number;
  complexity?: number;
}

const DynamicOrb: React.FC<DynamicOrbProps> = ({
  remainingTime = null,
  kasinaType,
  color,
  speed = 0.5,
  complexity = 2
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial | THREE.MeshBasicMaterial | null>(null);
  
  console.log("DynamicOrb rendering with:", { kasinaType, remainingTime, color });
  
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    
    // Gentle rotation
    meshRef.current.rotation.y = clock.getElapsedTime() * 0.1;
    
    // Enhanced shrinking effect for end of session with extra safeguards
    if (remainingTime !== null && remainingTime <= 60) {
      try {
        // Calculate an improved scale factor with a minimum size to prevent complete disappearance
        // This creates a smooth shrinking effect but ensures the orb doesn't get too small
        const minScale = 0.05; // Minimum scale to keep orb visible
        
        // Create more natural easing for scale reduction with an eased curve
        const normalizedTime = remainingTime / 60; // 0 to 1
        const easeOutValue = Math.sin(normalizedTime * Math.PI / 2); // Ease out sine (starts fast, ends slow)
        const endingScale = minScale + easeOutValue * (1 - minScale);
        
        // Add subtle pulse during shrinking for more visual interest
        const pulseAmount = 0.03; 
        const pulseSpeed = 3.0;
        const pulseEffect = Math.sin(clock.getElapsedTime() * pulseSpeed) * pulseAmount;
        
        // Final scale with pulse
        const finalScale = endingScale + (pulseEffect * endingScale);
        
        // Log important time points for debugging
        if (remainingTime % 5 === 0 || remainingTime < 10) {
          console.log(`DynamicOrb - Remaining: ${remainingTime}s, scale: ${finalScale.toFixed(3)}`);
        }
        
        // Apply the scale with subtle ease-out effect to make it smooth
        meshRef.current.scale.set(finalScale, finalScale, finalScale);
        
        // Handle material opacity for elemental kasinas
        if (materialRef.current && 'uniforms' in materialRef.current) {
          const material = materialRef.current as THREE.ShaderMaterial;
          if (material.uniforms && material.uniforms.opacity) {
            // Fade opacity in last 30 seconds but keep it visible
            const minOpacity = 0.1;
            const opacityValue = remainingTime < 30 ? 
              minOpacity + (remainingTime / 30) * (1 - minOpacity) : 1.0;
            
            material.uniforms.opacity.value = opacityValue;
          }
        }
      } catch (err) {
        // Safety fallback if any error occurs in animation
        console.error("Error in orb animation:", err);
        
        // Apply a simple fallback scale to keep the orb visible
        const fallbackScale = Math.max(0.1, remainingTime / 60);
        meshRef.current.scale.set(fallbackScale, fallbackScale, fallbackScale);
      }
      
      // Apply opacity for elemental kasinas - also keep minimum opacity
      if (materialRef.current) {
        const isElemental = [
          KASINA_TYPES.WATER, 
          KASINA_TYPES.AIR, 
          KASINA_TYPES.FIRE, 
          KASINA_TYPES.EARTH, 
          KASINA_TYPES.SPACE, 
          KASINA_TYPES.LIGHT
        ].includes(kasinaType);
        
        // Keep higher minimum opacity value so it doesn't completely disappear
        const minOpacity = 0.1;
        const endingOpacity = minOpacity + (remainingTime / 60) * (1 - minOpacity);
        
        if (isElemental && 'uniforms' in materialRef.current) {
          (materialRef.current as THREE.ShaderMaterial).uniforms.opacity.value = endingOpacity;
          (materialRef.current as THREE.ShaderMaterial).transparent = true;
        }
      }
    } 
    // Special breathing effects
    else if ((kasinaType === KASINA_TYPES.SPACE || kasinaType === KASINA_TYPES.FIRE)) {
      const time = clock.getElapsedTime();
      let breatheFactor = 1;
      
      if (kasinaType === KASINA_TYPES.SPACE) {
        // 10-second breathing cycle
        const t = time % 10 / 10;
        const easeValue = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const breatheCycle = Math.sin(easeValue * Math.PI);
        
        // Scale factor
        breatheFactor = 1 + breatheCycle * 0.04;
        meshRef.current.scale.set(breatheFactor, breatheFactor, breatheFactor);
      } 
      else if (kasinaType === KASINA_TYPES.FIRE) {
        // 4-second breathing cycle
        const t = time % 4 / 4;
        const fireEase = t < 0.3 ? t / 0.3 : 1.0 - ((t - 0.3) / 0.7);
        const breatheCycle = Math.pow(fireEase, 1.2);
        
        breatheFactor = 0.97 + breatheCycle * 0.06;
        meshRef.current.scale.set(breatheFactor, breatheFactor, breatheFactor);
      }
    }
    // Reset scale to normal
    else if (remainingTime === null || remainingTime > 60) {
      meshRef.current.scale.set(1, 1, 1);
      
      // Reset opacity
      if (materialRef.current) {
        if ('opacity' in materialRef.current) {
          (materialRef.current as THREE.MeshBasicMaterial).opacity = 1;
        } else if ('uniforms' in materialRef.current) {
          (materialRef.current as THREE.ShaderMaterial).uniforms.opacity.value = 1;
        }
      }
    }
    
    // Update time uniform for shader materials
    if (materialRef.current && 'uniforms' in materialRef.current) {
      (materialRef.current as THREE.ShaderMaterial).uniforms.time.value = clock.getElapsedTime() * (speed || 0.5);
    }
  });

  // Get the material based on kasina type
  useEffect(() => {
    if (!meshRef.current) return;
    
    let material: THREE.Material;
    
    console.log("Setting material for:", kasinaType);
    
    // Create the appropriate material based on kasina type
    switch (kasinaType) {
      case KASINA_TYPES.WATER:
        material = new THREE.ShaderMaterial({...waterShader, transparent: true});
        break;
      case KASINA_TYPES.FIRE:
        material = new THREE.ShaderMaterial({...fireShader, transparent: true});
        break;
      case KASINA_TYPES.AIR:
        material = new THREE.ShaderMaterial({...airShader, transparent: true});
        break;
      case KASINA_TYPES.EARTH:
        material = new THREE.ShaderMaterial({...earthShader, transparent: true});
        break;
      case KASINA_TYPES.SPACE:
        material = new THREE.ShaderMaterial({...spaceShader, transparent: true});
        break;
      case KASINA_TYPES.LIGHT:
        material = new THREE.ShaderMaterial({...lightShader, transparent: true});
        break;
      default:
        // For basic color kasinas
        material = new THREE.MeshBasicMaterial({ 
          color: color || KASINA_COLORS[kasinaType] || "#FFFFFF",
          transparent: true
        });
    }
    
    meshRef.current.material = material;
    materialRef.current = material as any;
    
  }, [kasinaType, color, speed]);

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
    </mesh>
  );
};

export default DynamicOrb;