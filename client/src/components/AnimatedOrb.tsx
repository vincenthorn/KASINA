import React from "react";

interface AnimatedOrbProps {
  size?: number; // Size in pixels
  className?: string;
}

const AnimatedOrb: React.FC<AnimatedOrbProps> = ({ 
  size = 120, 
  className = ""
}) => {
  // Using a pure white color for the orb
  const orbColor = "#FFFFFF";
  
  return (
    <div
      className={`rounded-full ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: orbColor,
        boxShadow: `0 0 ${size / 2}px ${size / 6}px ${orbColor}`,
        animation: "breathe-slowly 12s infinite ease-in-out", // 12-second breathing cycle
      }}
    />
  );
};

export default AnimatedOrb;