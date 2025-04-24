import React from "react";

interface LogoProps {
  size?: "small" | "medium" | "large";
  showTagline?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = "medium", showTagline = true }) => {
  const sizeClasses = {
    small: "text-xl",
    medium: "text-3xl",
    large: "text-5xl",
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <h1 className={`font-bold ${sizeClasses[size]} text-white`}>KASINA</h1>
      {showTagline && (
        <p className="text-gray-400 mt-1 text-sm">A 3D Visual Meditation Tool</p>
      )}
    </div>
  );
};

export default Logo;
