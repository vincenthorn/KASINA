import React from "react";
import { useColor } from "../lib/contexts/ColorContext";

interface AnimatedOrbProps {
  size?: number; // Size in pixels
  className?: string;
  reducedGlow?: boolean; // Option to reduce glow size for login page
}

const AnimatedOrb: React.FC<AnimatedOrbProps> = ({ 
  size = 120, 
  className = "",
  reducedGlow = false
}) => {
  // Use the shared color context
  const { currentColor } = useColor();
  
  // Calculate glow size - reduced for login page if specified
  const glowBlur = reducedGlow ? size / 3 : size / 2;
  const glowSpread = reducedGlow ? size / 10 : size / 6;
  
  return (
    <div
      className={`rounded-full ${className} color-transition`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: currentColor,
        boxShadow: `0 0 ${glowBlur}px ${glowSpread}px ${currentColor}`,
        animation: "breathe-slowly 12s infinite ease-in-out", // 12-second breathing cycle
        transition: "background-color 3s ease-in-out, box-shadow 3s ease-in-out",
      }}
    />
  );
};

export default AnimatedOrb;