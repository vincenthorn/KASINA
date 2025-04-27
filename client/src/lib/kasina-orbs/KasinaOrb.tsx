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
}

const KasinaOrb: React.FC<KasinaOrbProps> = ({
  enableZoom = false,
  type,
  color,
  speed = 0.5,
  complexity = 2,
  remainingTime = null
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
        // Add key to force remounting when type changes
        key={`kasina-orb-${type}-${Date.now()}`}
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
        />
      </Canvas>
    </div>
  );
};

export default KasinaOrb;