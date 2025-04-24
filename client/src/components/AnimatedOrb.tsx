import React, { useEffect, useState } from "react";

interface AnimatedOrbProps {
  size?: number; // Size in pixels
  className?: string;
}

const AnimatedOrb: React.FC<AnimatedOrbProps> = ({ 
  size = 120, 
  className = ""
}) => {
  const colors = ["#FFFFFF", "#FFFF00", "#FF0000", "#0000FF"]; // White, Yellow, Red, Blue
  const [currentColorIndex, setCurrentColorIndex] = useState(0);

  useEffect(() => {
    // Change the color every 2.5 seconds
    const intervalId = setInterval(() => {
      setCurrentColorIndex((prevIndex) => (prevIndex + 1) % colors.length);
    }, 2500);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div
      className={`rounded-full animate-pulse ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: colors[currentColorIndex],
        boxShadow: `0 0 ${size / 3}px ${size / 10}px ${colors[currentColorIndex]}`,
        transition: "background-color 1s ease, box-shadow 1s ease",
      }}
    />
  );
};

export default AnimatedOrb;