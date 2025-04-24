import React, { useEffect, useState, useRef } from "react";

interface AnimatedOrbProps {
  size?: number; // Size in pixels
  className?: string;
}

const AnimatedOrb: React.FC<AnimatedOrbProps> = ({ 
  size = 120, 
  className = ""
}) => {
  // Blue spectrum colors - from deep blue to light blue
  const blueSpectrumColors = [
    "#0D47A1", // Deep Blue
    "#1565C0", // Dark Blue
    "#1976D2", // Medium Blue
    "#1E88E5", // Bright Medium Blue
    "#2196F3", // Primary Blue
    "#42A5F5", // Light Blue
    "#64B5F6", // Lighter Blue
    "#90CAF9", // Very Light Blue
    "#64B5F6", // Lighter Blue (back down)
    "#42A5F5", // Light Blue
    "#2196F3", // Primary Blue
    "#1E88E5", // Bright Medium Blue
    "#1976D2", // Medium Blue
    "#1565C0", // Dark Blue
  ];
  
  // For smooth transition, we'll use CSS animation instead of state changes
  const [currentPosition, setCurrentPosition] = useState(0);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  
  // The time for a full cycle (10-30 seconds, we'll use 20)
  const cycleDuration = 20000; // 20 seconds
  const stepDuration = cycleDuration / blueSpectrumColors.length;
  
  useEffect(() => {
    // Function to smoothly transition through the color spectrum
    const animateColors = () => {
      setCurrentPosition(prev => (prev + 1) % blueSpectrumColors.length);
    };
    
    // Start the animation
    animationRef.current = setInterval(animateColors, stepDuration);
    
    // Cleanup interval on component unmount
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [stepDuration]);
  
  // Calculate the main color and next color for gradient effect
  const mainColor = blueSpectrumColors[currentPosition];
  
  return (
    <div
      className={`rounded-full ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: mainColor,
        boxShadow: `0 0 ${size / 2.5}px ${size / 8}px ${mainColor}`,
        transition: "background-color 1.5s ease-in-out, box-shadow 1.5s ease-in-out",
        animation: "breathe 4s infinite ease-in-out",
      }}
    />
  );
};

export default AnimatedOrb;