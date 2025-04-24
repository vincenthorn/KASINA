import React from "react";
import { useColor } from "../lib/contexts/ColorContext";

interface AnimatedOrbProps {
  size?: number; // Size in pixels
  className?: string;
}

const AnimatedOrb: React.FC<AnimatedOrbProps> = ({ 
  size = 120, 
  className = ""
}) => {
  // Use the shared color context
  const { currentColor } = useColor();
  
  return (
    <div
      className={`rounded-full ${className} color-transition`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: currentColor,
        boxShadow: `0 0 ${size / 2}px ${size / 6}px ${currentColor}`,
        animation: "breathe-slowly 12s infinite ease-in-out", // 12-second breathing cycle
        transition: "background-color 3s ease-in-out, box-shadow 3s ease-in-out",
      }}
    />
  );
};

export default AnimatedOrb;