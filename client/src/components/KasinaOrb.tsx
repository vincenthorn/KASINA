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
    color: { value: new THREE.Color("#0099ff") }
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
    color: { value: new THREE.Color("#ff3300") }
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
    
    float noise(vec2 p) {
      return sin(p.x * 10.0) * sin(p.y * 10.0);
    }
    
    void main() {
      vec2 uv = vUv;
      float d = length(uv - vec2(0.5, 0.5));
      
      float f = 0.0;
      for(float i = 0.0; i < 3.0; i++) {
        f += noise(uv * 2.5 + vec2(0.0, time * 0.1 + i * 0.5)) * (1.0 - d);
      }
      
      vec3 finalColor = mix(color, vec3(1.0, 0.7, 0.3), f * (1.0 - d) * 2.0);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

const airShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#d3f0ff") }
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
    color: { value: new THREE.Color("#613a00") }
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
    color: { value: new THREE.Color("#000000") } // Black color for the inverted space orb
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
    color: { value: new THREE.Color("#fffcf0") }
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
const DynamicOrb: React.FC = () => {
  const { selectedKasina } = useKasina();
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial | THREE.MeshBasicMaterial | null>(null);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      // Gentle rotation
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.1;
      
      // Add expansion/contraction breathing effect for space kasina (15s cycle)
      if (selectedKasina === KASINA_TYPES.SPACE) {
        const time = clock.getElapsedTime();
        
        // Use cubic-bezier-like timing function to make the breathing more pronounced
        // and have a deliberate pause at the peak of expansion
        const t = time % 15 / 15; // Normalized time in the cycle (0-1)
        const easeInOutQuad = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const breatheCycle = Math.sin(easeInOutQuad * Math.PI);
        
        // Very subtle scale factor (0.93 to 1.07 = 14% change, matching CSS animation)
        const breatheFactor = 1 + breatheCycle * 0.15; 
        
        // Apply a more moderate scaling effect for the Space kasina's breathing
        // Use a scale range of 20% (0.9 to 1.1) which is noticeable but not too extreme
        meshRef.current.scale.set(breatheFactor, breatheFactor, breatheFactor);
        
        // Apply a subtle pulsing effect to the orb's position (slight motion in z-axis)
        // This makes the breathing effect more natural and 3D-like
        meshRef.current.position.z = breatheCycle * 0.1; // Subtle movement in z-direction
        
        // Try to adjust any shader uniforms that might be available
        if (materialRef.current && 'uniforms' in materialRef.current) {
          try {
            // Attempt to modify any shader uniforms that might affect the appearance
            const material = materialRef.current as THREE.ShaderMaterial;
            
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
          } catch (e) {
            // Silently catch errors if uniforms don't exist
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
        return new THREE.ShaderMaterial(waterShader);
      case KASINA_TYPES.FIRE:
        return new THREE.ShaderMaterial(fireShader);
      case KASINA_TYPES.AIR:
        return new THREE.ShaderMaterial(airShader);
      case KASINA_TYPES.EARTH:
        return new THREE.ShaderMaterial(earthShader);
      case KASINA_TYPES.SPACE:
        return new THREE.ShaderMaterial(spaceShader);
      case KASINA_TYPES.LIGHT:
        return new THREE.ShaderMaterial(lightShader);
      default:
        // For basic color kasinas
        return new THREE.MeshBasicMaterial({ 
          color: KASINA_COLORS[selectedKasina] 
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
const Scene: React.FC<{ enableZoom?: boolean }> = ({ enableZoom = false }) => {
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
      <DynamicOrb />
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
}

const KasinaOrb: React.FC<KasinaOrbProps> = ({ 
  enableZoom = false,
  type,
  color,
  speed,
  complexity
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
        <Scene enableZoom={enableZoom} />
      </Canvas>
    </div>
  );
};

export default KasinaOrb;
