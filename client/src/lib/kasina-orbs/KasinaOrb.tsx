import React, { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { KasinaType } from "../types";
import { KASINA_BACKGROUNDS } from "../constants";
import Scene from "./Scene";

// Main KasinaOrb component
interface KasinaOrbProps {
  enableZoom?: boolean;
  type: KasinaType;
  color?: string;
  speed?: number;
  complexity?: number;
  remainingTime?: number | null;
  disableBreathing?: boolean; // Option to disable breathing animations for preview mode
}

const KasinaOrb: React.FC<KasinaOrbProps> = ({
  enableZoom = false,
  type,
  color,
  speed = 0.5,
  complexity = 2,
  remainingTime = null,
  disableBreathing = false
}) => {
  console.log("KasinaOrb rendering with type:", type, "color:", color);
  
  // Get the background color
  const bgColor = KASINA_BACKGROUNDS[type] || "#000000";
  
  // Diagnostic logging
  useEffect(() => {
    console.log("KasinaOrb component mounted with type:", type);
    return () => {
      console.log("KasinaOrb component unmounted, had type:", type);
    };
  }, [type]);

  return (
    <div 
      className="w-full h-full orb-content"
      style={{ backgroundColor: bgColor }}
    >
      <Canvas
        // Use a stable key based only on type to prevent unnecessary remounting
        key={`kasina-orb-${type}`}
        dpr={[1, 2]} // Optimize rendering for better performance
        linear // Use linear color space for more accurate colors
        frameloop="always" // Always run animation frame
      >
        <Scene
          enableZoom={enableZoom}
          remainingTime={remainingTime}
          kasinaType={type}
          color={color}
          speed={speed}
          complexity={complexity}
          disableBreathing={disableBreathing}
        />
      </Canvas>
    </div>
  );
};

export default KasinaOrb;