import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Simple spinning cube to test driver timeout theory
const SpinningCube = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [frameCount, setFrameCount] = useState(0);

  useFrame((state) => {
    if (meshRef.current) {
      // Continuous animation that would trigger driver timeout
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;
      
      // Update frame count every 60 frames (roughly every second)
      const currentFrame = Math.floor(state.clock.getElapsedTime() * 60);
      if (currentFrame !== frameCount) {
        setFrameCount(currentFrame);
      }
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="orange" />
    </mesh>
  );
};

// Test component to isolate driver timeout issue
export const DriverTimeoutTest: React.FC = () => {
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col">
      <div className="absolute top-4 left-4 z-10">
        <h2 className="text-xl font-bold">Driver Timeout Test</h2>
        <p>Running: {elapsed} seconds</p>
        <p className="text-sm text-gray-400">
          Simple spinning cube - no complex shaders
        </p>
      </div>
      
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50 }}
        gl={{
          antialias: false,
          powerPreference: "default",
          failIfMajorPerformanceCaveat: false,
          preserveDrawingBuffer: false,
          alpha: true,
          depth: true,
          stencil: false,
          premultipliedAlpha: false
        }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <SpinningCube />
      </Canvas>
    </div>
  );
};