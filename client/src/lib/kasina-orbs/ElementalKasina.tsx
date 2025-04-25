import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { 
  Mesh, 
  Group, 
  Vector3, 
  BufferGeometry, 
  PointsMaterial, 
  Points,
  BufferAttribute,
  Color
} from "three";

interface ElementalKasinaProps {
  type: "water" | "air" | "fire" | "earth" | "space" | "light";
  color: string;
  emissive?: string;
  speed?: number;
  complexity?: number;
}

const ElementalKasina = ({ 
  type, 
  color, 
  emissive = color, 
  speed = 0.5, 
  complexity = 2 
}: ElementalKasinaProps) => {
  const groupRef = useRef<Group>(null);
  const coreRef = useRef<Mesh>(null);
  const particlesRef = useRef<Points>(null);
  
  // Create particles for certain elements
  const particles = useMemo(() => {
    // Only add particles for certain element types
    if (!["water", "air", "fire", "space", "light"].includes(type)) {
      return null;
    }
    
    const particleCount = 500 * complexity;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    const mainColor = new Color(color);
    const particleColor = new Color(emissive || color);
    
    for (let i = 0; i < particleCount; i++) {
      // Different distribution based on element type
      let radius, theta, phi;
      
      if (type === "water") {
        // Water particles form a smoother, more uniform sphere to avoid visible seams
        radius = 1.1 + Math.random() * 0.5;
        
        // Use golden ratio distribution for more uniform sphere coverage
        const goldenRatio = (1 + Math.sqrt(5)) / 2;
        const idx = i / particleCount;
        const y = 1 - (idx * 2);  // y goes from 1 to -1
        const radiusAtY = Math.sqrt(1 - y * y); // radius at y position
        
        phi = Math.acos(y);
        theta = 2 * Math.PI * idx * goldenRatio;
        
        // Add some randomness to avoid perfect patterns
        theta += Math.random() * 0.2;
        phi += Math.random() * 0.1;
      } else if (type === "air") {
        // Air particles are more dispersed
        radius = 1 + Math.random() * 1.2;
        theta = Math.random() * Math.PI * 2;
        phi = Math.random() * Math.PI;
      } else if (type === "fire") {
        // Fire particles concentrated upward
        radius = 1 + Math.random() * 1.5;
        theta = Math.random() * Math.PI * 2;
        phi = Math.random() * Math.PI * 0.7;
      } else if (type === "space") {
        // Space particles form a galaxy-like shape
        radius = 1 + Math.random() * 0.8;
        theta = Math.random() * Math.PI * 2;
        phi = (Math.random() - 0.5) * 0.3 + Math.PI / 2;
      } else {
        // Light particles
        radius = 1 + Math.random() * 1;
        theta = Math.random() * Math.PI * 2;
        phi = Math.random() * Math.PI;
      }
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      // Blend between main and particle colors
      const blend = Math.random();
      const blendedColor = mainColor.clone().lerp(particleColor, blend);
      
      colors[i * 3] = blendedColor.r;
      colors[i * 3 + 1] = blendedColor.g;
      colors[i * 3 + 2] = blendedColor.b;
      
      sizes[i] = Math.random() * 3 + 1;
    }
    
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    geometry.setAttribute('size', new BufferAttribute(sizes, 1));
    
    return geometry;
  }, [type, color, emissive, complexity]);
  
  // Get element-specific material properties
  const getMaterialProps = () => {
    switch (type) {
      case "water":
        return { 
          roughness: 0.05, // More smoothness to avoid visible lines
          metalness: 0.9,  // More reflective like water
          transparent: true, 
          opacity: 0.9,
          envMapIntensity: 1.2, // Enhanced reflections
          clearcoat: 0.8, // Add clearcoat for extra smoothness
          clearcoatRoughness: 0.1,
        };
      case "air":
        return { 
          roughness: 0.6, 
          metalness: 0.2, 
          transparent: true, 
          opacity: 0.7 
        };
      case "fire":
        return { 
          roughness: 0.2, 
          metalness: 0.4, 
          emissiveIntensity: 1.0 
        };
      case "earth":
        return { 
          roughness: 0.9, 
          metalness: 0.1 
        };
      case "space":
        return { 
          roughness: 0.2, 
          metalness: 0.6, 
          transparent: true, 
          opacity: 0.8 
        };
      case "light":
        return { 
          roughness: 0.1, 
          metalness: 0.3, 
          emissiveIntensity: 1.2 
        };
      default:
        return { 
          roughness: 0.5, 
          metalness: 0.5 
        };
    }
  };
  
  // Animation loop
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    
    const time = clock.getElapsedTime();
    
    // Core orb animation
    if (coreRef.current) {
      // Type-specific animations
      if (type === "water") {
        coreRef.current.scale.x = 1 + Math.sin(time * speed * 1.1) * 0.1;
        coreRef.current.scale.y = 1 + Math.sin(time * speed * 0.9) * 0.1;
        coreRef.current.scale.z = 1 + Math.sin(time * speed * 1.0) * 0.1;
      } else if (type === "fire") {
        coreRef.current.scale.x = 1 + Math.sin(time * speed * 1.5) * 0.15;
        coreRef.current.scale.y = 1 + Math.sin(time * speed * 1.7) * 0.15;
        coreRef.current.scale.z = 1 + Math.sin(time * speed * 1.3) * 0.15;
      } else {
        const pulse = Math.sin(time * speed) * 0.08 + 1;
        coreRef.current.scale.set(pulse, pulse, pulse);
      }
      
      coreRef.current.rotation.y = time * speed * 0.3;
      coreRef.current.rotation.x = Math.sin(time * speed * 0.2) * 0.3;
    }
    
    // Particles animation
    if (particlesRef.current) {
      particlesRef.current.rotation.y = time * speed * 0.1;
      
      if (type === "fire") {
        // Make fire particles rise
        particlesRef.current.rotation.x = Math.sin(time * speed * 0.2) * 0.2;
        particlesRef.current.rotation.z = Math.sin(time * speed * 0.3) * 0.2;
      } else if (type === "air") {
        // Make air particles swirl
        particlesRef.current.rotation.z = time * speed * 0.2;
      } else if (type === "space") {
        // Make space particles rotate in galaxy-like pattern
        particlesRef.current.rotation.z = time * speed * 0.05;
        particlesRef.current.rotation.x = Math.PI / 4 + Math.sin(time * speed * 0.1) * 0.1;
      }
    }
    
    // Overall group animation
    groupRef.current.rotation.y = time * speed * 0.1;
  });
  
  const materialProps = getMaterialProps();
  
  return (
    <group ref={groupRef}>
      <mesh ref={coreRef}>
        {type === "water" ? (
          // Higher resolution geometry for water to prevent seams
          <sphereGeometry args={[1, 64, 64]} />
        ) : (
          <sphereGeometry args={[1, 32, 32]} />
        )}
        <meshStandardMaterial 
          color={color} 
          emissive={emissive} 
          {...materialProps}
        />
      </mesh>
      
      {particles && (
        <points ref={particlesRef}>
          <primitive object={particles} />
          <pointsMaterial
            size={type === "water" ? 0.03 : 0.05} // Smaller particles for water for smoother appearance
            vertexColors
            transparent
            opacity={type === "water" ? 0.6 : 0.8} // More transparency for water
            depthWrite={false}
          />
        </points>
      )}
    </group>
  );
};

export default ElementalKasina;
