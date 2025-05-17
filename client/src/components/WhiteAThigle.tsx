import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Standalone component to render the White A Thigle kasina
// This is completely separate from the regular kasina rendering
const WhiteAThigle: React.FC = () => {
  // Create refs for meshes so we can animate them
  const groupRef = React.useRef<THREE.Group>(null);
  
  // Animation to make the orb float and face the camera
  useFrame(({ clock, camera }) => {
    if (groupRef.current) {
      const time = clock.getElapsedTime();
      
      // Make the group always face the camera
      groupRef.current.lookAt(camera.position);
      
      // Gentle floating motion
      groupRef.current.position.y = Math.sin(time * 0.5) * 0.08;
      groupRef.current.position.x = Math.sin(time * 0.3) * 0.04;
      
      // Subtle breathing/pulsing effect
      const pulse = 1.0 + Math.sin(time * 0.4) * 0.02;
      groupRef.current.scale.set(pulse, pulse, pulse);
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Blue background */}
      <mesh position={[0, 0, -0.005]}>
        <circleGeometry args={[1.0, 64]} />
        <meshBasicMaterial color="#0055ff" />
      </mesh>
      
      {/* Yellow ring */}
      <mesh position={[0, 0, -0.004]}>
        <ringGeometry args={[0.75, 0.95, 64]} />
        <meshBasicMaterial color="#ffff00" />
      </mesh>
      
      {/* Red ring */}
      <mesh position={[0, 0, -0.003]}>
        <ringGeometry args={[0.55, 0.73, 64]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      
      {/* White ring */}
      <mesh position={[0, 0, -0.002]}>
        <ringGeometry args={[0.35, 0.53, 64]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      {/* Green ring */}
      <mesh position={[0, 0, -0.001]}>
        <ringGeometry args={[0.21, 0.33, 64]} />
        <meshBasicMaterial color="#00cc00" />
      </mesh>
      
      {/* Blue center */}
      <mesh position={[0, 0, 0]}>
        <circleGeometry args={[0.20, 64]} />
        <meshBasicMaterial color="#0055ff" />
      </mesh>
      
      {/* White letter A approximation */}
      <group position={[0, 0, 0.001]}>
        {/* Vertical line */}
        <mesh position={[-0.04, 0, 0]}>
          <boxGeometry args={[0.025, 0.14, 0.001]} />
          <meshBasicMaterial color="white" />
        </mesh>
        
        {/* Horizontal line */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.12, 0.025, 0.001]} />
          <meshBasicMaterial color="white" />
        </mesh>
        
        {/* Diagonal line */}
        <mesh position={[0.04, 0, 0]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.025, 0.14, 0.001]} />
          <meshBasicMaterial color="white" />
        </mesh>
        
        {/* Curved bottom part */}
        <mesh position={[-0.02, -0.05, 0]}>
          <circleGeometry args={[0.035, 32, Math.PI, Math.PI]} />
          <meshBasicMaterial color="white" />
        </mesh>
      </group>
    </group>
  );
};

export default WhiteAThigle;