import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";

// Component that renders concentric rings for the White A Thigle kasina with Tibetan "A" symbol
const ConcentricRings: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Load the Tibetan A symbol texture
  const symbolTexture = useTexture("/images/vajrayana/tibetan-a-white.png");
  
  // Animation to make the object face the camera and float gently
  useFrame(({ clock, camera }) => {
    if (groupRef.current) {
      const time = clock.getElapsedTime();
      
      // Make the object face the camera
      groupRef.current.lookAt(camera.position);
      
      // Add gentle floating motion
      groupRef.current.position.y = Math.sin(time * 0.5) * 0.08;
      groupRef.current.position.x = Math.sin(time * 0.3) * 0.04;
      
      // Add subtle pulsing effect for breathing appearance
      const pulse = 1.0 + Math.sin(time * 0.4) * 0.02;
      groupRef.current.scale.set(pulse, pulse, pulse);
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Blue background disc - using a brighter royal blue */}
      <mesh position={[0, 0, -0.005]}>
        <circleGeometry args={[1.3, 64]} />
        <meshBasicMaterial color="#0055ff" />
      </mesh>
      
      {/* Yellow ring (outermost) */}
      <mesh position={[0, 0, -0.004]}>
        <circleGeometry args={[1.2, 64]} />
        <meshBasicMaterial color="#ffff00" />
      </mesh>
      
      {/* Red ring */}
      <mesh position={[0, 0, -0.003]}>
        <circleGeometry args={[0.95, 64]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      
      {/* White ring */}
      <mesh position={[0, 0, -0.002]}>
        <circleGeometry args={[0.7, 64]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      {/* Green ring */}
      <mesh position={[0, 0, -0.001]}>
        <circleGeometry args={[0.5, 64]} />
        <meshBasicMaterial color="#00cc00" />
      </mesh>
      
      {/* Blue center */}
      <mesh position={[0, 0, 0]}>
        <circleGeometry args={[0.3, 64]} />
        <meshBasicMaterial color="#0055ff" />
      </mesh>
      
      {/* Tibetan A symbol overlay */}
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[0.28, 0.28]} />
        <meshBasicMaterial 
          map={symbolTexture} 
          transparent={true} 
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

export default ConcentricRings;