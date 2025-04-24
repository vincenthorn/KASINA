import React, { useEffect, useRef, useState } from "react";

interface AnimatedOrbProps {
  size?: number; // Size in pixels
  className?: string;
}

const AnimatedOrb: React.FC<AnimatedOrbProps> = ({ 
  size = 120, 
  className = ""
}) => {
  // Black & white rapid flicker animation
  const [isBlack, setIsBlack] = useState(false);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  
  // Frequency will fluctuate between 5-40 Hz
  const minFrequency = 5; // 5 Hz
  const maxFrequency = 40; // 40 Hz
  
  // Calculate interval in milliseconds based on frequency
  // f = 1/T where f is frequency and T is time period
  const getRandomFrequency = () => {
    // Get a random frequency between min and max
    const randomFreq = Math.random() * (maxFrequency - minFrequency) + minFrequency;
    // Convert frequency to milliseconds (1000 ms / frequency)
    return Math.round(1000 / randomFreq);
  };
  
  // State for current interval duration
  const [intervalDuration, setIntervalDuration] = useState(getRandomFrequency());
  
  useEffect(() => {
    // Function to toggle between black and white
    const flickerColors = () => {
      setIsBlack(prev => !prev);
      // Change the frequency randomly every few flickers
      if (Math.random() < 0.15) { // ~15% chance to change frequency on each flicker
        setIntervalDuration(getRandomFrequency());
      }
    };
    
    // Start the flicker animation
    animationRef.current = setInterval(flickerColors, intervalDuration);
    
    // Cleanup interval on component unmount
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [intervalDuration]);
  
  // Calculate the current color
  const currentColor = isBlack ? "#000000" : "#FFFFFF";
  
  return (
    <div
      className={`rounded-full ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: currentColor,
        boxShadow: `0 0 ${size / 2.5}px ${size / 8}px ${currentColor}`,
        transition: `background-color 0.02s linear, box-shadow 0.02s linear`,
        animation: "breathe 1s infinite ease-in-out",
      }}
    />
  );
};

export default AnimatedOrb;