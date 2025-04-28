import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { KasinaType } from "../lib/types";
import { KASINA_COLORS, KASINA_BACKGROUNDS } from "../lib/constants";

// This is a special standalone implementation of KasinaOrb specifically optimized 
// for the focus mode to ensure it always renders properly without dependency issues

// Minimal shader for water effect
const waterShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#0065b3") }, 
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
    
    void main() {
      // Simple water wave effect
      vec2 p = -1.0 + 2.0 * vUv;
      float a = time * 0.05;
      float d = length(p);
      
      vec3 waterColor = mix(color, color * 1.5, sin(d * 10.0 - time) * 0.5 + 0.5);
      gl_FragColor = vec4(waterColor, opacity);
    }
  `
};

// Minimal shader for fire effect
const fireShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#ff6600") },
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
    
    void main() {
      // Simple fire effect
      vec2 p = -1.0 + 2.0 * vUv;
      float d = length(p);
      
      float f = sin(d * 15.0 - time * 2.0) * 0.5 + 0.5;
      vec3 fireColor = mix(color, vec3(1.0, 0.9, 0.3), f);
      gl_FragColor = vec4(fireColor, opacity);
    }
  `
};

// Simple function to get material based on kasina type
function getMaterial(type: KasinaType, color?: string) {
  switch(type) {
    case 'water':
      return new THREE.ShaderMaterial({
        ...waterShader,
        transparent: true
      });
    case 'fire':
      return new THREE.ShaderMaterial({
        ...fireShader,
        transparent: true
      });
    default:
      // For simpler kasinas just use basic material with the color
      return new THREE.MeshBasicMaterial({
        color: color || KASINA_COLORS[type] || "#FFFFFF",
        transparent: true
      });
  }
}

// The orb component
function Orb({ type, color, remainingTime = null }: { 
  type: KasinaType, 
  color?: string,
  remainingTime?: number | null
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.Material | null>(null);
  
  // Set up material when type changes
  useEffect(() => {
    if (!meshRef.current) return;
    
    const material = getMaterial(type, color);
    meshRef.current.material = material;
    materialRef.current = material;
    
    console.log("FocusModeOrb: Created material for", type);
  }, [type, color]);
  
  // Animation and updates
  useFrame(({ clock }) => {
    if (!meshRef.current || !materialRef.current) return;
    
    // Simple rotation
    meshRef.current.rotation.y = clock.getElapsedTime() * 0.1;
    
    // Handle breathing animation
    const breathCycle = Math.sin(clock.getElapsedTime() * 0.3) * 0.05; // 5% scale change
    meshRef.current.scale.set(1 + breathCycle, 1 + breathCycle, 1 + breathCycle);
    
    // Update shader time
    if ('uniforms' in materialRef.current) {
      (materialRef.current as THREE.ShaderMaterial).uniforms.time.value = clock.getElapsedTime();
    }
    
    // Handle countdown effects if remainingTime is provided
    if (remainingTime !== null && remainingTime <= 60) {
      // Scale down as timer approaches zero
      const scale = Math.max(0.05, remainingTime / 60);
      meshRef.current.scale.set(scale, scale, scale);
    }
  });
  
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
    </mesh>
  );
}

// Main scene component
function Scene({ type, color, remainingTime = null }: { 
  type: KasinaType, 
  color?: string,
  remainingTime?: number | null
}) {
  const { gl } = useThree();
  const bgColor = KASINA_BACKGROUNDS[type] || "#000000";
  
  // Set background color
  useEffect(() => {
    gl.setClearColor(new THREE.Color(bgColor), 1);
    console.log("FocusModeOrb: Setting background to", bgColor);
    
    return () => {
      // Clean up
      try {
        gl.renderLists.dispose();
      } catch (e) {
        console.error("Error cleaning up:", e);
      }
    };
  }, [gl, bgColor]);
  
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 3]} fov={50} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      <pointLight position={[0, 0, 5]} intensity={0.8} distance={10} />
      <Orb type={type} color={color} remainingTime={remainingTime} />
      <OrbitControls 
        enableZoom={true} 
        enablePan={false} 
        rotateSpeed={0.5}
        minDistance={0.05}
        maxDistance={20}
        zoomSpeed={0.08}
      />
    </>
  );
}

// Main component
interface FocusModeOrbProps {
  type: KasinaType;
  color?: string;
  remainingTime?: number | null;
}

const FocusModeOrb: React.FC<FocusModeOrbProps> = ({ 
  type, 
  color, 
  remainingTime 
}) => {
  // Use a timestamp to force re-renders
  const [timestamp, setTimestamp] = useState(Date.now());
  
  // Force an initial render after mounting
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimestamp(Date.now());
      console.log("FocusModeOrb: Forced re-render");
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  const bgColor = KASINA_BACKGROUNDS[type] || "#000000";
  
  return (
    <div 
      className="w-full h-full focus-orb-content"
      style={{ backgroundColor: bgColor }}
    >
      <Canvas 
        key={`focus-orb-${type}-${timestamp}`}
        dpr={[1, 2]}
        frameloop="always"
      >
        <Scene 
          type={type}
          color={color}
          remainingTime={remainingTime}
        />
      </Canvas>
    </div>
  );
};

export default FocusModeOrb;