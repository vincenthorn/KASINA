import React, { useEffect, useRef, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { KasinaType } from "../types";
import { KASINA_BACKGROUNDS } from "../constants";
import DynamicOrb from "./DynamicOrb";

interface SceneProps {
  enableZoom?: boolean;
  remainingTime?: number | null;
  kasinaType: KasinaType;
  color?: string;
  speed?: number;
  complexity?: number;
}

const Scene: React.FC<SceneProps> = ({
  enableZoom = false,
  remainingTime = null,
  kasinaType,
  color,
  speed = 0.5,
  complexity = 2
}) => {
  const { gl } = useThree();
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const [cameraLight, setCameraLight] = useState(new THREE.Vector3(0, 0, 5));
  
  console.log("Scene rendering with type:", kasinaType);
  
  // Set the background color based on the kasina type
  useEffect(() => {
    const bgColor = KASINA_BACKGROUNDS[kasinaType] || "#000000";
    gl.setClearColor(new THREE.Color(bgColor), 1);
    
    console.log(`Setting background color to ${bgColor} for ${kasinaType}`);
    
    // Debug logging for scene mount
    console.log("Scene component mounted with type:", kasinaType);
    
    return () => {
      console.log("Scene component unmounted, had type:", kasinaType);
      
      // Cleanup WebGL resources
      try {
        gl.renderLists.dispose();
        gl.info.reset();
      } catch (err) {
        console.error("Error cleaning up WebGL resources", err);
      }
    };
  }, [gl, kasinaType]);

  // Set initial camera position
  useEffect(() => {
    if (enableZoom && cameraRef.current) {
      cameraRef.current.position.z = 4;
    }
  }, [enableZoom]);

  // Update light position to follow camera and handle remaining time
  useFrame(() => {
    if (cameraRef.current) {
      setCameraLight(cameraRef.current.position.clone());
      
      // Log remaining time changes during the final minute to help debug issues
      if (remainingTime !== null && remainingTime <= 60 && remainingTime % 5 === 0) {
        console.log(`Scene - Remaining time update: ${remainingTime}s`);
      }
    }
  });

  return (
    <>
      <PerspectiveCamera 
        makeDefault 
        position={[0, 0, 3]} 
        fov={50} 
        ref={cameraRef} 
      />
      
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      <pointLight position={cameraLight} intensity={0.8} distance={10} />
      
      <DynamicOrb
        remainingTime={remainingTime}
        kasinaType={kasinaType}
        color={color}
        speed={speed}
        complexity={complexity}
      />
      
      <OrbitControls
        enableZoom={enableZoom}
        enablePan={false}
        rotateSpeed={0.5}
        minDistance={0.05}
        maxDistance={20}
        zoomSpeed={0.08}
      />
    </>
  );
};

export default Scene;