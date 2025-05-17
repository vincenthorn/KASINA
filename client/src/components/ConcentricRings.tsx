import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Component that renders concentric rings for the White A Thigle kasina
const ConcentricRings: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  
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
      
      {/* Tibetan A symbol approximation using simple geometries */}
      <group position={[0, 0, 0.001]} scale={[0.15, 0.15, 0.15]}>
        {/* Vertical line of the A */}
        <mesh position={[-0.5, 0, 0]}>
          <boxGeometry args={[0.2, 1.2, 0.01]} />
          <meshBasicMaterial color="white" />
        </mesh>
        
        {/* Top horizontal line */}
        <mesh position={[0, 0.5, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[1.2, 0.2, 0.01]} />
          <meshBasicMaterial color="white" />
        </mesh>
        
        {/* Curved part approximated with angled line */}
        <mesh position={[0.2, -0.3, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[1.0, 0.2, 0.01]} />
          <meshBasicMaterial color="white" />
        </mesh>
      </group>
    </group>
  );
};

export default ConcentricRings;