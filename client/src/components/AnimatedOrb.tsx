import React, { useEffect, useState, useRef } from "react";

interface AnimatedOrbProps {
  size?: number; // Size in pixels
  className?: string;
}

const AnimatedOrb: React.FC<AnimatedOrbProps> = ({ 
  size = 120, 
  className = ""
}) => {
  // Define the color sequence: white → yellow → red → blue → white
  const colorSequence = [
    "#FFFFFF", // White
    "#FFEB3B", // Yellow
    "#F44336", // Red
    "#2196F3", // Blue
  ];
  
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Change color every 12 seconds (matching the breathing cycle)
    animationRef.current = setInterval(() => {
      setCurrentColorIndex(prevIndex => (prevIndex + 1) % colorSequence.length);
    }, 12000); // 12 seconds
    
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, []);
  
  // Current color from the sequence
  const orbColor = colorSequence[currentColorIndex];
  
  return (
    <div
      className={`rounded-full ${className} color-transition`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: orbColor,
        boxShadow: `0 0 ${size / 2}px ${size / 6}px ${orbColor}`,
        animation: "breathe-slowly 12s infinite ease-in-out", // 12-second breathing cycle
        transition: "background-color 3s ease-in-out, box-shadow 3s ease-in-out",
      }}
    />
  );
};

export default AnimatedOrb;