import React from "react";
import AnimatedOrb from "./AnimatedOrb";

interface LogoProps {
  size?: "small" | "medium" | "large";
  showTagline?: boolean;
  showOrb?: boolean;
}

const Logo: React.FC<LogoProps> = ({ 
  size = "medium", 
  showTagline = true, 
  showOrb = true 
}) => {
  const sizeClasses = {
    small: "text-xl",
    medium: "text-3xl",
    large: "text-5xl",
  };
  
  const orbSizes = {
    small: 60,
    medium: 90,
    large: 120,
  };

  return (
    <div className="flex flex-col items-center justify-center">
      {showOrb && (
        <div className="mb-4">
          <AnimatedOrb size={orbSizes[size]} />
        </div>
      )}
      <h1 className={`font-bold ${sizeClasses[size]} text-white`}>KASINA</h1>
      {showTagline && (
        <p className="text-gray-400 mt-1 text-sm">A 3D Visual Meditation Tool</p>
      )}
    </div>
  );
};

export default Logo;
