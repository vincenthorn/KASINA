import React, { useEffect, useRef, useState } from "react";

interface AnimatedOrbProps {
  size?: number; // Size in pixels
  className?: string;
}

const AnimatedOrb: React.FC<AnimatedOrbProps> = ({ 
  size = 120, 
  className = ""
}) => {
  // Black & white high-frequency strobbing animation
  const [isBlack, setIsBlack] = useState(false);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  
  // Higher frequency range for more calming effect (30-60 Hz)
  const minFrequency = 30; // 30 Hz
  const maxFrequency = 60; // 60 Hz
  
  // Calculate interval in milliseconds based on frequency
  // f = 1/T where f is frequency and T is time period
  const getRandomFrequency = () => {
    // Get a random frequency between min and max with a preference toward the middle range
    // for a more consistent and calming effect
    const middleFreq = (minFrequency + maxFrequency) / 2; // 45 Hz
    const variance = (maxFrequency - minFrequency) / 4; // 7.5 Hz
    
    // This creates a normal distribution around the middle frequency
    const randomOffset = (Math.random() + Math.random() + Math.random() - 1.5) * variance;
    const frequency = middleFreq + randomOffset;
    
    // Ensure we stay within boundaries
    const clampedFreq = Math.max(minFrequency, Math.min(maxFrequency, frequency));
    
    // Convert frequency to milliseconds (1000 ms / frequency)
    return Math.round(1000 / clampedFreq);
  };
  
  // State for current interval duration
  const [intervalDuration, setIntervalDuration] = useState(getRandomFrequency());
  
  useEffect(() => {
    // Function to toggle between black and white
    const strobeColors = () => {
      setIsBlack(prev => !prev);
      
      // Change the frequency more subtly and less often for a calming effect
      if (Math.random() < 0.08) { // Only 8% chance to change frequency
        setIntervalDuration(getRandomFrequency());
      }
    };
    
    // Start the strobbing animation
    animationRef.current = setInterval(strobeColors, intervalDuration);
    
    // Cleanup interval on component unmount
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [intervalDuration]);
  
  // Calculate the current color with smoother transitions
  // Using a less harsh black for a gentler effect
  const currentColor = isBlack ? "#141414" : "#F0F0F0"; 
  
  return (
    <div
      className={`rounded-full ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: currentColor,
        boxShadow: `0 0 ${size / 2.5}px ${size / 8}px ${currentColor}`,
        transition: `background-color 0.008s ease-in-out, box-shadow 0.008s ease-in-out`,
        animation: "breathe 2s infinite ease-in-out",
      }}
    />
  );
};

export default AnimatedOrb;